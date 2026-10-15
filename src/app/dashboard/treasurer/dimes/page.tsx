import { getSuiviDimeDeLaDime } from "@/lib/dimes";
import { formatMontant } from "@/lib/utils";
import { Calendar, CheckCircle, Clock, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DimesPage() {
  const suivi = await getSuiviDimeDeLaDime();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-aeonik text-2xl sm:text-3xl font-bold text-blanc uppercase">Dîme de la dîme</h1>
        <p className="text-blanc/50 text-sm mt-1">
          10% détenus par le pasteur — le statut se met à jour automatiquement quand il la remet
        </p>
      </div>

      {/* Dîme de la dîme — chez le pasteur */}
      <div className="card-noir p-6">
        <h3 className="font-aeonik text-xl text-blanc mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-or" />
          Chez le pasteur
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-noir-card rounded-lg p-4 border border-or/10">
            <p className="text-blanc/50 text-xs">Total dû (10%)</p>
            <p className="font-aeonik text-xl text-blanc">{formatMontant(suivi.dimeDeLaDimeDue)}</p>
          </div>
          <div className="bg-noir-card rounded-lg p-4 border border-green-500/20">
            <p className="text-blanc/50 text-xs">Déjà remis</p>
            <p className="font-aeonik text-xl text-green-400">{formatMontant(suivi.dejaRemis)}</p>
          </div>
          <div className="bg-noir-card rounded-lg p-4 border border-or/30">
            <p className="text-blanc/50 text-xs">Chez le pasteur (à remettre)</p>
            <p className="font-aeonik text-xl text-or">{formatMontant(suivi.dimeDeLaDimeRestante)}</p>
          </div>
        </div>

        {suivi.moisArray.length === 0 ? (
          <p className="text-blanc/40 text-sm">Aucune dîme de la dîme pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {suivi.moisArray.map((mois) => (
              <div
                key={mois.key}
                className="flex items-center justify-between p-3 rounded-lg bg-noir-card border border-or/10"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-or" />
                  <p className="text-blanc text-sm capitalize">{mois.nomMois}</p>
                </div>
                <div className="text-right">
                  <p className="text-or font-aeonik text-sm">{formatMontant(mois.dimeDeLaDime)}</p>
                  {mois.remis > 0 || mois.distribue ? (
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-green-500/10 text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Remis {mois.remis > 0 && mois.remis < mois.dimeDeLaDime ? `(${formatMontant(mois.remis)})` : ""}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      En attente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
