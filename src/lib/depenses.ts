import { prisma } from "@/lib/prisma";
import { SourceFonds } from "@/generated/prisma/client";

export interface DepenseLike {
  id: string;
  type: string;
  sourceFonds: string;
  montant: unknown;
  transactionId: string | null;
  modePaiement: string;
  statutPaiement: string | null;
  statut: string;
}

// Une dépense validée pèse sur le solde théorique de son fonds source,
// sauf les dépenses culte liées à une transaction (déjà déduites via le
// recalcul de la répartition de l'offrande).
export function depenseImputableAuSolde(depense: {
  type: string;
  transactionId?: string | null;
}): boolean {
  return (
    depense.type === "DEPENSE_NORMALE" ||
    (depense.type === "DEPENSE_CULTE" && !depense.transactionId)
  );
}

// Sortie d'espèces immédiate : dépense manuelle sur le fonds CAISSE.
// Les dépenses GENIUS_PAY sont débitées par le webhook à la confirmation
// du paiement (statutPaiement -> PAYE).
export function debiteCaissePhysique(depense: DepenseLike): boolean {
  return (
    depense.sourceFonds === "CAISSE" &&
    depense.modePaiement === "MANUEL" &&
    depenseImputableAuSolde(depense)
  );
}

// Remboursement en espèces lors de l'annulation d'une dépense validée :
// MANUEL sur CAISSE (débité à la validation) ou GENIUS_PAY sur CAISSE
// déjà payé (débité par le webhook). Un lien Genius Pay non payé n'a
// jamais débité la caisse.
export function rembourseCaissePhysique(depense: DepenseLike): boolean {
  if (depense.sourceFonds !== "CAISSE" || !depenseImputableAuSolde(depense)) {
    return false;
  }
  return depense.modePaiement === "MANUEL" || depense.statutPaiement === "PAYE";
}

export async function getSoldesFonds(): Promise<Record<SourceFonds, number>> {
  const [repartitions, depenses] = await Promise.all([
    prisma.repartition.findMany({
      where: { transaction: { statut: "VALIDE" } },
    }),
    prisma.depense.findMany({
      where: {
        statut: "VALIDE",
        OR: [
          { type: "DEPENSE_NORMALE" },
          { type: "DEPENSE_CULTE", transactionId: null },
        ],
      },
    }),
  ]);

  const soldes: Record<SourceFonds, number> = {
    CAISSE: repartitions.reduce((s, r) => s + Number(r.montantCaisse), 0),
    ECONOMIE: repartitions.reduce((s, r) => s + Number(r.montantEconomie), 0),
    EPARGNE: repartitions.reduce((s, r) => s + Number(r.montantEpargne), 0),
    CONSTRUCTION: repartitions.reduce((s, r) => s + Number(r.montantFondsDedie), 0),
    ACTION_SOCIALE: repartitions.reduce((s, r) => s + Number(r.montantActionSociale), 0),
  };

  for (const d of depenses) {
    soldes[d.sourceFonds] -= Number(d.montant);
  }

  return soldes;
}

export async function getSoldeFonds(source: SourceFonds): Promise<number> {
  const soldes = await getSoldesFonds();
  return soldes[source] ?? 0;
}

// Recalcule la répartition d'une transaction sur le montant net
// (offrande - dépenses culte validées) et ajuste la caisse physique.
export async function recalculerRepartitionCulte(transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      depenses: { where: { type: "DEPENSE_CULTE", statut: "VALIDE" } },
      repartition: true,
    },
  });

  if (!transaction?.repartition || transaction.statut !== "VALIDE") return;

  const totalDepenses = transaction.depenses.reduce(
    (sum, d) => sum + Number(d.montant),
    0
  );
  const montantNet = Math.max(0, Number(transaction.montant) - totalDepenses);

  const { calculerRepartition } = await import("@/lib/finance");
  const newRepartition = calculerRepartition(
    montantNet,
    transaction.categorie as any
  );

  const ancienCaisse = Number(transaction.repartition.montantCaisse);

  await prisma.repartition.update({
    where: { transactionId: transaction.id },
    data: {
      montantEconomie: newRepartition.montantEconomie,
      montantEpargne: newRepartition.montantEpargne,
      montantActionSociale: newRepartition.montantActionSociale,
      montantDimeDeLaDime: newRepartition.montantDimeDeLaDime,
      montantCaisse: newRepartition.montantCaisse,
      montantFondsDedie: newRepartition.montantFondsDedie,
    },
  });

  const diffCaisse = newRepartition.montantCaisse - ancienCaisse;
  if (diffCaisse !== 0) {
    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { increment: diffCaisse } },
      });
    }
  }
}

