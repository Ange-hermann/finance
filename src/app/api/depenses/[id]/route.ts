import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validerDepense, annulerDepense } from "@/lib/depenses";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;
  const body = await req.json();
  const { statut } = body;

  if (!statut || !["VALIDE", "ANNULE"].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Pour approuver (EN_ATTENTE -> VALIDE), seul pasteur/auditor/admin peut le faire
  if (statut === "VALIDE" && !["PASTOR", "AUDITOR", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Seul le pasteur ou le commissaire peut approuver les dépenses" }, { status: 403 });
  }

  // Pour annuler, trésorier et admin peuvent le faire
  if (statut === "ANNULE" && !["TREASURER", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Seul le trésorier peut annuler les dépenses" }, { status: 403 });
  }

  const depense = await prisma.depense.findUnique({
    where: { id: params.id },
  });

  if (!depense) {
    return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });
  }

  const userId = (session.user as any)?.id;

  if (statut === "VALIDE") {
    const result = await validerDepense(depense);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } else {
    await annulerDepense(depense);
  }

  const updated = await prisma.depense.findUnique({
    where: { id: params.id },
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
