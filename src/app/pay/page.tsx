"use client";

import { useState } from "react";
import { Wallet, Heart, Gift, Building2, Briefcase, CircleDot, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type PaymentType = "DIME" | "OFFRANDE" | "CONSTRUCTION" | "DON_SPECIAL" | "PROJET" | "AUTRE";

const PAYMENT_TYPES: Record<PaymentType, { label: string; icon: any; description: string }> = {
  DIME: {
    label: "Dîme",
    icon: Wallet,
    description: "10% de vos revenus",
  },
  OFFRANDE: {
    label: "Offrande",
    icon: Heart,
    description: "Don pendant le culte",
  },
  CONSTRUCTION: {
    label: "Construction",
    icon: Building2,
    description: "Fonds pour la construction",
  },
  DON_SPECIAL: {
    label: "Don spécial",
    icon: Gift,
    description: "Dons spéciaux",
  },
  PROJET: {
    label: "Projet",
    icon: Briefcase,
    description: "Fonds pour un projet",
  },
  AUTRE: {
    label: "Autre",
    icon: CircleDot,
    description: "Autre type de don",
  },
};

export default function PaymentPage() {
  const router = useRouter();
  const [paymentType, setPaymentType] = useState<PaymentType>("OFFRANDE");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const initiatePayment = async () => {
    if (!amount || parseFloat(amount) < 200) {
      toast.error("Le montant minimum est de 200 FCFA");
      return;
    }

    // Le nom est obligatoire pour la dîme
    if (paymentType === "DIME" && !name) {
      toast.error("Le nom est obligatoire pour la dîme");
      return;
    }

    setLoading(true);
    try {
      console.log("Initialisation du paiement avec:", { amount, paymentType, name, email, phone });

      const response = await fetch("/api/payment/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          categorie: paymentType,
          description: `${PAYMENT_TYPES[paymentType].label} - ${name || "Anonyme"}`,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
        }),
      });

      const data = await response.json();

      console.log("Réponse API paiement:", data);

      if (data.success) {
        const url = data.paymentUrl || data.checkout_url || data.url || data.data?.payment_url || data.data?.checkout_url;
        console.log("URL extraite:", url);
        console.log("Champs disponibles:", Object.keys(data));
        if (url) {
          setPaymentUrl(url);
          toast.success("Redirection vers le paiement...");
          setTimeout(() => {
            window.location.href = url;
          }, 1000);
        } else {
          console.error("Réponse complète:", JSON.stringify(data, null, 2));
          toast.error("URL de paiement non trouvée dans la réponse");
        }
      } else {
        toast.error(data.error || "Erreur lors de l'initialisation du paiement");
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation:", error);
      toast.error("Erreur lors de l'initialisation du paiement");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-noir flex items-center justify-center p-4">
      <div className="card-noir w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-or/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-or" />
          </div>
          <h1 className="font-aeonik text-2xl sm:text-3xl font-bold text-blanc mb-2">
            Paiement CTF
          </h1>
          <p className="text-blanc/50 text-sm">
            Faites votre dîme, offrande ou don en ligne
          </p>
        </div>

        {!paymentUrl ? (
          <div className="space-y-6">
            {/* Type de paiement */}
            <div>
              <label className="label-or mb-3">Type de paiement</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PAYMENT_TYPES) as PaymentType[]).map((type) => {
                  const Icon = PAYMENT_TYPES[type].icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setPaymentType(type)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        paymentType === type
                          ? "border-or bg-or/10"
                          : "border-or/20 hover:border-or/40"
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-1 text-or" />
                      <span className="text-xs text-blanc">{PAYMENT_TYPES[type].label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-blanc/40 text-xs mt-2">{PAYMENT_TYPES[paymentType].description}</p>
            </div>

            {/* Montant */}
            <div>
              <label className="label-or">Montant (FCFA)</label>
              <input
                type="number"
                min="200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Minimum 200 FCFA"
                className="input-noir w-full text-lg font-aeonik"
              />
            </div>

            {/* Informations optionnelles */}
            <div className="space-y-3">
              <div>
                <label className="label-or">
                  Nom {paymentType === "DIME" ? <span className="text-red-400">*</span> : "(optionnel)"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="input-noir w-full"
                  required={paymentType === "DIME"}
                />
                {paymentType === "DIME" && (
                  <p className="text-blanc/40 text-xs mt-1">Le nom est obligatoire pour la dîme</p>
                )}
              </div>

              <div>
                <label className="label-or">Email (optionnel)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="input-noir w-full"
                />
              </div>

              <div>
                <label className="label-or">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+225 XX XX XX XX XX"
                  className="input-noir w-full"
                />
              </div>
            </div>

            <button
              onClick={initiatePayment}
              disabled={loading}
              className="btn-or w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initialisation...
                </>
              ) : (
                <>
                  Payer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-blanc/40 text-xs text-center">
              Paiement sécurisé via Genius Pay
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <div>
              <h3 className="font-aeonik text-xl text-blanc mb-2">Redirection...</h3>
              <p className="text-blanc/50 text-sm">
                Vous allez être redirigé vers la page de paiement Genius Pay
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}