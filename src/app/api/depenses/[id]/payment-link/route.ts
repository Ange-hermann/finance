import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPaymentProvider, PAYOUT_PROVIDER_PAR_MODE } from '@/lib/payment';
import { marquerDepensePayee } from '@/lib/depenses';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'TREASURER' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const depense = await prisma.depense.findUnique({
      where: { id: params.id },
      include: { beneficiaire: true },
    });

    if (!depense) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 });
    }

    if (depense.modePaiement !== 'GENIUS_PAY') {
      return NextResponse.json({ error: 'Cette dépense n\'utilise pas Genius Pay' }, { status: 400 });
    }

    if (depense.statut !== 'VALIDE') {
      return NextResponse.json({ error: 'La dépense doit être validée avant le paiement' }, { status: 400 });
    }

    if (depense.statutPaiement === 'PAYE') {
      return NextResponse.json({ error: 'Dépense déjà payée' }, { status: 400 });
    }

    if (depense.statutPaiement === 'EN_COURS') {
      return NextResponse.json({ error: 'Un paiement est déjà en cours pour cette dépense' }, { status: 400 });
    }

    if (!depense.beneficiaire) {
      return NextResponse.json({ error: 'Bénéficiaire manquant' }, { status: 400 });
    }

    const provider = PAYOUT_PROVIDER_PAR_MODE[depense.beneficiaire.modePaiement];
    if (!provider) {
      return NextResponse.json(
        { error: `Le mode ${depense.beneficiaire.modePaiement} n'est pas payable en ligne — utilisez un paiement manuel` },
        { status: 400 }
      );
    }

    const paymentProvider = getPaymentProvider();
    if (!paymentProvider.createPayout) {
      return NextResponse.json(
        { error: 'Le provider de paiement configuré ne supporte pas les versements sortants' },
        { status: 400 }
      );
    }

    // Paiement sortant : l'argent quitte le wallet marchand vers le
    // mobile money du bénéficiaire (et non l'inverse)
    const payout = await paymentProvider.createPayout(
      Number(depense.montant),
      `Paiement dépense ${depense.id} - ${depense.description}`,
      {
        nom: depense.beneficiaire.nom,
        telephone: depense.beneficiaire.telephone,
        email: depense.beneficiaire.email || undefined,
        provider,
      },
      {
        type: 'expense',
        depenseId: depense.id,
        reference: depense.referencePaiement,
      }
    );

    // On mémorise la référence du payout pour le suivi webhook
    const updatedDepense = await prisma.depense.update({
      where: { id: params.id },
      data: {
        referencePaiement: payout.reference,
        statutPaiement: payout.status === 'completed' ? 'PAYE' : payout.status === 'failed' ? 'ECHOUE' : 'EN_COURS',
      },
    });

    // Certains providers (mock) terminent immédiatement
    if (updatedDepense.statutPaiement === 'PAYE') {
      await marquerDepensePayee(depense);
    }

    await prisma.logAudit.create({
      data: {
        userId: (session.user as any)?.id,
        action: 'PAIEMENT_DEPENSE_INITIE',
        cible: `Dépense ${depense.id}`,
        details: `Payout ${payout.reference} de ${depense.montant} FCFA vers ${depense.beneficiaire.nom} (${provider})`,
      },
    });

    return NextResponse.json({
      reference: updatedDepense.referencePaiement,
      statutPaiement: updatedDepense.statutPaiement,
      fees: payout.fees,
    });
  } catch (error) {
    console.error('Erreur initiation payout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 400 }
    );
  }
}
