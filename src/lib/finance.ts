import { CategorieTransaction } from "@/generated/prisma";

export interface ResultatRepartition {
  montantEconomie: number;
  montantEpargne: number;
  montantActionSociale: number;
  montantDimeDeLaDime: number | null;
  montantCaisse: number;
  montantFondsDedie: number;
}

export interface TauxRepartitionConfig {
  economie: number;
  epargne: number;
  actionSociale: number;
  dimeDeLaDime: number | null;
  caisse: number;
  fondsDedie: number;
}

const tauxParDefaut: Record<CategorieTransaction, TauxRepartitionConfig> = {
  OFFRANDE: {
    economie: 0.10,
    epargne: 0.10,
    actionSociale: 0.10,
    dimeDeLaDime: null,
    caisse: 0.70,
    fondsDedie: 0,
  },
  DIME: {
    economie: 0.10,
    epargne: 0.10,
    actionSociale: 0.10,
    dimeDeLaDime: 0.10,
    caisse: 0.60,
    fondsDedie: 0,
  },
  CONSTRUCTION: {
    economie: 0,
    epargne: 0,
    actionSociale: 0,
    dimeDeLaDime: null,
    caisse: 0,
    fondsDedie: 1.00,
  },
  DON_SPECIAL: {
    economie: 0.10,
    epargne: 0.10,
    actionSociale: 0.10,
    dimeDeLaDime: null,
    caisse: 0.70,
    fondsDedie: 0,
  },
  PROJET: {
    economie: 0.10,
    epargne: 0.10,
    actionSociale: 0.10,
    dimeDeLaDime: null,
    caisse: 0.70,
    fondsDedie: 0,
  },
  AUTRE: {
    economie: 0.10,
    epargne: 0.10,
    actionSociale: 0.10,
    dimeDeLaDime: null,
    caisse: 0.70,
    fondsDedie: 0,
  },
};

export function calculerRepartition(
  montant: number,
  categorie: CategorieTransaction,
  tauxCustom?: Partial<Record<CategorieTransaction, Partial<TauxRepartitionConfig>>>
): ResultatRepartition {
  if (montant < 0) {
    throw new Error("Le montant ne peut pas être négatif");
  }

  const taux = tauxCustom?.[categorie]
    ? { ...tauxParDefaut[categorie], ...tauxCustom[categorie] }
    : tauxParDefaut[categorie];

  return {
    montantEconomie: Math.round(montant * taux.economie * 100) / 100,
    montantEpargne: Math.round(montant * taux.epargne * 100) / 100,
    montantActionSociale: Math.round(montant * taux.actionSociale * 100) / 100,
    montantDimeDeLaDime:
      taux.dimeDeLaDime !== null
        ? Math.round(montant * taux.dimeDeLaDime * 100) / 100
        : null,
    montantCaisse: Math.round(montant * taux.caisse * 100) / 100,
    montantFondsDedie: Math.round(montant * taux.fondsDedie * 100) / 100,
  };
}

export function getTauxParDefaut(categorie: CategorieTransaction): TauxRepartitionConfig {
  return { ...tauxParDefaut[categorie] };
}

export function verifierCoherenceRepartition(
  montant: number,
  resultat: ResultatRepartition
): boolean {
  const total =
    resultat.montantEconomie +
    resultat.montantEpargne +
    resultat.montantActionSociale +
    (resultat.montantDimeDeLaDime ?? 0) +
    resultat.montantCaisse +
    resultat.montantFondsDedie;

  return Math.abs(total - montant) < 0.01;
}

export function calculerMontantNet(
  montantBrut: number,
  depensesCulte: number
): number {
  const net = montantBrut - depensesCulte;
  return Math.max(0, Math.round(net * 100) / 100);
}

export function calculerRepartitionAvecDepenses(
  montantBrut: number,
  categorie: CategorieTransaction,
  depensesCulte: number,
  tauxCustom?: Partial<Record<CategorieTransaction, Partial<TauxRepartitionConfig>>>
): { montantNet: number; totalDepensesCulte: number; repartition: ResultatRepartition } {
  const montantNet = calculerMontantNet(montantBrut, depensesCulte);
  const repartition = calculerRepartition(montantNet, categorie, tauxCustom);

  return {
    montantNet,
    totalDepensesCulte: Math.round(depensesCulte * 100) / 100,
    repartition,
  };
}
