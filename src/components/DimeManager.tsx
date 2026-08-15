"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Check, X, Calendar, Clock, AlertCircle } from "lucide-react";

interface Dime {
  id: string;
  mois: number;
  moisNom: string;
  annee: number;
  montant: number;
  dateVersement: string | null;
  statut: "NON_VERSE" | "VERSE";
  estMoisActuel: boolean;
  estPasse: boolean;
}

interface Resume {
  moisActuel: Dime | null;
  totalMoisPasses: Dime[];
  totalVerse: number;
  totalRestant: number;
}

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function DimeManager() {
  const [data, setData] = useState<{ dimes: Dime[]; resume: Resume } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDimes = async () => {
    setLoading(true);
    const res = await fetch("/api/dimes");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchDimes();
  }, []);

  const handleStatutChange = async (dime: Dime, statut: "VERSE" | "NON_VERSE") => {
    setUpdatingId(dime.id);
    const res = await fetch("/api/dimes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mois: dime.mois, annee: dime.annee, statut }),
    });

    if (res.ok) {
      toast.success(statut === "VERSE" ? "Dîme marquée comme donnée" : "Dîme marquée non donnée");
      fetchDimes();
    } else {
      toast.error("Erreur");
    }
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-or" />
      </div>
    );
  }

  if (!data || data.dimes.length === 0) {
    return (
      <p className="text-blanc/40 text-sm text-center py-8">
        Aucune dîme à afficher. Les dîmes apparaissent automatiquement quand des transactions de type DÎME sont validées.
      </p>
    );
  }

  const { resume } = data;

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble : 3 cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mois en cours */}
        <div className="card-noir border-or/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-or" />
            <p className="text-blanc/50 text-xs">Ce mois-ci</p>
          </div>
          {resume.moisActuel ? (
            <>
              <p className="font-display text-lg text-blanc">
                {resume.moisActuel.moisNom} {resume.moisActuel.annee}
              </p>
              <p className="font-display text-xl text-or mt-1 whitespace-nowrap">
                {resume.moisActuel.montant.toLocaleString("fr-FR")}
                <span className="text-blanc/40 text-xs ml-1">FCFA</span>
              </p>
              <div className="mt-2">
                {resume.moisActuel.statut === "VERSE" ? (
                  <span className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400">
                    ✓ Donnée
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-lg bg-or/10 text-or">
                    En attente
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-blanc/40 text-sm py-4">Aucune dîme ce mois</p>
          )}
        </div>

        {/* Total donné */}
        <div className="card-noir border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-green-400" />
            <p className="text-blanc/50 text-xs">Total donné (à ce jour)</p>
          </div>
          <p className="font-display text-xl text-green-400 mt-1 whitespace-nowrap">
            {resume.totalVerse.toLocaleString("fr-FR")}
            <span className="text-blanc/40 text-xs ml-1">FCFA</span>
          </p>
        </div>

        {/* Total restant */}
        <div className="card-noir border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-blanc/50 text-xs">Total restant (à ce jour)</p>
          </div>
          <p className="font-display text-xl text-red-400 mt-1 whitespace-nowrap">
            {resume.totalRestant.toLocaleString("fr-FR")}
            <span className="text-blanc/40 text-xs ml-1">FCFA</span>
          </p>
        </div>
      </div>

      {/* Mois en cours - détail */}
      {resume.moisActuel && (
        <div className="card-noir">
          <h3 className="font-display text-lg text-blanc mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-or" />
            Mois en cours
          </h3>
          <DimeRow dime={resume.moisActuel} onUpdate={handleStatutChange} updating={updatingId === resume.moisActuel.id} />
        </div>
      )}

      {/* Mois passés */}
      {resume.totalMoisPasses.length > 0 && (
        <div className="card-noir">
          <h3 className="font-display text-lg text-blanc mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-or" />
            Mois passés
          </h3>
          <div className="space-y-3">
            {resume.totalMoisPasses.map((d) => (
              <DimeRow key={d.id} dime={d} onUpdate={handleStatutChange} updating={updatingId === d.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DimeRow({
  dime,
  onUpdate,
  updating,
}: {
  dime: Dime;
  onUpdate: (dime: Dime, statut: "VERSE" | "NON_VERSE") => void;
  updating: boolean;
}) {
  return (
    <div
      className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${
        dime.statut === "VERSE"
          ? "border-green-500/20 bg-green-500/5"
          : "border-or/20 bg-or/5"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-blanc font-medium">
          {dime.moisNom} {dime.annee}
        </p>
        <p className="text-blanc/40 text-xs mt-1">
          {dime.dateVersement
            ? `Donnée le ${new Date(dime.dateVersement).toLocaleDateString("fr-FR")}`
            : "Pas encore donnée"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-lg text-blanc whitespace-nowrap">
          {dime.montant.toLocaleString("fr-FR")}
          <span className="text-blanc/40 text-xs ml-1">FCFA</span>
        </p>
        <button
          onClick={() => onUpdate(dime, dime.statut === "VERSE" ? "NON_VERSE" : "VERSE")}
          disabled={updating}
          className={`text-xs mt-1 whitespace-nowrap ${
            dime.statut === "VERSE"
              ? "text-red-400 hover:text-red-300"
              : "text-green-400 hover:text-green-300"
          }`}
        >
          {updating ? "..." : dime.statut === "VERSE" ? "Marquer non donnée" : "Marquer donnée"}
        </button>
      </div>
    </div>
  );
}
