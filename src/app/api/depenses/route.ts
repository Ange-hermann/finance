import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategorieDepense, TypeDepense } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const statut = searchParams.get("statut");

  const depenses = await prisma.depense.findMany({
    where: {
      ...(type ? { type: type as TypeDepense } : {}),
      ...(statut ? { statut: statut as any } : {}),
    },
    include: {
      transaction: { select: { id: true, montant: true, categorie: true, createdAt: true } },
      agent: { select: { id: true, nom: true } },
    },
    orderBy: { dateDepense: "desc" },
  });

  return NextResponse.json(depenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "TREASURER" && userRole !== "ADMIN") {
    return NextResponse.json({ error: "Seul le trésorier peut créer des dépenses" }, { status: 403 });
  }

  const body = await req.json();
  const { type, categorie, description, montant, transactionId, dateDepense } = body;

  if (!type || !categorie || !description || !montant || montant <= 0) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const userId = (session.user as any)?.id;

  const depense = await prisma.depense.create({
    data: {
      type: type as TypeDepense,
      categorie: categorie as CategorieDepense,
      description,
      montant: parseFloat(montant),
      transactionId: transactionId || null,
      agentId: userId,
      dateDepense: dateDepense ? new Date(dateDepense) : new Date(),
      statut: "VALIDE",
    },
  });

  // Si dépense normale, déduire de la caisse
  if (type === "DEPENSE_NORMALE") {
    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { decrement: parseFloat(montant) } },
      });
    }
  }

  // Si dépense culte liée à une transaction, recalculer la répartition sur le montant net
  if (type === "DEPENSE_CULTE" && transactionId) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        depenses: { where: { type: "DEPENSE_CULTE", statut: "VALIDE" } },
        repartition: true,
      },
    });

    if (transaction && transaction.statut === "VALIDE" && transaction.repartition) {
      const totalDepenses = transaction.depenses.reduce(
        (sum, d) => sum + Number(d.montant),
        0
      );
      const montantNet = Number(transaction.montant) - totalDepenses;

      if (montantNet > 0) {
        const { calculerRepartition } = await import("@/lib/finance");
        const newRepartition = calculerRepartition(
          montantNet,
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

        // Ajuster la caisse : rembourser l'excédent (la répartition initiale était sur le montant brut)
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
  }

  await prisma.logAudit.create({
    data: {
      userId,
      action: "DEPENSE_CREEE",
      cible: `Dépense ${depense.id}`,
      details: `${type} — ${categorie}: ${montant} FCFA (${description})`,
    },
  });

  return NextResponse.json(depense, { status: 201 });
}
