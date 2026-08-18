"use client";

import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { formatMontant, formatDate } from "@/lib/utils";

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

interface Transaction {
  id: string;
  montant: number;
  categorie: string;
  mode?: string;
  createdAt: string;
  statut: string;
  contributeur?: { nom: string | null } | null;
  agent?: { nom: string | null } | null;
  [key: string]: any;
}

export default function TransactionsParMois({
  transactions,
  showMode = false,
  showAgent = false,
  showStatut = true,
  title = "Transactions par mois",
  emptyMessage = "Aucune transaction pour le moment",
}: {
  transactions: Transaction[];
  showMode?: boolean;
  showAgent?: boolean;
  showStatut?: boolean;
  title?: string;
  emptyMessage?: string;
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
        <h3 className="font-display text-xl text-blanc mb-4">{title}</h3>
        <p className="text-blanc/40 text-sm text-center py-8">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card-noir">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h3 className="font-display text-xl text-blanc">{title}</h3>
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
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-or/70 text-left border-b border-or/10">
                  <th className="pb-3 pr-4 whitespace-nowrap">Date</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Montant</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Catégorie</th>
                  {showMode && <th className="pb-3 pr-4 whitespace-nowrap">Mode</th>}
                  {showAgent && <th className="pb-3 pr-4 whitespace-nowrap">Agent</th>}
                  <th className="pb-3 pr-4 whitespace-nowrap">Contributeur</th>
                  {showStatut && <th className="pb-3 whitespace-nowrap">Statut</th>}
                </tr>
              </thead>
              <tbody>
                {selectedGroup.items.map((t) => (
                  <tr key={t.id} className="border-b border-or/5 hover:bg-or/5">
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="py-3 pr-4 text-blanc font-medium whitespace-nowrap">{formatMontant(Number(t.montant))}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.categorie}</td>
                    {showMode && <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.mode}</td>}
                    {showAgent && <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.agent?.nom || "—"}</td>}
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.contributeur?.nom || "Anonyme"}</td>
                    {showStatut && (
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          t.statut === "VALIDE" ? "bg-green-500/10 text-green-400" :
                          t.statut === "EN_ATTENTE" ? "bg-or/10 text-or" :
                          "bg-red-500/10 text-red-400"
                        }`}>
                          {t.statut}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-blanc/40 text-sm text-center py-8">Aucune transaction</p>
      )}
    </div>
  );
}
