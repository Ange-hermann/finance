import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatutDime } from "@/generated/prisma";

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Récupérer toutes les répartitions avec la dîme, groupées par mois
  const repartitions = await prisma.repartition.findMany({
    where: {
      montantDimeDeLaDime: { not: null },
      transaction: { statut: "VALIDE" },
    },
    include: {
      transaction: { select: { createdAt: true, categorie: true } },
    },
  });

  // Récupérer les statuts enregistrés (avant la boucle pour pouvoir séparer avant/après versement)
  const dimesEnregistrees = await prisma.dimeMensuelle.findMany();
  const statutMap: Record<string, { id: string; statut: string; dateVersement: string | null }> = {};

  for (const d of dimesEnregistrees) {
    const key = `${d.annee}-${d.mois}`;
    statutMap[key] = {
      id: d.id,
      statut: d.statut,
      dateVersement: d.dateVersement ? d.dateVersement.toISOString() : null,
    };
  }

  // Grouper par mois/année, en séparant avant/après date de versement
  const dimesParMois: Record<string, { mois: number; annee: number; montantTotal: number; montantAvantVersement: number; montantApresVersement: number }> = {};

  for (const r of repartitions) {
    if (!r.montantDimeDeLaDime) continue;
    const date = r.transaction.createdAt;
    const mois = date.getMonth() + 1;
    const annee = date.getFullYear();
    const key = `${annee}-${mois}`;

    if (!dimesParMois[key]) {
      dimesParMois[key] = { mois, annee, montantTotal: 0, montantAvantVersement: 0, montantApresVersement: 0 };
    }
    const montant = Number(r.montantDimeDeLaDime);
    dimesParMois[key].montantTotal += montant;

    const enregistree = statutMap[key];
    if (enregistree?.statut === "VERSE" && enregistree.dateVersement) {
      const dateVersement = new Date(enregistree.dateVersement);
      if (date <= dateVersement) {
        dimesParMois[key].montantAvantVersement += montant;
      } else {
        dimesParMois[key].montantApresVersement += montant;
      }
    }
  }

  // Construire la liste
  const now = new Date();
  const moisActuel = now.getMonth() + 1;
  const anneeActuelle = now.getFullYear();

  const dimes = Object.values(dimesParMois)
    .map((d) => {
      const key = `${d.annee}-${d.mois}`;
      const enregistree = statutMap[key];
      const statut = (enregistree?.statut as "VERSE" | "NON_VERSE") || "NON_VERSE";
      const montantAffiche = statut === "VERSE" ? d.montantApresVersement : d.montantTotal;
      return {
        id: enregistree?.id || key,
        mois: d.mois,
        moisNom: MOIS_NOMS[d.mois - 1],
        annee: d.annee,
        montant: Math.round(montantAffiche * 100) / 100,
        montantTotal: Math.round(d.montantTotal * 100) / 100,
        montantVersee: Math.round(d.montantAvantVersement * 100) / 100,
        statut,
        dateVersement: enregistree?.dateVersement || null,
        estMoisActuel: d.mois === moisActuel && d.annee === anneeActuelle,
        estPasse: d.annee < anneeActuelle || (d.annee === anneeActuelle && d.mois < moisActuel),
      };
    })
    .sort((a, b) => b.annee - a.annee || b.mois - a.mois);

  // Calculer les totaux
  const totalVerse = dimes.reduce((s, d) => s + (d.statut === "VERSE" ? d.montantVersee : 0), 0);
  const totalRestant = dimes.reduce((s, d) => s + d.montant, 0);
  const moisActuelData = dimes.find((d) => d.estMoisActuel);
  const moisPasses = dimes.filter((d) => d.estPasse);

  return NextResponse.json({
    dimes,
    resume: {
      moisActuel: moisActuelData || null,
      totalMoisPasses: moisPasses,
      totalVerse,
      totalRestant,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "TREASURER" && userRole !== "ADMIN") {
    return NextResponse.json({ error: "Seul le trésorier peut gérer la dîme" }, { status: 403 });
  }

  const body = await req.json();
  const { mois, annee, statut } = body;

  if (!mois || !annee || !statut || !["VERSE", "NON_VERSE"].includes(statut)) {
    return NextResponse.json({ error: "Mois, année et statut requis" }, { status: 400 });
  }

  const userId = (session.user as any)?.id;
  const dateVersement = statut === "VERSE" ? new Date() : null;

  // Upsert : créer ou mettre à jour le statut (pas de montant, pas de caisse)
  const dime = await prisma.dimeMensuelle.upsert({
    where: { mois_annee: { mois: parseInt(mois), annee: parseInt(annee) } },
    update: { statut: statut as StatutDime, dateVersement, agentId: userId },
    create: {
      mois: parseInt(mois),
      annee: parseInt(annee),
      montant: 0,
      statut: statut as StatutDime,
      dateVersement,
      agentId: userId,
    },
  });

  await prisma.logAudit.create({
    data: {
      userId,
      action: "DIME_MODIFIEE",
      cible: `Dîme ${MOIS_NOMS[parseInt(mois) - 1]} ${annee}`,
      details: `Statut changé à ${statut === "VERSE" ? "Donnée" : "Non donnée"}`,
    },
  });

  return NextResponse.json(dime);
}
