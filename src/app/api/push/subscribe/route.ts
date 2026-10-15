import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json({ error: "Abonnement manquant" }, { status: 400 });
    }

    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role;

    // Enregistrer ou mettre à jour l'abonnement
    const existing = await prisma.pushSubscription.findFirst({
      where: { userId },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          subscription,
          role,
        },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId,
          role,
          subscription,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'abonnement:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de l'abonnement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

    await prisma.pushSubscription.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'abonnement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'abonnement" },
      { status: 500 }
    );
  }
}