import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getFraisPaiement } from "../src/lib/paiements";

async function main() {
  const txEnLigne = await prisma.transaction.findMany({
    where: { mode: "EN_LIGNE", statut: "VALIDE" },
    select: { id: true, montant: true, categorie: true, referencePaiement: true, createdAt: true },
  });

  for (const t of txEnLigne) {
    const ref = t.referencePaiement || t.id;
    const existe = await prisma.depense.findFirst({
      where: { description: { contains: ref, mode: "insensitive" } },
    });

    if (existe) {
      console.log(`OK  ${t.referencePaiement} — dépense frais existe déjà (${Number(existe.montant)} F)`);
      continue;
    }

    const frais = await getFraisPaiement(t.referencePaiement);
    if (frais <= 0) {
      console.log(`??  ${t.referencePaiement} — frais introuvables sur l'API (0)`);
      continue;
    }

    if (t.categorie === "DIME") {
      console.log(`--  ${t.referencePaiement} — DIME, frais non comptés (règle métier)`);
      continue;
    }

    await prisma.depense.create({
      data: {
        type: "DEPENSE_NORMALE",
        categorie: "AUTRE",
        montant: frais,
        description: `Frais Genius Pay - paiement ${ref}`,
        sourceFonds: "CAISSE",
        modePaiement: "MANUEL",
        statut: "VALIDE",
        statutPaiement: "PAYE",
        dateDepense: t.createdAt,
        datePaiement: t.createdAt,
      },
    });

    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { decrement: frais } },
      });
    }

    await prisma.logAudit.create({
      data: {
        action: "FRAIS_PAIEMENT_EN_LIGNE",
        cible: `Transaction ${t.id}`,
        details: `Frais Genius Pay de ${frais} FCFA (régularisation) sur un don de ${Number(t.montant)} FCFA`,
      },
    });

    console.log(`FIX ${t.referencePaiement} — dépense frais créée : ${frais} F`);
  }
}

main().finally(() => prisma.$disconnect());
