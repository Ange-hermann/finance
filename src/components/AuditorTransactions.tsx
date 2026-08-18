"use client";

import { useState, useMemo } from "react";
import { formatMontant, formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

interface Annotation {
  id: string;
  commentaire: string;
  createdAt: string;
  auteur: { nom: string };
}

interface Transaction {
  id: string;
  montant: number;
  categorie: string;
  mode: string;
  createdAt: string;
  statut: string;
  agent?: { nom: string | null } | null;
  contributeur?: { nom: string | null } | null;
  repartition?: {
    montantEconomie: number;
    montantEpargne: number;
    montantActionSociale: number;
    montantCaisse: number;
  } | null;
  annotations: Annotation[];
}

export default function AuditorTransactions({
  transactions,
  renderAnnotationForm,
}: {
  transactions: Transaction[];
  renderAnnotationForm: (transactionId: string) => React.ReactNode;
}) {
  const groupes = useMemo(() => {
    const map: Record<string, { mois: number; annee: number; items: Transaction[]; total: number }> = {};
    for (const t of transactions) {
      const d = new Date(t.createdAt);
      const mois = d.getMonth();
      const annee = d.getFullYear();
      const key = `${annee}-${mois}`;
      if (!map[key]) map[key] = { mois, annee, items: [], total: 0 };
      map[key].items.push(t);
      map[key].total += Number(t.montant);
    }
    return Object.values(map).sort((a, b) => b.annee - a.annee || b.mois - a.mois);
  }, [transactions]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const selectedGroup = selectedKey
    ? groupes.find((g) => `${g.annee}-${g.mois}` === selectedKey)
    : groupes[0];

  if (transactions.length === 0) {
    return (
      <div className="card-noir">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Transactions à auditer</h3>
        </div>
        <p className="text-blanc/40 text-sm text-center py-8">Aucune transaction pour le moment</p>
      </div>
    );
  }

  return (
    <div className="card-noir">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Transactions à auditer</h3>
        </div>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="input-noir max-w-xs"
        >
          {groupes.map((g) => (
            <option key={`${g.annee}-${g.mois}`} value={`${g.annee}-${g.mois}`}>
              {MOIS_NOMS[g.mois]} {g.annee} — {formatMontant(g.total)} ({g.items.length})
            </option>
          ))}
        </select>
      </div>

      {selectedGroup ? (
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-or/10">
            <h4 className="font-display text-lg text-or">
              {MOIS_NOMS[selectedGroup.mois]} {selectedGroup.annee}
            </h4>
            <p className="font-display text-sm text-blanc whitespace-nowrap">
              Total : <span className="text-or">{formatMontant(selectedGroup.total)}</span>
              <span className="text-blanc/40 text-xs ml-2">({selectedGroup.items.length} transactions)</span>
            </p>
          </div>
          <div className="space-y-4">
            {selectedGroup.items.map((t) => (
              <div key={t.id} className="border border-or/10 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-blanc font-medium">{formatMontant(Number(t.montant))} — {t.categorie}</p>
                    <p className="text-blanc/40 text-xs mt-1">
                      {formatDate(t.createdAt)} • Mode: {t.mode} • Agent: {t.agent?.nom || "N/A"}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs ${
                    t.statut === "VALIDE" ? "bg-green-500/10 text-green-400" :
                    t.statut === "EN_ATTENTE" ? "bg-or/10 text-or" :
                    "bg-red-500/10 text-red-400"
                  }`}>
                    {t.statut}
                  </span>
                </div>

                {t.repartition && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                    <div className="text-blanc/50">Économie: <span className="text-blanc">{formatMontant(Number(t.repartition.montantEconomie))}</span></div>
                    <div className="text-blanc/50">Épargne: <span className="text-blanc">{formatMontant(Number(t.repartition.montantEpargne))}</span></div>
                    <div className="text-blanc/50">Action sociale: <span className="text-blanc">{formatMontant(Number(t.repartition.montantActionSociale))}</span></div>
                    <div className="text-blanc/50">Caisse: <span className="text-blanc">{formatMontant(Number(t.repartition.montantCaisse))}</span></div>
                  </div>
                )}

                {t.annotations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {t.annotations.map((ann) => (
                      <div key={ann.id} className="bg-or/5 rounded-lg p-3 text-sm">
                        <p className="text-blanc/70">{ann.commentaire}</p>
                        <p className="text-blanc/30 text-xs mt-1">— {ann.auteur.nom}, {formatDate(ann.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {renderAnnotationForm(t.id)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-blanc/40 text-sm text-center py-8">Aucune transaction</p>
      )}
    </div>
  );
}
