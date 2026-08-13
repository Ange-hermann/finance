import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculerRepartition } from "@/lib/finance";
import { CategorieTransaction, ModePaiementPhysique } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { categorie, montant, modePaiementPhysique, nom, telephone, email } = body;

    const montantNum = parseFloat(montant);
    if (!montantNum || montantNum <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    let contributeurId: string | null = null;
    if (nom || telephone || email) {
      const contributeur = await prisma.contributeur.create({
        data: {
          nom: nom || null,
          telephone: telephone || null,
          email: email || null,
        },
      });
      contributeurId = contributeur.id;
    }

    const agentId = (session.user as any)?.id;

    const transaction = await prisma.transaction.create({
      data: {
        montant: montantNum,
        categorie: categorie as CategorieTransaction,
        mode: "MANUEL",
        modePaiementPhysique: modePaiementPhysique as ModePaiementPhysique,
        contributeurId,
        agentId,
        statut: "VALIDE",
      },
    });

    const repartition = calculerRepartition(montantNum, categorie as CategorieTransaction);
    await prisma.repartition.create({
      data: {
        transactionId: transaction.id,
        montantEconomie: repartition.montantEconomie,
        montantEpargne: repartition.montantEpargne,
        montantActionSociale: repartition.montantActionSociale,
        montantDimeDeLaDime: repartition.montantDimeDeLaDime,
        montantCaisse: repartition.montantCaisse,
        montantFondsDedie: repartition.montantFondsDedie,
      },
    });

    const caisse = await prisma.caisse.findFirst();
    if (caisse) {
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: { soldeActuel: { increment: montantNum } },
      });
    } else {
      await prisma.caisse.create({
        data: { soldeActuel: montantNum },
      });
    }

    const recu = await prisma.recu.create({
      data: { transactionId: transaction.id },
    });

    await prisma.logAudit.create({
      data: {
        userId: agentId,
        action: "SAISIE_MANUELLE",
        cible: `Transaction ${transaction.id}`,
        details: `Saisie manuelle de ${montantNum} FCFA pour ${categorie} par ${session.user?.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      recuId: recu.id,
      recuUrl: `/api/recu/${recu.id}`,
    });
  } catch (error) {
    console.error("Erreur saisie manuelle:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    );
  }
}