// Effets comptables d'une dépense qui passe à VALIDE :
// débit de la caisse physique si sortie d'espèces, recalcul de la
// répartition si dépense culte liée à une transaction.
export async function appliquerEffetsDepense(depense: DepenseLike) {
  if (debiteCaissePhysique(depense)) {
    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { decrement: Number(depense.montant) } },
      });
    }
  }

  if (depense.type === "DEPENSE_CULTE" && depense.transactionId) {
    await recalculerRepartitionCulte(depense.transactionId);
  }
}

// Marque le paiement sortant d'une dépense comme effectué : passe
// statutPaiement à PAYE et débite la caisse physique si le fonds source
// est CAISSE (les autres fonds sont des fonds par répartition).
export async function marquerDepensePayee(depense: DepenseLike) {
  if (depense.statutPaiement === "PAYE") return;

  await prisma.depense.update({
    where: { id: depense.id },
    data: { statutPaiement: "PAYE", datePaiement: new Date() },
  });

  if (depense.sourceFonds === "CAISSE" && depenseImputableAuSolde(depense)) {
    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { decrement: Number(depense.montant) } },
      });
    }
  }
}

// Valide une dépense EN_ATTENTE : vérifie le solde du fonds source puis
// applique les effets comptables. Retourne { error } si le solde est
// insuffisant (la dépense reste EN_ATTENTE).
export async function validerDepense(
  depense: DepenseLike
): Promise<{ error?: string }> {
  if (depense.statut === "VALIDE") return {};

  if (depenseImputableAuSolde(depense)) {
    const solde = await getSoldeFonds(depense.sourceFonds as SourceFonds);
    if (solde < Number(depense.montant)) {
      return {
        error: `Solde insuffisant dans ${depense.sourceFonds}. Disponible: ${solde.toLocaleString("fr-FR")} FCFA`,
      };
    }
  }

  await prisma.depense.update({
    where: { id: depense.id },
    data: { statut: "VALIDE" },
  });

  await appliquerEffetsDepense(depense);
  return {};
}

// Annule une dépense : rembourse la caisse physique si elle avait été
// débitée, et recalcule la répartition pour les dépenses culte liées.
export async function annulerDepense(depense: DepenseLike & { referencePaiement?: string | null }) {
  if (depense.statut === "ANNULE") return;

  const etaitValide = depense.statut === "VALIDE";

  // Si un versement Genius Pay est en cours, tenter de l'annuler côté provider
  if (
    depense.modePaiement === "GENIUS_PAY" &&
    depense.statutPaiement === "EN_COURS" &&
    depense.referencePaiement
  ) {
    try {
      const { getPaymentProvider } = await import("@/lib/payment");
      const provider = getPaymentProvider();
      await provider.cancelPayout?.(depense.referencePaiement, "Dépense annulée");
    } catch (error) {
      console.error("Erreur annulation payout:", error);
    }
  }

  await prisma.depense.update({
    where: { id: depense.id },
    data: { statut: "ANNULE" },
  });

  if (!etaitValide) return;

  if (rembourseCaissePhysique(depense)) {
    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { increment: Number(depense.montant) } },
      });
    }
  }

  if (depense.type === "DEPENSE_CULTE" && depense.transactionId) {
    await recalculerRepartitionCulte(depense.transactionId);
  }
}
