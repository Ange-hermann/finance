// Réconcilie les transactions EN_ATTENTE avec le statut réel chez Genius Pay.
// Usage : npx tsx scripts/reconciliate-paiements.ts
import { prisma } from "../src/lib/prisma";
import { finaliserPaiementEnLigne } from "../src/lib/paiements";

const API_KEY = process.env.GENIUSPAY_API_KEY || "";
const API_SECRET = process.env.GENIUSPAY_API_SECRET || "";

async function main() {
  const enAttente = await prisma.transaction.findMany({
    where: {
      statut: "EN_ATTENTE",
      mode: "EN_LIGNE",
      referencePaiement: { not: null },
    },
  });

  console.log(`${enAttente.length} transaction(s) en attente trouvée(s)`);

  for (const tx of enAttente) {
    const ref = tx.referencePaiement!;
    try {
      const res = await fetch(`https://geniuspay.ci/api/v1/merchant/payments/${ref}`, {
        headers: { "X-API-Key": API_KEY, "X-API-Secret": API_SECRET },
      });
      const data = await res.json();
      const status = (data.data || data).status;
      console.log(`${ref} (${tx.montant} FCFA, ${tx.categorie}) → ${status || "inconnu"}`);

      if (status === "completed" || status === "success") {
        await finaliserPaiementEnLigne(
          { id: tx.id, montant: Number(tx.montant), categorie: tx.categorie, statut: tx.statut },
          Number((data.data || data).amount || tx.montant)
        );
        console.log(`  ✓ Validée + répartition appliquée`);
      } else if (["failed", "cancelled", "expired"].includes(status)) {
        await prisma.transaction.update({ where: { id: tx.id }, data: { statut: "ANNULE" } });
        console.log(`  ✗ Annulée`);
      }
    } catch (e) {
      console.log(`  ! Erreur pour ${ref}:`, e instanceof Error ? e.message : e);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
