// Remet la répartition existante au nouveau barème : 10% part pasteur,
// caisse 60% (au lieu de 70%).
import { prisma } from "../src/lib/prisma";
import { calculerRepartition } from "../src/lib/finance";

async function main() {
  const repartitions = await prisma.repartition.findMany({
    where: { montantDimeDeLaDime: null, transaction: { categorie: { notIn: ["DIME", "CONSTRUCTION"] } } },
    include: { transaction: true },
  });

  for (const r of repartitions) {
    const montant = Number(r.transaction.montant);
    const nouveau = calculerRepartition(montant, r.transaction.categorie as any);
    const diffCaisse = nouveau.montantCaisse - Number(r.montantCaisse);

    await prisma.repartition.update({
      where: { transactionId: r.transactionId },
      data: {
        montantCaisse: nouveau.montantCaisse,
        montantEconomie: nouveau.montantEconomie,
        montantEpargne: nouveau.montantEpargne,
        montantActionSociale: nouveau.montantActionSociale,
        montantDimeDeLaDime: nouveau.montantDimeDeLaDime,
        montantFondsDedie: nouveau.montantFondsDedie,
      },
    });

    if (diffCaisse !== 0) {
      const caisse = await prisma.caisse.findFirst();
      if (caisse) {
        await prisma.caisse.update({
          where: { id: caisse.id },
          data: { soldeActuel: { increment: diffCaisse } },
        });
      }
    }

    console.log(`${r.transactionId} (${montant} FCFA ${r.transaction.categorie}) : caisse ${r.montantCaisse} -> ${nouveau.montantCaisse}, pasteur ${nouveau.montantDimeDeLaDime}`);
  }

  const caisse = await prisma.caisse.findFirst();
  console.log("Caisse finale:", caisse?.soldeActuel);
  await prisma.$disconnect();
}
main().catch(console.error);
