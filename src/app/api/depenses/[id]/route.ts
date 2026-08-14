import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatutDepense } from "@/generated/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "TREASURER" && userRole !== "ADMIN") {
    return NextResponse.json({ error: "Seul le trésorier peut modifier les dépenses" }, { status: 403 });
  }

  const body = await req.json();
  const { statut } = body;

  if (!statut || !["VALIDE", "ANNULE"].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const depense = await prisma.depense.findUnique({
    where: { id: params.id },
  });

  if (!depense) {
    return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });
  }

  const userId = (session.user as any)?.id;

  // Si on annule une dépense normale validée, rembourser la caisse
  if (statut === "ANNULE" && depense.statut === "VALIDE" && depense.type === "DEPENSE_NORMALE") {
    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { increment: Number(depense.montant) } },
      });
    }
  }

  // Si on annule une dépense culte validée, recalculer la répartition sur le montant brut
  if (statut === "ANNULE" && depense.statut === "VALIDE" && depense.type === "DEPENSE_CULTE" && depense.transactionId) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: depense.transactionId },
      include: {
        depenses: { where: { type: "DEPENSE_CULTE", statut: "VALIDE", id: { not: depense.id } } },
        repartition: true,
      },
    });

    if (transaction && transaction.repartition) {
      const totalDepenses = transaction.depenses.reduce(
        (sum, d) => sum + Number(d.montant),
        0
      );
      const montantNet = Number(transaction.montant) - totalDepenses;

      const { calculerRepartition } = await import("@/lib/finance");
      const newRepartition = calculerRepartition(
        Math.max(0, montantNet),
        transaction.categorie as any
      );

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

      // Ajuster la caisse
      const diffCaisse = newRepartition.montantCaisse - Number(transaction.repartition.montantCaisse);
      const caisse = await prisma.caisse.findFirst();
      if (caisse && diffCaisse !== 0) {
        await prisma.caisse.update({
          where: { id: caisse.id },
          data: { soldeActuel: { increment: diffCaisse } },
        });
      }
    }
  }

  const updated = await prisma.depense.update({
    where: { id: params.id },
    data: { statut: statut as StatutDepense },
  });

  await prisma.logAudit.create({
    data: {
      userId,
      action: "DEPENSE_MODIFIEE",
      cible: `Dépense ${depense.id}`,
      details: `Statut changé à ${statut}`,
    },
  });

  return NextResponse.json(updated);
}
