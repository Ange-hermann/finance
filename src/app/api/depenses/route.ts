import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategorieDepense, TypeDepense, SourceFonds } from "@/generated/prisma/client";
import { getPermission } from "@/lib/permissions";
import {
  depenseImputableAuSolde,
  getSoldeFonds,
  appliquerEffetsDepense,
} from "@/lib/depenses";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const statut = searchParams.get("statut");

  const depenses = await prisma.depense.findMany({
    where: {
      ...(type ? { type: type as TypeDepense } : {}),
      ...(statut ? { statut: statut as any } : {}),
    },
    include: {
      beneficiaire: true,
      transaction: { select: { id: true, montant: true, categorie: true, createdAt: true } },
      agent: { select: { id: true, nom: true } },
    },
    orderBy: { dateDepense: "desc" },
  });

  return NextResponse.json(depenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== "TREASURER" && userRole !== "ADMIN") {
    return NextResponse.json({ error: "Seul le trésorier peut créer des dépenses" }, { status: 403 });
  }

  const body = await req.json();
  const { type, categorie, description, montant, transactionId, dateDepense, sourceFonds, modePaiement, beneficiaireId, beneficiaireNom, beneficiaireTelephone, beneficiaireEmail, beneficiaireModePaiement } = body;

  if (!type || !categorie || !description || !montant || montant <= 0) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const modePaiementValide = modePaiement === "MANUEL" || modePaiement === "GENIUS_PAY";
  if (modePaiement && !modePaiementValide) {
    return NextResponse.json({ error: "Mode de paiement invalide" }, { status: 400 });
  }

  if (modePaiement === "GENIUS_PAY" && (!beneficiaireNom || !beneficiaireTelephone || !beneficiaireModePaiement)) {
    return NextResponse.json({ error: "Coordonnées bénéficiaire requises pour paiement Genius Pay" }, { status: 400 });
  }

  const userId = (session.user as any)?.id;
  const source = (sourceFonds as SourceFonds) || "CAISSE";

  // Une approbation est nécessaire si le rôle n'a pas un accès LIBRE sur le fonds
  const needsApproval = !getPermission(userRole, source).authorized;

  // Vérifier le solde du fonds avant validation directe
  // (les dépenses en attente seront vérifiées au moment de l'approbation)
  const imputable = depenseImputableAuSolde({ type, transactionId });
  if (!needsApproval && imputable) {
    const solde = await getSoldeFonds(source);
    if (solde < parseFloat(montant)) {
      return NextResponse.json({
        error: `Solde insuffisant dans ${source}. Disponible: ${solde.toLocaleString("fr-FR")} FCFA`,
      }, { status: 400 });
    }
  }

  let beneficiaireIdFinal = beneficiaireId;

  if (modePaiement === "GENIUS_PAY" && !beneficiaireIdFinal) {
    const beneficiaire = await prisma.beneficiaire.create({
      data: {
        nom: beneficiaireNom,
        telephone: beneficiaireTelephone,
        email: beneficiaireEmail || null,
        modePaiement: beneficiaireModePaiement,
        createdBy: userId,
      },
    });
    beneficiaireIdFinal = beneficiaire.id;
  }

  const depense = await prisma.depense.create({
    data: {
      type: type as TypeDepense,
      categorie: categorie as CategorieDepense,
      sourceFonds: source,
      description,
      montant: parseFloat(montant),
      transactionId: transactionId || null,
      agentId: userId,
      dateDepense: dateDepense ? new Date(dateDepense) : new Date(),
      statut: needsApproval ? "EN_ATTENTE" : "VALIDE",
      modePaiement: modePaiement || "MANUEL",
      beneficiaireId: beneficiaireIdFinal || null,
      referencePaiement: modePaiement === "GENIUS_PAY" ? `EXP-${Date.now()}` : null,
      lienPaiement: null,
      statutPaiement: modePaiement === "GENIUS_PAY" ? "EN_ATTENTE" : null,
    },
  });

  // Si la dépense est validée directement : débit de la caisse physique
  // (paiement manuel sur CAISSE) ou recalcul de la répartition (dépense
  // culte liée à une transaction). Les dépenses GENIUS_PAY sont débitées
  // par le webhook à la confirmation du paiement.
  if (depense.statut === "VALIDE") {
    await appliquerEffetsDepense(depense);
  }

  await prisma.logAudit.create({
    data: {
      userId,
      action: "DEPENSE_CREEE",
      cible: `Dépense ${depense.id}`,
      details: `${type} — ${categorie} — source: ${source}: ${montant} FCFA (${description})`,
    },
  });

  return NextResponse.json(depense, { status: 201 });
}
