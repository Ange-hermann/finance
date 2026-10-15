import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermission } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const body = await request.json();
    const { sourceFonds } = body;

    return NextResponse.json(getPermission(role, sourceFonds));

  } catch (error) {
    console.error("Erreur lors de la vérification des permissions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
