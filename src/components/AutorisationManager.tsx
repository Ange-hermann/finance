"use client";

import { useState, useEffect } from "react";
import { Check, X, Clock, AlertCircle } from "lucide-react";
import { formatMontant } from "@/lib/utils";
import { toast } from "sonner";

interface DemandeAutorisation {
  id: string;
  demandeurId: string;
  demandeurNom: string;
  sourceFonds: string;
  typeAction: string;
  montant: number;
  description: string;
  motif: string;
  statut: string;
  commentaire?: string;
  dateDemande: string;
  dateReponse?: string;
  approbateurId?: string;
  approbateurNom?: string;
  depenseId?: string;
}

export default function AutorisationManager() {
  const [demandes, setDemandes] = useState<DemandeAutorisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState<DemandeAutorisation | null>(null);
  const [commentaire, setCommentaire] = useState("");

  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      const response = await fetch("/api/demandes");
      const data = await response.json();
      setDemandes(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des demandes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprobation = async (id: string, statut: "APPROUVEE" | "REFUSEE") => {
    try {
      const response = await fetch(`/api/demandes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut, commentaire }),
      });

      if (response.ok) {
        toast.success(statut === "APPROUVEE" ? "Dépense approuvée" : "Dépense refusée");
        setCommentaire("");
        setSelectedDemande(null);
        fetchDemandes();
      } else {
        toast.error("Erreur lors du traitement de la demande");
      }
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleAnnulation = async (id: string) => {
    try {
      const response = await fetch(`/api/demandes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Demande annulée");
        fetchDemandes();
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
    }
  };

  const getSourceFondsLabel = (source: string) => {
    const labels: Record<string, string> = {
      CAISSE: "Petite Caisse",
      ECONOMIE: "Économie",
      EPARGNE: "Épargne",
      CONSTRUCTION: "Construction",
      ACTION_SOCIALE: "Action Sociale",
    };
    return labels[source] || source;
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "EN_ATTENTE":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      case "APPROUVEE":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
            <Check className="w-3 h-3" />
            Approuvée
          </span>
        );
      case "REFUSEE":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
            <X className="w-3 h-3" />
            Refusée
          </span>
        );
      default:
        return <span className="text-xs text-blanc/60">{statut}</span>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-blanc/40">Chargement...</div>;
  }

  const demandesEnAttente = demandes.filter(d => d.statut === "EN_ATTENTE");
  const demandesTraitees = demandes.filter(d => d.statut !== "EN_ATTENTE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-aeonik text-xl text-blanc">Demandes d'autorisation</h2>
        {demandesEnAttente.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-or/20 text-or text-sm">
            {demandesEnAttente.length} en attente
          </span>
        )}
      </div>

      {demandesEnAttente.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-aeonik text-lg text-or">En attente d'approbation</h3>
          {demandesEnAttente.map((demande) => (
            <div key={demande.id} className="card-noir p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatutBadge(demande.statut)}
                    <span className="text-sm text-blanc/40">
                      {new Date(demande.dateDemande).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <p className="font-aeonik text-base text-blanc mb-1">{demande.description}</p>
                  <p className="text-sm text-blanc/60 mb-2 italic">Motif: {demande.motif}</p>
                  <div className="flex items-center gap-4 text-sm text-blanc/60">
                    <span>Source: {getSourceFondsLabel(demande.sourceFonds)}</span>
                    <span>Montant: {formatMontant(demande.montant)}</span>
                    <span>Demandeur: {demande.demandeurNom}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDemande(demande)}
                    className="px-3 py-2 rounded-lg bg-or/10 text-or hover:bg-or/20 transition-all"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => handleAnnulation(demande.id)}
                    className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {demandesTraitees.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-aeonik text-lg text-blanc/60">Historique</h3>
          {demandesTraitees.map((demande) => (
            <div key={demande.id} className="card-noir p-4 opacity-75">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatutBadge(demande.statut)}
                    <span className="text-sm text-blanc/40">
                      {new Date(demande.dateDemande).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <p className="font-aeonik text-base text-blanc mb-1">{demande.description}</p>
                  <p className="text-sm text-blanc/60 mb-2 italic">Motif: {demande.motif}</p>
                  <div className="flex items-center gap-4 text-sm text-blanc/60">
                    <span>Source: {getSourceFondsLabel(demande.sourceFonds)}</span>
                    <span>Montant: {formatMontant(demande.montant)}</span>
                    <span>Demandeur: {demande.demandeurNom}</span>
                    {demande.approbateurNom && (
                      <span>Approbé par: {demande.approbateurNom}</span>
                    )}
                  </div>
                  {demande.commentaire && (
                    <p className="text-sm text-blanc/40 mt-2 italic">Commentaire: {demande.commentaire}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {demandes.length === 0 && (
        <div className="text-center py-8 text-blanc/40">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune demande d'autorisation</p>
        </div>
      )}

      {selectedDemande && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card-noir p-6 max-w-md w-full">
            <h3 className="font-aeonik text-xl text-blanc mb-4">Approuver la demande</h3>
            <div className="space-y-3 mb-4">
              <p className="text-blanc">{selectedDemande.description}</p>
              <p className="text-blanc/60 italic">Motif: {selectedDemande.motif}</p>
              <p className="text-blanc/60">Montant: {formatMontant(selectedDemande.montant)}</p>
              <p className="text-blanc/60">Source: {getSourceFondsLabel(selectedDemande.sourceFonds)}</p>
            </div>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Commentaire (optionnel)"
              className="w-full p-3 rounded-lg bg-noir-soft border border-or/30 text-blanc placeholder:text-blanc/40 focus:border-or focus:outline-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleApprobation(selectedDemande.id, "APPROUVEE")}
                className="flex-1 px-4 py-2 rounded-lg bg-or text-noir font-semibold hover:bg-or/90 transition-all"
              >
                Approuver
              </button>
              <button
                onClick={() => handleApprobation(selectedDemande.id, "REFUSEE")}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-blanc font-semibold hover:bg-red-600 transition-all"
              >
                Refuser
              </button>
              <button
                onClick={() => {
                  setSelectedDemande(null);
                  setCommentaire("");
                }}
                className="px-4 py-2 rounded-lg bg-noir-soft text-blanc hover:bg-noir-card transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}