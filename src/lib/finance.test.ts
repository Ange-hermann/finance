import { describe, it, expect } from "vitest";
import {
  calculerRepartition,
  verifierCoherenceRepartition,
  getTauxParDefaut,
} from "@/lib/finance";
import { CategorieTransaction } from "@/generated/prisma";

describe("calculerRepartition", () => {
  it("calcule correctement la répartition pour OFFRANDE", () => {
    const resultat = calculerRepartition(100000, CategorieTransaction.OFFRANDE);
    expect(resultat.montantEconomie).toBe(10000);
    expect(resultat.montantEpargne).toBe(10000);
    expect(resultat.montantActionSociale).toBe(10000);
    expect(resultat.montantDimeDeLaDime).toBeNull();
    expect(resultat.montantCaisse).toBe(70000);
    expect(resultat.montantFondsDedie).toBe(0);
  });

  it("calcule correctement la répartition pour DIME", () => {
    const resultat = calculerRepartition(100000, CategorieTransaction.DIME);
    expect(resultat.montantEconomie).toBe(10000);
    expect(resultat.montantEpargne).toBe(10000);
    expect(resultat.montantActionSociale).toBe(10000);
    expect(resultat.montantDimeDeLaDime).toBe(10000);
    expect(resultat.montantCaisse).toBe(60000);
    expect(resultat.montantFondsDedie).toBe(0);
  });

  it("calcule correctement la répartition pour CONSTRUCTION (fonds dédié)", () => {
    const resultat = calculerRepartition(100000, CategorieTransaction.CONSTRUCTION);
    expect(resultat.montantEconomie).toBe(0);
    expect(resultat.montantEpargne).toBe(0);
    expect(resultat.montantActionSociale).toBe(0);
    expect(resultat.montantDimeDeLaDime).toBeNull();
    expect(resultat.montantCaisse).toBe(0);
    expect(resultat.montantFondsDedie).toBe(100000);
  });

  it("calcule correctement la répartition pour DON_SPECIAL (identique à OFFRANDE)", () => {
    const resultat = calculerRepartition(50000, CategorieTransaction.DON_SPECIAL);
    expect(resultat.montantEconomie).toBe(5000);
    expect(resultat.montantEpargne).toBe(5000);
    expect(resultat.montantActionSociale).toBe(5000);
    expect(resultat.montantCaisse).toBe(35000);
  });

  it("calcule correctement la répartition pour PROJET", () => {
    const resultat = calculerRepartition(50000, CategorieTransaction.PROJET);
    expect(resultat.montantEconomie).toBe(5000);
    expect(resultat.montantCaisse).toBe(35000);
  });

  it("calcule correctement la répartition pour AUTRE", () => {
    const resultat = calculerRepartition(50000, CategorieTransaction.AUTRE);
    expect(resultat.montantEconomie).toBe(5000);
    expect(resultat.montantCaisse).toBe(35000);
  });

  it("lève une erreur pour un montant négatif", () => {
    expect(() => calculerRepartition(-100, CategorieTransaction.OFFRANDE)).toThrow(
      "Le montant ne peut pas être négatif"
    );
  });

  it("gère un montant de 0", () => {
    const resultat = calculerRepartition(0, CategorieTransaction.OFFRANDE);
    expect(resultat.montantEconomie).toBe(0);
    expect(resultat.montantCaisse).toBe(0);
  });

  it("accepte des taux personnalisés", () => {
    const tauxCustom = {
      OFFRANDE: { economie: 0.20, caisse: 0.60 },
    };
    const resultat = calculerRepartition(100000, CategorieTransaction.OFFRANDE, tauxCustom);
    expect(resultat.montantEconomie).toBe(20000);
    expect(resultat.montantCaisse).toBe(60000);
    expect(resultat.montantEpargne).toBe(10000);
    expect(resultat.montantActionSociale).toBe(10000);
  });
});

describe("verifierCoherenceRepartition", () => {
  it("valide la cohérence pour OFFRANDE", () => {
    const resultat = calculerRepartition(100000, CategorieTransaction.OFFRANDE);
    expect(verifierCoherenceRepartition(100000, resultat)).toBe(true);
  });

  it("valide la cohérence pour DIME", () => {
    const resultat = calculerRepartition(100000, CategorieTransaction.DIME);
    expect(verifierCoherenceRepartition(100000, resultat)).toBe(true);
  });

  it("valide la cohérence pour CONSTRUCTION", () => {
    const resultat = calculerRepartition(100000, CategorieTransaction.CONSTRUCTION);
    expect(verifierCoherenceRepartition(100000, resultat)).toBe(true);
  });

  it("détecte une incohérence", () => {
    const resultat = {
      montantEconomie: 5000,
      montantEpargne: 5000,
      montantActionSociale: 5000,
      montantDimeDeLaDime: null,
      montantCaisse: 70000,
      montantFondsDedie: 0,
    };
    expect(verifierCoherenceRepartition(100000, resultat)).toBe(false);
  });
});

describe("getTauxParDefaut", () => {
  it("retourne les taux par défaut pour OFFRANDE", () => {
    const taux = getTauxParDefaut(CategorieTransaction.OFFRANDE);
    expect(taux.economie).toBe(0.10);
    expect(taux.caisse).toBe(0.70);
  });

  it("retourne les taux par défaut pour DIME", () => {
    const taux = getTauxParDefaut(CategorieTransaction.DIME);
    expect(taux.dimeDeLaDime).toBe(0.10);
    expect(taux.caisse).toBe(0.60);
  });

  it("retourne les taux par défaut pour CONSTRUCTION", () => {
    const taux = getTauxParDefaut(CategorieTransaction.CONSTRUCTION);
    expect(taux.fondsDedie).toBe(1.00);
    expect(taux.caisse).toBe(0);
  });
});
