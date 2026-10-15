"use client";

import { useState, useMemo } from "react";
import { formatMontant, formatDate } from "@/lib/utils";
import { Calendar, TrendingUp, TrendingDown, Scale, FileDown } from "lucide-react";
import { toast } from "sonner";

interface Tx {
  id: string;
  montant: number;
  categorie: string;
  mode: string;
  referencePaiement: string | null;
  createdAt: string;
  contributeur: { nom: string | null } | null;
  agent: { nom: string } | null;
  repartition: {
    montantEconomie: number;
    montantEpargne: number;
    montantActionSociale: number;
    montantDimeDeLaDime: number | null;
    montantCaisse: number;
    montantFondsDedie: number;
  } | null;
}

interface Dep {
  id: string;
  type: string;
  categorie: string;
  sourceFonds: string;
  description: string;
  montant: number;
  dateDepense: string;
  statutPaiement: string | null;
  beneficiaire: { nom: string } | null;
  agent: { nom: string } | null;
}

type Periode = "jour" | "semaine" | "mois" | "periode";

const SOURCE_LABELS: Record<string, string> = {
  CAISSE: "Caisse",
  ECONOMIE: "Économie",
  EPARGNE: "Épargne",
  CONSTRUCTION: "Construction",
  ACTION_SOCIALE: "Action sociale",
  PASTEUR: "Pasteur",
};

function debutSemaine(d: Date) {
  const lundi = new Date(d);
  lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi
  lundi.setHours(0, 0, 0, 0);
  return lundi;
}

