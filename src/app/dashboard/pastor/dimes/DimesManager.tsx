"use client";

import { useState } from "react";
import { Wallet, CheckCircle, Clock, TrendingUp, Loader2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { formatMontant, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface DimesManagerProps {
  dimes: any[];
  totalDimes: number;
  totalRecu: number;
  dimeDeLaDime: number;
  partPasteurDons: number;
  dimesDistribuees: number;
  dimesNonDistribuees: any[];
  dimesParMois: any[];
}

export default function DimesManager({
  dimes,
  totalDimes,
  totalRecu,
  dimeDeLaDime,
  partPasteurDons,
  dimesDistribuees,
  dimesNonDistribuees,
  dimesParMois,
}: DimesManagerProps) {
  const [loading, setLoading] = useState(false);
  const [moisOuverts, setMoisOuverts] = useState<Set<string>>(new Set());

  const toggleMois = (moisKey: string) => {
    const nouveauSet = new Set(moisOuverts);
    if (nouveauSet.has(moisKey)) {
      nouveauSet.delete(moisKey);
    } else {
      nouveauSet.add(moisKey);
    }
    setMoisOuverts(nouveauSet);
  };

  const marquerDimeDeLaDimeRemise = async () => {
    if (dimesNonDistribuees.length === 0) {
      toast.info("Aucune dîme à marquer");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/dimes/distribuer", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Dîme de la dîme marquée comme remise : ${formatMontant(data.dimeDeLaDime)}`);
        // Recharger la page
        window.location.reload();
      } else {
        toast.error(data.error || "Erreur lors du marquage");
      }
    } catch (error) {
      toast.error("Erreur lors du marquage");
    }
    setLoading(false);
  };

  const marquerDimeDeLaDimeMoisRemise = async (moisKey: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/dimes/distribuer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moisKey }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Dîme de la dîme marquée comme remise pour ce mois`);
        window.location.reload();
      } else {
        toast.error(data.error || "Erreur lors du marquage");
      }
    } catch (error) {
      toast.error("Erreur lors du marquage");
    }
    setLoading(false);
  };

  // Mois en attente de marquage
  const moisEnAttente = dimesParMois.filter(m => !m.distribue);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-aeonik text-2xl sm:text-3xl font-bold text-blanc uppercase">
          Gestion des Dîmes
        </h1>
        <p className="text-blanc/50 text-sm mt-1">
          Gérez les dîmes reçues et la dîme de la dîme par mois
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-noir">
          <Wallet className="w-8 h-8 text-or mb-2" />
          <p className="text-blanc/50 text-sm">Total reçu (dîmes + dons)</p>
          <p className="font-aeonik text-2xl text-blanc">{formatMontant(totalRecu)}</p>
        </div>
        <div className="card-noir">
          <Wallet className="w-8 h-8 text-or mb-2" />
          <p className="text-blanc/50 text-sm">dont part sur les dons (10%)</p>
          <p className="font-aeonik text-2xl text-blanc">{formatMontant(partPasteurDons)}</p>
        </div>
        <div className="card-noir">
          <TrendingUp className="w-8 h-8 text-or mb-2" />
          <p className="text-blanc/50 text-sm">Dîme de la dîme à remettre (10%)</p>
          <p className="font-aeonik text-2xl text-blanc">{formatMontant(dimeDeLaDime)}</p>
        </div>
        <div className="card-noir">
          <CheckCircle className="w-8 h-8 text-or mb-2" />
          <p className="text-blanc/50 text-sm">Dîmes marquées remises</p>
          <p className="font-aeonik text-2xl text-blanc">{dimesDistribuees}</p>
        </div>
      </div>

      {/* Rappel pour les mois non marqués */}
      {moisEnAttente.length > 0 && (
        <div className="card-noir p-4 border-l-4 border-orange-500 bg-orange-500/10">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-aeonik text-lg text-blanc mb-1">Rappel : Dîme de la dîme à remettre</h4>
              <p className="text-blanc/70 text-sm mb-2">
                Certains mois n'ont pas encore leur dîme de la dîme marquée comme remise. N'oubliez pas de la remettre chaque mois selon les principes bibliques.
              </p>
              <div className="flex flex-wrap gap-2">
                {moisEnAttente.map(m => (
                  <span key={m.key} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded text-orange-300 text-xs">
                    <Clock className="w-3 h-3" />
                    {m.nomMois}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action: Marquer la dîme de la dîme comme remise */}
      <div className="card-noir p-6">
        <h3 className="font-aeonik text-xl text-blanc mb-4">Marquer la dîme de la dîme comme remise</h3>
        <p className="text-blanc/60 text-sm mb-4">
          La dîme de la dîme représente 10% du total des dîmes reçues. Ce montant fait partie de votre solde retirable — utilisez la page <a href="/dashboard/pastor/retrait" className="text-or hover:underline">Retrait</a> pour le verser sur votre mobile money, puis marquez ici qu'elle a été remise.
        </p>
        <button
          onClick={marquerDimeDeLaDimeRemise}
          disabled={loading || dimesNonDistribuees.length === 0}
          className="btn-or flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Marquage...
            </>
          ) : (
            `Marquer comme remise (${formatMontant(dimeDeLaDime)})`
          )}
        </button>
        {dimesNonDistribuees.length === 0 && (
          <p className="text-blanc/40 text-xs mt-2">Toutes les dîmes ont déjà été marquées comme remises</p>
        )}
      </div>

      {/* Dîmes par mois */}
      <div className="space-y-4">
        {dimesParMois.length === 0 ? (
          <div className="card-noir">
            <p className="text-blanc/50 text-center py-8">Aucune dîme reçue pour le moment</p>
          </div>
        ) : (
          dimesParMois.map((mois) => {
            const estOuvert = moisOuverts.has(mois.key);
            const estDistribue = mois.distribue;

            return (
              <div key={mois.key} className="card-noir">
                {/* En-tête du mois */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-or/5 transition-colors"
                  onClick={() => toggleMois(mois.key)}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-or" />
                    <div>
                      <p className="text-blanc font-aeonik text-lg capitalize">{mois.nomMois}</p>
                      <p className="text-blanc/50 text-sm">
                        {mois.dimes.length} dîme{mois.dimes.length > 1 ? 's' : ''} reçue{mois.dimes.length > 1 ? 's' : ''}
                        {mois.partDons > 0 && ` + ${formatMontant(mois.partDons)} sur les dons`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-blanc font-aeonik">{formatMontant(mois.total)}</p>
                      <p className="text-or text-sm">
                        → Dîme de la dîme: {formatMontant(mois.dimeDeLaDime)}
                        {mois.remis > 0 && ` (remis: ${formatMontant(mois.remis)})`}
                      </p>
                    </div>
                    {estDistribue ? (
                      <span title="Remise"><CheckCircle className="w-6 h-6 text-green-400" /></span>
                    ) : (
                      <span title="Non remis"><Clock className="w-6 h-6 text-orange-400" /></span>
                    )}
                    {estOuvert ? (
                      <ChevronUp className="w-5 h-5 text-blanc/50" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-blanc/50" />
                    )}
                  </div>
                </div>

                {/* Détails du mois (transactions) */}
                {estOuvert && (
                  <div className="border-t border-or/10 p-4 space-y-4">
                    {/* Résumé du mois */}
                    <div className="bg-noir-card p-4 rounded-lg border border-or/10">
                      <h4 className="font-aeonik text-blanc mb-3">Résumé du mois</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-blanc/50 text-xs">Dîmes reçues</p>
                          <p className="text-blanc font-aeonik text-lg">
                            {formatMontant(mois.dimes.reduce((s: number, d: any) => s + Number(d.montant), 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-blanc/50 text-xs">Part sur les dons</p>
                          <p className="text-blanc font-aeonik text-lg">{formatMontant(mois.partDons)}</p>
                        </div>
                        <div>
                          <p className="text-blanc/50 text-xs">Dîme de la dîme (10%)</p>
                          <p className="text-or font-aeonik text-lg">{formatMontant(mois.dimeDeLaDime)}</p>
                        </div>
                        <div>
                          <p className="text-blanc/50 text-xs">Remis</p>
                          <p className="text-green-400 font-aeonik text-lg">{formatMontant(mois.remis)}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-or/10 flex items-center justify-between">
                        <span className={`text-sm ${estDistribue ? 'text-green-400' : 'text-orange-400'}`}>
                          {estDistribue ? '✓ Remis' : '○ En attente de remise'}
                        </span>
                        {!estDistribue && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              marquerDimeDeLaDimeMoisRemise(mois.key);
                            }}
                            disabled={loading}
                            className="btn-or text-xs px-3 py-1"
                          >
                            Marquer comme remis
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Transactions du mois */}
                    <div>
                      <p className="text-blanc/60 text-sm mb-3">Transactions du mois ({mois.dimes.length})</p>
                      <div className="space-y-2">
                        {mois.dimes.map((dime: any) => {
                          const estDistribuee = !!dime.repartition;
                          return (
                            <div
                              key={dime.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                estDistribuee
                                  ? "bg-or/5 border-or/20"
                                  : "bg-noir-card border-or/10"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-or" />
                                <div>
                                  <p className="text-blanc font-aeonik">{formatMontant(Number(dime.montant))}</p>
                                  <p className="text-blanc/50 text-sm">
                                    {dime.contributeur?.name || "Anonyme"} • {formatDate(dime.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {estDistribuee ? (
                                  <span title="Remis"><CheckCircle className="w-4 h-4 text-green-400" /></span>
                                ) : (
                                  <span title="Non remis"><Clock className="w-4 h-4 text-orange-400" /></span>
                                )}
                                <span className="text-xs text-blanc/50">{dime.mode}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}