import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const frais = await prisma.depense.findMany({
    where: { description: { contains: "Frais Genius", mode: "insensitive" } },
    select: { id: true, montant: true, description: true, dateDepense: true, statut: true, transactionId: true },
    orderBy: { dateDepense: "desc" },
  });
  console.log("=== DEPENSES FRAIS GENIUS PAY ===");
  console.log(JSON.stringify(frais, null, 2));

  const tx = await prisma.transaction.findMany({
    where: { mode: "EN_LIGNE", statut: "VALIDE" },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, montant: true, categorie: true, createdAt: true, referencePaiement: true },
  });
  console.log("=== TX EN LIGNE VALIDEES ===");
  console.log(JSON.stringify(tx, null, 2));
}

main().finally(() => prisma.$disconnect());