export default function RapportDetaille({
  transactions,
  depenses,
}: {
  transactions: Tx[];
  depenses: Dep[];
}) {
  const aujourd = new Date().toISOString().slice(0, 10);
  const [periode, setPeriode] = useState<Periode>("jour");
  const [dateJour, setDateJour] = useState(aujourd);
  const [dateMois, setDateMois] = useState(aujourd.slice(0, 7));
  const [dateDebut, setDateDebut] = useState(aujourd);
  const [dateFin, setDateFin] = useState(aujourd);

  // Calcul de l'intervalle [debut, fin] selon le mode choisi
  const [debut, fin] = useMemo(() => {
    if (periode === "jour") {
      const d = new Date(dateJour + "T00:00:00");
      const f = new Date(dateJour + "T23:59:59");
      return [d, f];
    }
    if (periode === "semaine") {
      const d = debutSemaine(new Date(dateJour + "T00:00:00"));
      const f = new Date(d);
      f.setDate(d.getDate() + 6);
      f.setHours(23, 59, 59, 999);
      return [d, f];
    }
    if (periode === "mois") {
      const [a, m] = dateMois.split("-").map(Number);
      return [new Date(a, m - 1, 1), new Date(a, m, 0, 23, 59, 59, 999)];
    }
    const d = new Date(dateDebut + "T00:00:00");
    const f = new Date(dateFin + "T23:59:59");
    return [d, f];
  }, [periode, dateJour, dateMois, dateDebut, dateFin]);

  const txFiltres = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= debut && d <= fin;
      }),
    [transactions, debut, fin]
  );

  const depFiltrees = useMemo(
    () =>
      depenses.filter((d) => {
        const dd = new Date(d.dateDepense);
        return dd >= debut && dd <= fin;
      }),
    [depenses, debut, fin]
  );

  const totalRecettes = txFiltres.reduce((s, t) => s + t.montant, 0);
  const totalDepenses = depFiltrees.reduce((s, d) => s + d.montant, 0);

  const parCategorie = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txFiltres) map[t.categorie] = (map[t.categorie] || 0) + t.montant;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [txFiltres]);

  const labelPeriode = `${formatDate(debut.toISOString())} → ${formatDate(fin.toISOString())}`;

  const [exporting, setExporting] = useState(false);
  const exporterPDF = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export/rapport/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode: { debut: debut.toISOString(), fin: fin.toISOString(), label: labelPeriode },
          transactions: txFiltres,
          depenses: depFiltrees,
          resume: {
            recettes: totalRecettes,
            depenses: totalDepenses,
            net: totalRecettes - totalDepenses,
            parCategorie,
          },
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-detaille-${debut.toISOString().slice(0, 10)}_${fin.toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport PDF téléchargé");
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card-noir">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-or" />
          <h3 className="font-aeonik text-xl text-blanc">Rapport détaillé</h3>
        </div>
        <button
          onClick={exporterPDF}
          disabled={exporting || (txFiltres.length === 0 && depFiltrees.length === 0)}
          className="btn-outline-or text-sm flex items-center gap-2 disabled:opacity-40"
        >
          <FileDown className="w-4 h-4" />
          {exporting ? "Génération..." : "Exporter PDF"}
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["jour", "semaine", "mois", "periode"] as Periode[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
              periode === p
                ? "bg-or/20 border-or text-or"
                : "bg-noir-card border-or/10 text-blanc/60 hover:border-or/30"
            }`}
          >
            {p === "jour" ? "Jour" : p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : "Période"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        {(periode === "jour" || periode === "semaine") && (
          <div>
            <label className="label-or">
              {periode === "jour" ? "Jour" : "Un jour de la semaine"}
            </label>
            <input
              type="date"
              value={dateJour}
              onChange={(e) => setDateJour(e.target.value)}
              className="input-noir"
            />
          </div>
        )}
        {periode === "mois" && (
          <div>
            <label className="label-or">Mois</label>
            <input
              type="month"
              value={dateMois}
              onChange={(e) => setDateMois(e.target.value)}
              className="input-noir"
            />
          </div>
        )}
        {periode === "periode" && (
          <>
            <div>
              <label className="label-or">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="input-noir"
              />
            </div>
            <div>
              <label className="label-or">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="input-noir"
              />
            </div>
          </>
        )}
        <p className="text-blanc/40 text-xs ml-auto">{labelPeriode}</p>
      </div>

      {/* Résumé de la période */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-noir-soft rounded-xl p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <p className="text-blanc/50 text-xs">Recettes</p>
          </div>
          <p className="font-aeonik text-lg text-green-400 mt-1">{formatMontant(totalRecettes)}</p>
          <p className="text-blanc/30 text-xs">{txFiltres.length} transaction(s)</p>
        </div>
        <div className="bg-noir-soft rounded-xl p-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <p className="text-blanc/50 text-xs">Dépenses</p>
          </div>
          <p className="font-aeonik text-lg text-red-400 mt-1">{formatMontant(totalDepenses)}</p>
          <p className="text-blanc/30 text-xs">{depFiltrees.length} dépense(s)</p>
        </div>
        <div className="bg-noir-soft rounded-xl p-3 border border-or/20">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-or" />
            <p className="text-blanc/50 text-xs">Net</p>
          </div>
          <p className={`font-aeonik text-lg mt-1 ${totalRecettes - totalDepenses >= 0 ? "text-or" : "text-red-400"}`}>
            {formatMontant(totalRecettes - totalDepenses)}
          </p>
        </div>
      </div>

      {/* Répartition par catégorie */}
      {parCategorie.length > 0 && (
        <div className="mb-6">
          <p className="text-blanc/50 text-xs mb-2">Recettes par catégorie</p>
          <div className="flex flex-wrap gap-2">
            {parCategorie.map(([cat, montant]) => (
              <span key={cat} className="text-xs px-3 py-1.5 rounded-lg bg-or/10 text-or">
                {cat} : {formatMontant(montant)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transactions détaillées */}
      <p className="text-blanc/60 text-sm font-medium mb-2">Transactions reçues</p>
      {txFiltres.length === 0 ? (
        <p className="text-blanc/40 text-sm py-4 text-center">Aucune transaction sur cette période</p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-or/70 text-left border-b border-or/10">
                <th className="pb-2 pr-3 whitespace-nowrap">Date</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Montant</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Catégorie</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Fidèle</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Mode</th>
                <th className="pb-2 whitespace-nowrap">Répartition</th>
              </tr>
            </thead>
            <tbody>
              {txFiltres.map((t) => (
                <tr key={t.id} className="border-b border-or/5 align-top">
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                  <td className="py-2.5 pr-3 text-blanc font-medium whitespace-nowrap">{formatMontant(t.montant)}</td>
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{t.categorie}</td>
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{t.contributeur?.nom || "Anonyme"}</td>
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{t.mode}</td>
                  <td className="py-2.5 text-blanc/40 text-xs min-w-[200px]">
                    {t.repartition ? (
                      <>
                        {t.repartition.montantCaisse > 0 && `Caisse ${formatMontant(t.repartition.montantCaisse)} • `}
                        {t.repartition.montantEconomie > 0 && `Éco ${formatMontant(t.repartition.montantEconomie)} • `}
                        {t.repartition.montantEpargne > 0 && `Épar ${formatMontant(t.repartition.montantEpargne)} • `}
                        {t.repartition.montantActionSociale > 0 && `Social ${formatMontant(t.repartition.montantActionSociale)} • `}
                        {t.repartition.montantDimeDeLaDime ? `Dîme pasteur ${formatMontant(t.repartition.montantDimeDeLaDime)} • ` : ""}
                        {t.repartition.montantFondsDedie > 0 ? `Construction ${formatMontant(t.repartition.montantFondsDedie)}` : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dépenses détaillées */}
      <p className="text-blanc/60 text-sm font-medium mb-2">Dépenses</p>
      {depFiltrees.length === 0 ? (
        <p className="text-blanc/40 text-sm py-4 text-center">Aucune dépense sur cette période</p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-or/70 text-left border-b border-or/10">
                <th className="pb-2 pr-3 whitespace-nowrap">Date</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Montant</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Catégorie</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Description</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Fonds</th>
                <th className="pb-2 pr-3 whitespace-nowrap">Bénéficiaire</th>
                <th className="pb-2 whitespace-nowrap">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {depFiltrees.map((d) => (
                <tr key={d.id} className="border-b border-or/5">
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{formatDate(d.dateDepense)}</td>
                  <td className="py-2.5 pr-3 text-red-400 font-medium whitespace-nowrap">-{formatMontant(d.montant)}</td>
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{d.categorie}</td>
                  <td className="py-2.5 pr-3 text-blanc/60 max-w-[200px] truncate">{d.description}</td>
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{SOURCE_LABELS[d.sourceFonds] || d.sourceFonds}</td>
                  <td className="py-2.5 pr-3 text-blanc/60 whitespace-nowrap">{d.beneficiaire?.nom || "—"}</td>
                  <td className="py-2.5 text-xs whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-lg ${
                        d.statutPaiement === "PAYE"
                          ? "bg-green-500/10 text-green-400"
                          : d.statutPaiement === "ECHOUE"
                            ? "bg-red-500/10 text-red-400"
                            : d.statutPaiement
                              ? "bg-or/10 text-or"
                              : "bg-blanc/5 text-blanc/40"
                      }`}
                    >
                      {d.statutPaiement === "PAYE" ? "Payé" : d.statutPaiement === "ECHOUE" ? "Échoué" : d.statutPaiement || "Manuel"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
