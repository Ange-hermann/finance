"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Wallet, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatMontant } from "@/lib/utils";

const categories = [
  { value: "OFFRANDE", label: "Offrande", desc: "Contribution libre à l'œuvre de Dieu" },
  { value: "DIME", label: "Dîme", desc: "Dîme biblique (10% du revenu)" },
  { value: "CONSTRUCTION", label: "Construction", desc: "Don fléché pour la construction" },
  { value: "DON_SPECIAL", label: "Don spécial", desc: "Don exceptionnel pour un besoin précis" },
  { value: "PROJET", label: "Projet", desc: "Soutien à un projet spécifique" },
  { value: "AUTRE", label: "Autre", desc: "Autre type de contribution" },
];

export default function PayPage() {
  const params = useParams();
  const lienId = params.lienId as string;

  const [step, setStep] = useState<"categorie" | "montant" | "infos" | "paiement" | "succes">("categorie");
  const [categorie, setCategorie] = useState("");
  const [montant, setMontant] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [recuUrl, setRecuUrl] = useState("");

  const handleSelectCategorie = (cat: string) => {
    setCategorie(cat);
    setStep("montant");
  };

  const handleMontantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = parseFloat(montant);
    if (!montantNum || montantNum <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }
    setStep("infos");
  };

  const handlePaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montant: parseFloat(montant),
          categorie,
          lienId,
          contributeurNom: nom || undefined,
          contributeurTelephone: telephone || undefined,
          contributeurEmail: email || undefined,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.statut === "PAYE") {
        setRecuUrl(data.recuUrl || "");
        setStep("succes");
        toast.success("Paiement effectué avec succès !");
      } else {
        toast.error("Erreur lors du paiement");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = categories.find((c) => c.value === categorie);

  return (
    <div className="min-h-screen bg-gradient-noir flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Image src="/Logo.png" alt="Logo" width={56} height={56} className="rounded-xl mx-auto mb-4" style={{ width: "auto", height: "auto" }} />
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">
            Faire un <span className="text-or">don</span>
          </h1>
          <p className="text-blanc/50 text-sm mt-2">
            Aucun compte requis — paiement rapide et sécurisé
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["categorie", "montant", "infos", "paiement"].map((s, i) => {
            const stepIndex = ["categorie", "montant", "infos", "paiement"].indexOf(step);
            const isActive = i <= stepIndex;
            return (
              <div
                key={s}
                className={`h-1.5 w-8 sm:w-12 rounded-full transition-all ${
                  isActive ? "bg-or" : "bg-blanc/10"
                }`}
              />
            );
          })}
        </div>

        {/* Step: Categorie */}
        {step === "categorie" && (
          <div className="card-noir space-y-3 animate-fade-in">
            <h2 className="font-display text-xl text-blanc mb-4">Choisissez une catégorie</h2>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleSelectCategorie(cat.value)}
                className="w-full text-left p-4 rounded-xl border border-or/20 hover:border-or hover:bg-or/5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blanc font-medium">{cat.label}</p>
                    <p className="text-blanc/40 text-sm">{cat.desc}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-or/50 group-hover:text-or transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: Montant */}
        {step === "montant" && (
          <form onSubmit={handleMontantSubmit} className="card-noir space-y-5 animate-fade-in">
            <div>
              <p className="text-or text-sm mb-1">Catégorie sélectionnée</p>
              <p className="text-blanc font-medium">{selectedCat?.label}</p>
            </div>
            <div>
              <label className="label-or">Montant (FCFA)</label>
              <input
                type="number"
                autoFocus
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="10000"
                min="1"
                className="input-noir w-full text-2xl font-display"
              />
              {montant && parseFloat(montant) > 0 && (
                <p className="text-or/70 text-sm mt-2">{formatMontant(parseFloat(montant))}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("categorie")} className="btn-outline-or flex-1">
                Retour
              </button>
              <button type="submit" className="btn-or flex-1">
                Continuer
              </button>
            </div>
          </form>
        )}

        {/* Step: Infos (optionnelles) */}
        {step === "infos" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("paiement");
            }}
            className="card-noir space-y-5 animate-fade-in"
          >
            <div>
              <h2 className="font-display text-xl text-blanc mb-1">Informations (optionnelles)</h2>
              <p className="text-blanc/40 text-sm">
                Renseignez vos infos pour recevoir un reçu. Vous pouvez aussi rester anonyme.
              </p>
            </div>
            <div>
              <label className="label-or">Nom (optionnel)</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom"
                className="input-noir w-full"
              />
            </div>
            <div>
              <label className="label-or">Téléphone (optionnel)</label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+225 ..."
                className="input-noir w-full"
              />
            </div>
            <div>
              <label className="label-or">Email (optionnel)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@email.com"
                className="input-noir w-full"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("montant")} className="btn-outline-or flex-1">
                Retour
              </button>
              <button type="submit" className="btn-or flex-1">
                Continuer
              </button>
            </div>
          </form>
        )}

        {/* Step: Paiement */}
        {step === "paiement" && (
          <form onSubmit={handlePaiement} className="card-noir space-y-5 animate-fade-in">
            <div className="text-center py-4">
              <Wallet className="w-12 h-12 text-or mx-auto mb-4" />
              <h2 className="font-display text-2xl text-blanc mb-2">
                {formatMontant(parseFloat(montant))}
              </h2>
              <p className="text-blanc/50 text-sm">{selectedCat?.label}</p>
            </div>

            <div className="space-y-2 text-sm border-t border-or/10 pt-4">
              {nom && <div className="flex justify-between"><span className="text-blanc/40">Nom</span><span className="text-blanc">{nom}</span></div>}
              {telephone && <div className="flex justify-between"><span className="text-blanc/40">Téléphone</span><span className="text-blanc">{telephone}</span></div>}
              {email && <div className="flex justify-between"><span className="text-blanc/40">Email</span><span className="text-blanc">{email}</span></div>}
              {!nom && !telephone && !email && <p className="text-blanc/40 text-center">Don anonyme</p>}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("infos")} className="btn-outline-or flex-1">
                Retour
              </button>
              <button type="submit" disabled={loading} className="btn-or flex-1 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Payer maintenant"}
              </button>
            </div>
          </form>
        )}

        {/* Step: Succes */}
        {step === "succes" && (
          <div className="card-noir text-center space-y-4 animate-fade-in">
            <CheckCircle className="w-16 h-16 text-or mx-auto" />
            <h2 className="font-display text-2xl text-blanc">Paiement réussi !</h2>
            <p className="text-blanc/60">
              Merci pour votre contribution de {formatMontant(parseFloat(montant))}.
              <br />
              Votre don a été enregistré et la répartition calculée automatiquement.
            </p>
            {recuUrl && (
              <a href={recuUrl} target="_blank" rel="noopener noreferrer" className="btn-or inline-block">
                Télécharger le reçu
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
