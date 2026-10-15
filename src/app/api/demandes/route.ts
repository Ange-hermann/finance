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

    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.nom || "Inconnu";

    const body = await request.json();
    const { sourceFonds, typeAction, montant, description, motif, depenseId } = body;

    // Stocker la demande dans LogAudit comme solution temporaire
    const demande = {
      id: Math.random().toString(36).substring(2),
      demandeurId: userId,
      demandeurNom: userName,
      sourceFonds,
      typeAction,
      montant,
      description,
      motif,
      statut: "EN_ATTENTE",
      dateDemande: new Date().toISOString(),
      depenseId,
    };

    await prisma.logAudit.create({
      data: {
        userId,
        action: "DEMANDE_AUTORISATION",
        cible: sourceFonds,
        details: JSON.stringify(demande),
      },
    });

    return NextResponse.json({ 
      authorized: false, 
      needsApproval: true, 
      demande,
      message: "Demande d'autorisation envoyée" 
    });

  } catch (error) {
    console.error("Erreur lors de la demande d'autorisation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    // Récupérer les demandes depuis LogAudit
    const logs = await prisma.logAudit.findMany({
      where: {
        action: "DEMANDE_AUTORISATION",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const demandes = logs.map(log => {
      try {
        const details = JSON.parse(log.details || "{}");
        return {
          ...details,
          createdAt: log.createdAt,
          approbateurId: details.approbateurId,
          approbateurNom: details.approbateurNom,
          dateReponse: details.dateReponse,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Filtrer selon le rôle
    const demandesFiltrees = demandes.filter((d: any) => {
      if (role === "ADMIN" || role === "PASTOR" || role === "AUDITOR") {
        return true; // Voir toutes les demandes
      }
      return d.demandeurId === userId; // Voir seulement ses propres demandes
    });

    return NextResponse.json(demandesFiltrees);

  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}