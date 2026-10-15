import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finaliserPaiementEnLigne, getFraisPaiement } from "@/lib/paiements";

// Filet de sécurité : après redirection vers /payment/success, la page
// appelle cette route avec la référence Genius Pay pour vérifier
// directement le statut auprès de l'API — indépendamment du webhook.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference =
      searchParams.get("reference") ||
      searchParams.get("payment_ref") ||
      searchParams.get("transaction") ||
      searchParams.get("session_id") ||
      searchParams.get("ref");

    if (!reference) {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    const response = await fetch(
      `https://geniuspay.ci/api/v1/merchant/payments/${encodeURIComponent(reference)}`,
      {
        headers: {
          "X-API-Key": process.env.GENIUSPAY_API_KEY || "",
          "X-API-Secret": process.env.GENIUSPAY_API_SECRET || "",
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Paiement introuvable" }, { status: 404 });
    }

    const payment = data.data || data;
    const status = payment.status;

    if (status !== "completed" && status !== "success") {
      return NextResponse.json({ statut: status || "EN_ATTENTE" });
    }

    // Paiement confirmé côté Genius Pay : retrouver et finaliser la transaction
    const transaction = await prisma.transaction.findFirst({
      where: { referencePaiement: reference },
    });

    if (transaction) {
      // Frais : depuis la réponse, sinon via l'API (autre nom de champ)
      const fraisReels = Number(payment.fees ?? payment.fee ?? payment.commission) || (await getFraisPaiement(reference));
      await finaliserPaiementEnLigne(
        { ...transaction, montant: Number(transaction.montant) },
        Number(payment.amount || transaction.montant),
        { frais: fraisReels, reference }
      );
    } else {
      console.warn(`Verify: aucune transaction pour la référence ${reference}`);
    }

    return NextResponse.json({ statut: "PAYE", transactionId: transaction?.id });
  } catch (error) {
    console.error("Erreur verify paiement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
