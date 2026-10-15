import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { calculerRepartition } from "@/lib/finance";
import { CategorieTransaction } from "@/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, categorie, description, customerName, customerEmail, customerPhone } = body;

    // Créer un contributeur si des informations sont fournies
    let contributeurId: string | null = null;
    if (customerName || customerEmail || customerPhone) {
      const contributeur = await prisma.contributeur.create({
        data: {
          nom: customerName || null,
          email: customerEmail || null,
          telephone: customerPhone || null,
        },
      });
      contributeurId = contributeur.id;
    }

    // Créer une transaction en attente
    const transaction = await prisma.transaction.create({
      data: {
        montant: amount,
        categorie: categorie as CategorieTransaction,
        mode: "EN_LIGNE",
        statut: "EN_ATTENTE",
        contributeurId,
      },
    });

    const provider = getPaymentProvider();
    const session = await provider.createPaymentSession(
      amount,
      description || "Paiement CTF Finance",
      {
        customerName,
        customerEmail,
        customerPhone,
      }
    );

    // Associer la référence de paiement pour que le webhook retrouve la transaction
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { referencePaiement: session.sessionId },
    });

    return NextResponse.json({
      success: true,
      payment_url: session.paymentUrl,
      checkout_url: session.paymentUrl,
      url: session.paymentUrl,
      reference: session.id,
      amount: session.amount,
      currency: session.currency,
      transactionId: transaction.id,
    });

  } catch (error) {
    console.error("Erreur lors de la création du lien de paiement:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du lien de paiement" },
      { status: 400 }
    );
  }
}