import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { calculerRepartition } from "@/lib/finance";
import { CategorieTransaction } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = getPaymentProvider();
    const verification = await provider.handleWebhook(body);

    if (verification.statut === "PAYE") {
      const { sessionId, montant, categorie, contributeurNom, contributeurTelephone, contributeurEmail, lienId } = body;

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
          referencePaiement: verification.reference || sessionId,
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
          data: {
            soldeActuel: { increment: parseFloat(montant) },
          },
        });
      } else {
        await prisma.caisse.create({
          data: { soldeActuel: parseFloat(montant) },
        });
      }

      await prisma.recu.create({
        data: {
          transactionId: transaction.id,
        },
      });

      await prisma.logAudit.create({
        data: {
          action: "PAIEMENT_EN_LIGNE",
          cible: `Transaction ${transaction.id}`,
          details: `Paiement en ligne de ${montant} pour ${categorie}`,
        },
      });
    }

    return NextResponse.json({ received: true, statut: verification.statut });
  } catch (error) {
    console.error("Webhook erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook" },
      { status: 500 }
    );
  }
}
