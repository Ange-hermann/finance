import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { calculerRepartition } from "@/lib/finance";
import { CategorieTransaction } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { montant, categorie, lienId, contributeurNom, contributeurTelephone, contributeurEmail } = body;

    if (!montant || montant <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (!categorie) {
      return NextResponse.json({ error: "Catégorie requise" }, { status: 400 });
    }

    const provider = getPaymentProvider();
    const session = await provider.createPaymentSession(montant, categorie, {
      lienId,
      contributeurNom,
      contributeurTelephone,
      contributeurEmail,
    });

    if (process.env.PAYMENT_PROVIDER === "mock" || !process.env.PAYMENT_PROVIDER) {
      let contributeurId: string | null = null;
      if (contributeurNom || contributeurTelephone || contributeurEmail) {
        const contributeur = await prisma.contributeur.create({
          data: {
            nom: contributeurNom || null,
            telephone: contributeurTelephone || null,
            email: contributeurEmail || null,
          },
        });
        contributeurId = contributeur.id;
      }

      const transaction = await prisma.transaction.create({
        data: {
          montant: parseFloat(montant),
          categorie: categorie as CategorieTransaction,
          mode: "EN_LIGNE",
          contributeurId,
          statut: "VALIDE",
          referencePaiement: session.sessionId,
          lienId: lienId || null,
        },
      });

      const repartition = calculerRepartition(parseFloat(montant), categorie as CategorieTransaction);
      await prisma.repartition.create({
        data: {
          transactionId: transaction.id,
          montantEconomie: repartition.montantEconomie,
          montantEpargne: repartition.montantEpargne,
          montantActionSociale: repartition.montantActionSociale,
          montantDimeDeLaDime: repartition.montantDimeDeLaDime,
          montantCaisse: repartition.montantCaisse,
          montantFondsDedie: repartition.montantFondsDedie,
        },
      });

      const caisse = await prisma.caisse.findFirst();
      if (caisse) {
        await prisma.caisse.update({
          where: { id: caisse.id },
          data: { soldeActuel: { increment: parseFloat(montant) } },
        });
      } else {
        await prisma.caisse.create({
          data: { soldeActuel: parseFloat(montant) },
        });
      }

      const recu = await prisma.recu.create({
        data: { transactionId: transaction.id },
      });

      await prisma.logAudit.create({
        data: {
          action: "PAIEMENT_EN_LIGNE",
          cible: `Transaction ${transaction.id}`,
          details: `Paiement en ligne de ${montant} FCFA pour ${categorie}`,
        },
      });

      return NextResponse.json({
        statut: "PAYE",
        transactionId: transaction.id,
        recuUrl: `/api/recu/${recu.id}`,
      });
    }

    return NextResponse.json({ url: session.url, sessionId: session.sessionId });
  } catch (error) {
    console.error("Erreur init paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation du paiement" },
      { status: 500 }
    );
  }
}
