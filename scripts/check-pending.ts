import { prisma } from "../src/lib/prisma";

async function main() {
  const txs = await prisma.transaction.findMany({
    where: { statut: "EN_ATTENTE" },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { contributeur: true },
  });
  for (const t of txs) {
    console.log(
      `${t.id} | ${t.montant} | ${t.categorie} | ${t.mode} | ref=${t.referencePaiement} | ${t.createdAt.toISOString()} | contrib=${t.contributeur?.nom || "-"}`
    );
  }
  await prisma.$disconnect();
}
main().catch(console.error);
