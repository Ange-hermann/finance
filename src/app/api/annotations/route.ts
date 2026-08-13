import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { transactionId, commentaire } = body;

    if (!transactionId || !commentaire?.trim()) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const annotation = await prisma.annotationAudit.create({
      data: {
        auteurId: (session.user as any).id,
        transactionId,
        commentaire: commentaire.trim(),
      },
    });

    await prisma.logAudit.create({
      data: {
        userId: (session.user as any).id,
        action: "ANNOTATION_AJOUT",
        cible: `Transaction ${transactionId}`,
        details: `Annotation: ${commentaire.substring(0, 100)}`,
      },
    });

    return NextResponse.json({ success: true, annotationId: annotation.id });
  } catch (error) {
    console.error("Erreur annotation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
