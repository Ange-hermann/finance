import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { CategorieTransaction } from "@/generated/prisma";
import { finaliserPaiementEnLigne, getFraisPaiement } from "@/lib/paiements";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = getPaymentProvider();
    const verification = await provider.handleWebhook(body);

    if (verification.statut === "PAYE") {
      const tokenPay = body.tokenPay || body.sessionId || "";
      const reference = verification.reference || tokenPay;

      // Chercher la transaction en attente par référence de paiement
      const existingTransaction = await prisma.transaction.findFirst({
        where: { referencePaiement: tokenPay },
      });

      const frais = await getFraisPaiement(reference);

      if (existingTransaction) {
        // Valider la transaction existante via le flux commun
        // (répartition + frais + reçu + notification — idempotent)
        await finaliserPaiementEnLigne(
          { ...existingTransaction, montant: Number(existingTransaction.montant) },
          Number(existingTransaction.montant),
          { frais, reference }
        );
      } else {
        // Fallback : créer la transaction si elle n'existe pas (compatibilité mock)
        const { montant, categorie, contributeurNom, contributeurTelephone, contributeurEmail, lienId } = body;

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
            statut: "EN_ATTENTE",
            referencePaiement: reference,
            lienId: lienId || null,
          },
        });

        await finaliserPaiementEnLigne(
          { ...transaction, montant: Number(transaction.montant) },
          parseFloat(montant),
          { frais, reference }
        );
      }
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
