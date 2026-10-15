import { prisma } from "@/lib/prisma";
import { calculerRepartition } from "@/lib/finance";
import { sendPushNotificationToRole } from "@/lib/notifications";

type TransactionLike = {
  id: string;
  montant: number;
  categorie: string;
};

// Finalise un paiement EN LIGNE confirmé par le provider : valide la
// transaction, applique la répartition dans les fonds (économie, épargne,
// action sociale, dîme de la dîme, fonds dédié) et crédite la caisse
// physique de la part qui lui revient.
// Idempotent : ne fait rien si la transaction est déjà VALIDEE.
export async function finaliserPaiementEnLigne(
  transaction: TransactionLike & { statut: string },
  montant: number
) {
  if (transaction.statut !== "EN_ATTENTE") return;

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { statut: "VALIDE" },
  });

  const categorie = transaction.categorie;

  // Répartition automatique SAUF pour les dîmes (gérées par le pasteur)
  if (categorie !== "DIME") {
    const repartition = calculerRepartition(montant, categorie as any);

    await prisma.repartition.create({
      data: {
        transactionId: transaction.id,
        montantCaisse: repartition.montantCaisse,
        montantEconomie: repartition.montantEconomie,
        montantEpargne: repartition.montantEpargne,
        montantActionSociale: repartition.montantActionSociale,
        montantDimeDeLaDime: repartition.montantDimeDeLaDime,
        montantFondsDedie: repartition.montantFondsDedie,
      },
    });

    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { increment: repartition.montantCaisse } },
      });
    } else {
      await prisma.caisse.create({
        data: { soldeActuel: repartition.montantCaisse },
      });
    }
  }

  await prisma.recu.create({
    data: { transactionId: transaction.id },
  });

  await prisma.logAudit.create({
    data: {
      action: "PAIEMENT_EN_LIGNE",
      cible: `Transaction ${transaction.id}`,
      details: `Paiement en ligne de ${montant} FCFA pour ${categorie}`,
    },
  });

  try {
    await sendPushNotificationToRole(
      "PASTOR",
      {
        title: `Nouveau paiement: ${categorie}`,
        body: `${montant} FCFA`,
        data: { transactionId: transaction.id },
      },
      prisma
    );
  } catch (error) {
    console.error("Erreur envoi notification:", error);
  }
}

// Devine la catégorie d'une transaction depuis la description (fallback
// pour les paiements dont la transaction n'a pas été retrouvée)
export function devinerCategorieDepuisDescription(description?: string | null): string {
  const d = (description || "").toLowerCase();
  if (d.includes("dîme") || d.includes("dime")) return "DIME";
  if (d.includes("construction")) return "CONSTRUCTION";
  if (d.includes("don")) return "DON_SPECIAL";
  if (d.includes("projet")) return "PROJET";
  if (d.includes("autre")) return "AUTRE";
  return "OFFRANDE";
}
