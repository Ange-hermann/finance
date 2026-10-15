import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSoldeFonds, initierPayoutDepense } from "@/lib/depenses";

const PROVIDERS_PAYOUT = ["WAVE", "ORANGE_MOMO", "MTN_MOMO", "MOOV_MOMO"];

// Solde et historique des retraits du pasteur
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [solde, retraits, totalDimes, partDons, dejaRemis] = await Promise.all([
    getSoldeFonds("PASTEUR"),
    prisma.depense.findMany({
      where: { sourceFonds: "PASTEUR" },
      include: { beneficiaire: true },
      orderBy: { dateDepense: "desc" },
      take: 30,
    }),
    prisma.transaction.aggregate({
      _sum: { montant: true },
      where: { categorie: "DIME", statut: "VALIDE" },
    }),
    prisma.repartition.aggregate({
      _sum: { montantDimeDeLaDime: true },
      where: { transaction: { categorie: { not: "DIME" }, statut: "VALIDE" } },
    }),
    prisma.depense.aggregate({
      _sum: { montant: true },
      where: {
        sourceFonds: "PASTEUR",
        statut: { not: "ANNULE" },
        description: { contains: "dîme de la dîme", mode: "insensitive" },
      },
    }),
  ]);

  const totalRecu =
    Number(totalDimes._sum.montant || 0) + Number(partDons._sum.montantDimeDeLaDime || 0);
  const dimeDeLaDimeDue = Math.max(
    0,
    Math.round(totalRecu * 0.10) - Number(dejaRemis._sum.montant || 0)
  );

  return NextResponse.json({ solde, retraits, dimeDeLaDimeDue });
}

// Le pasteur retire un montant de son solde (dîmes + part des dons)
// vers son mobile money via payout Genius Pay.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (user?.role !== "PASTOR") {
      return NextResponse.json(
        { error: "Seul le pasteur peut effectuer un retrait" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const montant = parseFloat(body.montant);
    const telephone = body.telephone || (await prisma.user.findUnique({ where: { id: user.id } }))?.telephone;
    const provider = body.provider || "WAVE";

    if (!montant || montant <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!telephone) {
      return NextResponse.json(
        { error: "Numéro de téléphone requis pour le retrait" },
        { status: 400 }
      );
    }
    if (!PROVIDERS_PAYOUT.includes(provider)) {
      return NextResponse.json({ error: "Provider de retrait invalide" }, { status: 400 });
    }

    const solde = await getSoldeFonds("PASTEUR");
    if (solde < montant) {
      return NextResponse.json(
        { error: `Solde insuffisant. Disponible: ${solde.toLocaleString("fr-FR")} FCFA` },
        { status: 400 }
      );
    }

    const beneficiaire = await prisma.beneficiaire.create({
      data: {
        nom: user.nom || "Pasteur",
        telephone,
        modePaiement: provider,
        createdBy: user.id,
      },
    });

    const depense = await prisma.depense.create({
      data: {
        type: "DEPENSE_NORMALE",
        categorie: "SALAIRE",
        sourceFonds: "PASTEUR",
        description: body.pourDimeDeLaDime
          ? "Dîme de la dîme — retrait"
          : body.description || "Retrait pasteur",
        montant,
        agentId: user.id,
        statut: "VALIDE",
        modePaiement: "GENIUS_PAY",
        beneficiaireId: beneficiaire.id,
        statutPaiement: "EN_ATTENTE",
      },
    });

    const { payout, depense: updated } = await initierPayoutDepense(depense.id);

    await prisma.logAudit.create({
      data: {
        userId: user.id,
        action: "RETRAIT_PASTEUR",
        cible: `Dépense ${depense.id}`,
        details: `Retrait pasteur ${payout.reference} de ${montant} FCFA vers ${telephone} (${provider})${payout.fees ? ` - frais: ${payout.fees} FCFA` : ""}`,
      },
    });

    return NextResponse.json({
      retraitId: depense.id,
      reference: updated.referencePaiement,
      statutPaiement: updated.statutPaiement,
      fees: payout.fees,
    });
  } catch (error) {
    console.error("Erreur retrait pasteur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}
