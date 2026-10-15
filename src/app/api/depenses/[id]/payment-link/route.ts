import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { initierPayoutDepense } from '@/lib/depenses';

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

    const { payout, depense } = await initierPayoutDepense(params.id);

    await prisma.logAudit.create({
      data: {
        userId: (session.user as any)?.id,
        action: 'PAIEMENT_DEPENSE_INITIE',
        cible: `Dépense ${depense.id}`,
        details: `Payout ${payout.reference} de ${depense.montant} FCFA${payout.fees ? ` - frais: ${payout.fees} FCFA` : ''}`,
      },
    });

    return NextResponse.json({
      reference: depense.referencePaiement,
      statutPaiement: depense.statutPaiement,
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
