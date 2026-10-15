import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Vérifier que l'utilisateur est un pasteur
    if ((session?.user as any)?.role !== "PASTOR") {
      return NextResponse.json(
        { error: "Seuls les pasteurs peuvent marquer la dîme de la dîme comme remise" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { moisKey } = body; // Format: YYYY-MM

    // Récupérer les dîmes à marquer
    let dimesNonMarquees;
    if (moisKey) {
      // Marquage par mois spécifique
      const debutMois = new Date(`${moisKey}-01`);
      const finMois = new Date(debutMois);
      finMois.setMonth(finMois.getMonth() + 1);

      dimesNonMarquees = await prisma.transaction.findMany({
        where: {
          categorie: "DIME",
          statut: "VALIDE",
          repartition: null,
          createdAt: {
            gte: debutMois,
            lt: finMois,
          },
        },
      });
    } else {
      // Marquage de toutes les dîmes non marquées
      dimesNonMarquees = await prisma.transaction.findMany({
        where: {
          categorie: "DIME",
          statut: "VALIDE",
          repartition: null,
        },
      });
    }

    if (dimesNonMarquees.length === 0) {
      return NextResponse.json({
        success: true,
        message: moisKey ? "Aucune dîme à marquer pour ce mois" : "Aucune dîme à marquer",
        montantTotal: 0,
      });
    }

    // Calculer le total des dîmes et la dîme de la dîme
    const totalDimes = dimesNonMarquees.reduce((sum, d) => sum + Number(d.montant), 0);
    const dimeDeLaDime = Math.round(totalDimes * 0.10);

    // Marquer chaque dîme comme remise : enregistre la dîme de la dîme
    // (10% de ce que le pasteur a reçu). Cet argent n'entre PAS en caisse —
    // il fait partie du solde retirable du pasteur (page Retrait).
    for (const dime of dimesNonMarquees) {
      const montantDimeDeLaDime = Math.round(Number(dime.montant) * 0.10);

      await prisma.repartition.create({
        data: {
          transactionId: dime.id,
          montantCaisse: 0,
          montantEconomie: 0,
          montantEpargne: 0, // NE PAS affecter Épargne
          montantActionSociale: 0,
          montantDimeDeLaDime: montantDimeDeLaDime,
          montantFondsDedie: 0,
        },
      });
    }

    // Log d'audit
    await prisma.logAudit.create({
      data: {
        userId: (session?.user as any)?.id,
        action: "MARQUAGE_DIME_DE_LA_DIME_REMISE",
        cible: "Manuel",
        details: moisKey
          ? `Marquage de la dîme de la dîme comme remise pour ${moisKey} : ${dimeDeLaDime} FCFA (${dimesNonMarquees.length} dîmes)`
          : `Marquage de la dîme de la dîme comme remise : ${dimeDeLaDime} FCFA (${dimesNonMarquees.length} dîmes)`,
      },
    });

    return NextResponse.json({
      success: true,
      message: moisKey
        ? `Dîme de la dîme marquée comme remise pour ${moisKey}`
        : "Dîme de la dîme marquée comme remise avec succès",
      montantTotal: totalDimes,
      dimeDeLaDime: dimeDeLaDime,
      nombreDimes: dimesNonMarquees.length,
    });

  } catch (error) {
    console.error("Erreur lors du marquage de la dîme de la dîme:", error);
    return NextResponse.json(
      { error: "Erreur lors du marquage de la dîme de la dîme" },
      { status: 500 }
    );
  }
}