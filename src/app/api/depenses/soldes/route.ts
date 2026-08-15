import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [caisse, repartitions, depenses] = await Promise.all([
    prisma.caisse.findFirst(),
    prisma.repartition.findMany({
      where: { transaction: { statut: "VALIDE" } },
    }),
    prisma.depense.findMany({
      where: { statut: "VALIDE", type: "DEPENSE_NORMALE" },
    }),
  ]);

  const totalCaisseRepart = repartitions.reduce((s, r) => s + Number(r.montantCaisse), 0);
  const totalEconomie = repartitions.reduce((s, r) => s + Number(r.montantEconomie), 0);
  const totalEpargne = repartitions.reduce((s, r) => s + Number(r.montantEpargne), 0);
  const totalConstruction = repartitions.reduce((s, r) => s + Number(r.montantFondsDedie), 0);
  const totalActionSociale = repartitions.reduce((s, r) => s + Number(r.montantActionSociale), 0);

  const depenseCaisse = depenses.filter((d) => d.sourceFonds === "CAISSE").reduce((s, d) => s + Number(d.montant), 0);
  const depenseEconomie = depenses.filter((d) => d.sourceFonds === "ECONOMIE").reduce((s, d) => s + Number(d.montant), 0);
  const depenseEpargne = depenses.filter((d) => d.sourceFonds === "EPARGNE").reduce((s, d) => s + Number(d.montant), 0);
  const depenseConstruction = depenses.filter((d) => d.sourceFonds === "CONSTRUCTION").reduce((s, d) => s + Number(d.montant), 0);
  const depenseActionSociale = depenses.filter((d) => d.sourceFonds === "ACTION_SOCIALE").reduce((s, d) => s + Number(d.montant), 0);

  return NextResponse.json({
    CAISSE: totalCaisseRepart - depenseCaisse,
    ECONOMIE: totalEconomie - depenseEconomie,
    EPARGNE: totalEpargne - depenseEpargne,
    CONSTRUCTION: totalConstruction - depenseConstruction,
    ACTION_SOCIALE: totalActionSociale - depenseActionSociale,
  });
}
