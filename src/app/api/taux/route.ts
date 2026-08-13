import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategorieTransaction } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const { categorie, nomPoste, pourcentage } = body;

    if (!categorie || !nomPoste || pourcentage === undefined) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const taux = await prisma.tauxRepartition.create({
      data: {
        categorie: categorie as CategorieTransaction,
        nomPoste,
        pourcentage: parseFloat(pourcentage),
      },
    });

    await prisma.logAudit.create({
      data: {
        userId: (session.user as any).id,
        action: "TAUX_CREATION",
        cible: `Taux ${taux.id}`,
        details: `Taux ${nomPoste}=${pourcentage}% pour ${categorie}`,
      },
    });

    return NextResponse.json({ success: true, tauxId: taux.id });
  } catch (error) {
    console.error("Erreur création taux:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
