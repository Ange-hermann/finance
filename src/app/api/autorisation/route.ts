import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, canApprove } from "@/lib/permissions";
import { validerDepense } from "@/lib/depenses";
import { SourceFonds, StatutAutorisation } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const { sourceFonds, typeAction, montant, description, motif, depenseId } = body;

    // Vérifier les permissions
    const permission = await checkPermission(role, sourceFonds, montant);

    if (permission.authorized) {
      // Si autorisé, valider la dépense directement
      if (depenseId) {
        const depense = await prisma.depense.findUnique({
          where: { id: depenseId },
        });
        if (!depense) {
          return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 });
        }
        const result = await validerDepense(depense);
        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ authorized: true, depense });
      }
      return NextResponse.json({ authorized: true, message: "Action autorisée" });
    }

    // Si besoin d'approbation, créer une demande d'autorisation
    const demande = await prisma.demandeAutorisation.create({
      data: {
        demandeurId: userId,
        sourceFonds: sourceFonds as SourceFonds,
        typeAction,
        montant,
        description,
        motif: motif || "",
        depenseId,
        statut: StatutAutorisation.EN_ATTENTE,
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

    const { searchParams } = new URL(request.url);
    const statut = searchParams.get("statut");

    // Si l'utilisateur peut approuver, il voit toutes les demandes en attente
    if (await canApprove(role)) {
      const demandes = await prisma.demandeAutorisation.findMany({
        where: statut ? { statut: statut as StatutAutorisation } : undefined,
        include: {
          demandeur: { select: { nom: true, email: true } },
          approbateur: { select: { nom: true, email: true } },
        },
        orderBy: { dateDemande: "desc" },
      });
      return NextResponse.json(demandes);
    }

    // Sinon, l'utilisateur voit seulement ses propres demandes
    const demandes = await prisma.demandeAutorisation.findMany({
      where: {
        demandeurId: userId,
        ...(statut ? { statut: statut as StatutAutorisation } : {}),
      },
      include: {
        demandeur: { select: { nom: true, email: true } },
        approbateur: { select: { nom: true, email: true } },
      },
      orderBy: { dateDemande: "desc" },
    });

    return NextResponse.json(demandes);

  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}