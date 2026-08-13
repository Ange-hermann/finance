import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const { nom, email, telephone, role, password } = body;

    if (!nom || !email || !password || !role) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nom,
        email,
        telephone: telephone || null,
        role: role as Role,
        motDePasseHash: hash,
      },
    });

    await prisma.logAudit.create({
      data: {
        userId: (session.user as any).id,
        action: "USER_CREATION",
        cible: `User ${user.id}`,
        details: `Création utilisateur ${nom} (${role})`,
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Erreur création user:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, actif } = body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { actif },
    });

    await prisma.logAudit.create({
      data: {
        userId: (session.user as any).id,
        action: "USER_TOGGLE",
        cible: `User ${user.id}`,
        details: `Utilisateur ${actif ? "activé" : "désactivé"}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur update user:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
