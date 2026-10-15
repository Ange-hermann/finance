import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TYPE "SourceFonds" ADD VALUE IF NOT EXISTS 'PASTEUR'`);
  console.log("Enum SourceFonds: PASTEUR ajouté");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
