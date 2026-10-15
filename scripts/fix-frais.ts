// Crée la dépense de frais rétroactive pour le paiement MTX-LLKTHJHRXX
// (200 FCFA brut, 105 FCFA de frais, 95 net) — équilibre la caisse.
import { prisma } from "../src/lib/prisma";

async function main() {
  const existing = await prisma.depense.findFirst({
    where: { description: { contains: "MTX-LLKTHJHRXX" } },
  });
  if (existing) {
    console.log("Dépense de frais déjà existante:", existing.id);
    await prisma.$disconnect();
    return;
  }

  const depense = await prisma.depense.create({
    data: {
      type: "DEPENSE_NORMALE",
      categorie: "AUTRE",
      montant: 105,
      description: "Frais Genius Pay - paiement MTX-LLKTHJHRXX",
      sourceFonds: "CAISSE",
      modePaiement: "MANUEL",
      statut: "VALIDE",
      statutPaiement: "PAYE",
      datePaiement: new Date(),
    },
  });
  console.log("Dépense de frais créée:", depense.id);

  const caisse = await prisma.caisse.findFirst();
  if (caisse) {
    await prisma.caisse.update({
      where: { id: caisse.id },
      data: { soldeActuel: { decrement: 105 } },
    });
    const updated = await prisma.caisse.findUnique({ where: { id: caisse.id } });
    console.log("Caisse après frais:", updated?.soldeActuel);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
