import { prisma } from "../src/lib/prisma";

async function main() {
  const repartitions = await prisma.repartition.findMany();
  for (const r of repartitions) {
    console.log(
      `Repartition ${r.transactionId}: caisse=${r.montantCaisse} eco=${r.montantEconomie} epargne=${r.montantEpargne} action=${r.montantActionSociale} dime2=${r.montantDimeDeLaDime} fondsDedie=${r.montantFondsDedie}`
    );
  }
  const totalCaisse = repartitions.reduce((s, r) => s + Number(r.montantCaisse), 0);

  let caisse = await prisma.caisse.findFirst();
  if (!caisse) {
    caisse = await prisma.caisse.create({ data: { soldeActuel: totalCaisse } });
    console.log(`Caisse créée avec solde = ${totalCaisse}`);
  } else {
    console.log(`Caisse existante: ${caisse.soldeActuel}`);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
