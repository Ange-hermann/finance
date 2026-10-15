import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprove } from "@/lib/permissions";
import { sendPushNotificationToRole } from "@/lib/notifications";
import { getPaymentProvider, PAYOUT_PROVIDER_PAR_MODE } from "@/lib/payment";
import { validerDepense, marquerDepensePayee } from "@/lib/depenses";
import { StatutAutorisation } from "@/generated/prisma/client";

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

    // Vérifier si l'utilisateur peut approuver
    if (!(await canApprove(role))) {
      return NextResponse.json({ error: "Pas autorisé à approuver" }, { status: 403 });
    }

    const body = await request.json();
    const { statut, commentaire } = body;

    if (!statut || !["APPROUVEE", "REFUSEE"].includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const demande = await prisma.demandeAutorisation.update({
      where: { id: params.id },
      data: {
        statut: statut as StatutAutorisation,
        approbateurId: userId,
        commentaire,
        dateReponse: new Date(),
      },
      include: {
        demandeur: { select: { nom: true, email: true } },
        approbateur: { select: { nom: true, email: true } },
      },
    });

    // Si approuvé et lié à une dépense, valider la dépense
    if (statut === "APPROUVEE" && demande.depenseId) {
      const depense = await prisma.depense.findUnique({
        where: { id: demande.depenseId },
        include: { beneficiaire: true },
      });

      if (!depense) {
        return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 });
      }

      const result = await validerDepense(depense);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Paiement sortant vers le bénéficiaire si Genius Pay
      let payoutReference: string | null = null;
      if (
        depense.modePaiement === "GENIUS_PAY" &&
        depense.beneficiaire &&
        depense.statutPaiement !== "PAYE" &&
        depense.statutPaiement !== "EN_COURS"
      ) {
        const payoutProvider = PAYOUT_PROVIDER_PAR_MODE[depense.beneficiaire.modePaiement];
        const provider = getPaymentProvider();
        if (payoutProvider && provider.createPayout) {
          const payout = await provider.createPayout(
            Number(depense.montant),
            `Paiement dépense ${depense.id} - ${depense.description}`,
            {
              nom: depense.beneficiaire.nom,
              telephone: depense.beneficiaire.telephone,
              email: depense.beneficiaire.email || undefined,
              provider: payoutProvider,
            },
            {
              type: "expense",
              depenseId: depense.id,
              reference: depense.referencePaiement,
            }
          );
          payoutReference = payout.reference;

          await prisma.depense.update({
            where: { id: demande.depenseId },
            data: {
              referencePaiement: payout.reference,
              statutPaiement: payout.status === "completed" ? "PAYE" : payout.status === "failed" ? "ECHOUE" : "EN_COURS",
            },
          });

          if (payout.status === "completed") {
            await marquerDepensePayee(depense);
          }
        }
      }

      // Envoyer notification à la trésorière
      try {
        await sendPushNotificationToRole(
          "TREASURER",
          {
            title: "Dépense approuvée",
            body: `${demande.typeAction} de ${demande.montant} FCFA approuvée${payoutReference ? " - Paiement initié" : ""}`,
            data: { demandeId: demande.id, depenseId: demande.depenseId },
          },
          prisma
        );
      } catch (error) {
        console.error("Erreur envoi notification:", error);
      }
    }

    return NextResponse.json(demande);

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

    // Seul le demandeur peut annuler sa propre demande
    const demande = await prisma.demandeAutorisation.findUnique({
      where: { id: params.id },
    });

    if (!demande) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (demande.demandeurId !== userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (demande.statut !== StatutAutorisation.EN_ATTENTE) {
      return NextResponse.json({ error: "Impossible d'annuler une demande traitée" }, { status: 400 });
    }

    await prisma.demandeAutorisation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Demande annulée" });

  } catch (error) {
    console.error("Erreur lors de l'annulation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}