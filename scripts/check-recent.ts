import { prisma } from "../src/lib/prisma";

async function main() {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { contributeur: true, repartition: true },
  });
  for (const t of txs) {
    console.log(
      `${t.createdAt.toISOString()} | ${t.statut} | ${t.montant} FCFA | ${t.categorie} | ${t.mode} | ref=${t.referencePaiement} | repart=${t.repartition ? "OUI" : "non"} | ${t.contributeur?.nom || "-"}`
    );
  }
  const caisse = await prisma.caisse.findFirst();
  console.log("Caisse:", caisse?.soldeActuel);
  const count = await prisma.transaction.count();
  console.log("Total transactions:", count);
  await prisma.$disconnect();
}
main().catch(console.error);
