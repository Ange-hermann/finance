import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validerDepense, annulerDepense } from "@/lib/depenses";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.nom || "Inconnu";

    // Vérifier que l'utilisateur peut approuver
    if (!["PASTOR", "AUDITOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Non autorisé à approuver" }, { status: 403 });
    }

    const body = await request.json();
    const { statut, commentaire } = body;
    const { id } = params;

    // Trouver la demande dans LogAudit
    const logs = await prisma.logAudit.findMany({
      where: { action: "DEMANDE_AUTORISATION" },
      take: 100,
    });

    let demandeLog = null;
    let demandeData = null;

    for (const log of logs) {
      try {
        const details = JSON.parse(log.details || "{}");
        if (details.id === id) {
          demandeLog = log;
          demandeData = details;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!demandeLog || !demandeData) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    // Traiter la dépense liée AVANT de marquer la demande :
    // si le solde est insuffisant, la demande reste EN_ATTENTE.
    if (demandeData.depenseId) {
      const depense = await prisma.depense.findUnique({
        where: { id: demandeData.depenseId },
      });

      if (depense) {
        if (statut === "APPROUVEE") {
          // Valide la dépense : vérifie le solde du fonds source, débite la
          // caisse physique si paiement manuel sur CAISSE, recalcule la
          // répartition si dépense culte liée à une transaction.
          const result = await validerDepense(depense);
          if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
        } else if (statut === "REFUSEE") {
          await annulerDepense(depense);
        }
      }
    }

    // Mettre à jour la demande
    demandeData.statut = statut;
    demandeData.dateReponse = new Date().toISOString();
    demandeData.approbateurId = userId;
    demandeData.approbateurNom = userName;
    demandeData.commentaire = commentaire || "";

    // Mettre à jour le log
    await prisma.logAudit.update({
      where: { id: demandeLog.id },
      data: { details: JSON.stringify(demandeData) },
    });

    return NextResponse.json({ demande: demandeData });

  } catch (error) {
    console.error("Erreur lors de l'approbation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id } = params;

    // Trouver la demande dans LogAudit
    const logs = await prisma.logAudit.findMany({
      where: { action: "DEMANDE_AUTORISATION" },
      take: 100,
    });

    let demandeLog = null;
    let demandeData = null;

    for (const log of logs) {
      try {
        const details = JSON.parse(log.details || "{}");
        if (details.id === id) {
          demandeLog = log;
          demandeData = details;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!demandeLog || !demandeData) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    // Vérifier que l'utilisateur est le demandeur
    if (demandeData.demandeurId !== userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Supprimer le log
    await prisma.logAudit.delete({
      where: { id: demandeLog.id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur lors de l'annulation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}