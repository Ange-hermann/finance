"use client";

import { useState, useEffect } from "react";
import { Wallet, ArrowDownToLine, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatMontant, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MOMO", label: "Orange Money" },
  { value: "MTN_MOMO", label: "MTN Money" },
  { value: "MOOV_MOMO", label: "Moov Money" },
];

const STATUT_LABELS: Record<string, { label: string; cls: string }> = {
  PAYE: { label: "Versé", cls: "bg-green-500/10 text-green-400" },
  EN_COURS: { label: "En cours", cls: "bg-blue-500/10 text-blue-400" },
  EN_ATTENTE: { label: "En attente", cls: "bg-yellow-500/10 text-yellow-400" },
  ECHOUE: { label: "Échoué", cls: "bg-red-500/10 text-red-400" },
};

export default function RetraitPasteurPage() {
  const [solde, setSolde] = useState<number | null>(null);
  const [retraits, setRetraits] = useState<any[]>([]);
  const [dimeDeLaDimeDue, setDimeDeLaDimeDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ montant: "", telephone: "", provider: "WAVE", pourDimeDeLaDime: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/retraits");
      const data = await res.json();
      setSolde(data.solde);
      setRetraits(data.retraits || []);
      setDimeDeLaDimeDue(data.dimeDeLaDimeDue || 0);
    } catch {
      toast.error("Erreur de chargement");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/retraits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montant: parseFloat(form.montant),
          telephone: form.telephone,
          provider: form.provider,
          pourDimeDeLaDime: form.pourDimeDeLaDime,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const frais = data.fees ? ` (frais: ${formatMontant(data.fees)})` : "";
        toast.success(
          data.statutPaiement === "PAYE"
            ? `Retrait effectué${frais}`
            : `Versement en cours vers votre mobile money${frais}`
        );
        setForm({ montant: "", telephone: "", provider: "WAVE", pourDimeDeLaDime: false });
        fetchData();
      } else {
        toast.error(data.error || "Erreur lors du retrait");
      }
    } catch {
      toast.error("Erreur réseau");
    }
    setSubmitting(false);
  };

  const fraisEstimes = form.montant ? Math.ceil(parseFloat(form.montant) * 0.015) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-aeonik text-2xl sm:text-3xl font-bold text-blanc uppercase">
          Retrait
        </h1>
        <p className="text-blanc/50 text-sm mt-1">
          Retirez votre part : dîmes reçues + 10% des offrandes et dons
        </p>
      </div>

      {/* Solde + dîme de la dîme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-noir p-6">
          <div className="flex items-center gap-4">
            <Wallet className="w-10 h-10 text-or" />
            <div>
              <p className="text-blanc/50 text-sm">Votre solde disponible</p>
              <p className="font-aeonik text-3xl text-blanc">
                {solde !== null ? formatMontant(solde) : "…"}
              </p>
            </div>
          </div>
        </div>
        <div className="card-noir p-6">
          <div className="flex items-center gap-4">
            <ArrowDownToLine className="w-10 h-10 text-or" />
            <div>
              <p className="text-blanc/50 text-sm">Dîme de la dîme à remettre (10%)</p>
              <p className="font-aeonik text-3xl text-blanc">{formatMontant(dimeDeLaDimeDue)}</p>
            </div>
          </div>
          {dimeDeLaDimeDue > 0 && (
            <button
              onClick={() => setForm({ ...form, montant: String(dimeDeLaDimeDue), pourDimeDeLaDime: true })}
              className="text-or text-sm mt-3 hover:underline"
            >
              → Remplir le formulaire avec ce montant
            </button>
          )}
        </div>
      </div>

      {/* Formulaire de retrait */}
      <div className="card-noir p-6">
        <h3 className="font-aeonik text-xl text-blanc mb-4">Effectuer un retrait</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-blanc/60 text-sm mb-1">Montant (FCFA)</label>
            <input
              type="number"
              min="1"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              className="input-noir w-full"
              placeholder="Ex: 50000"
              required
            />
            {fraisEstimes > 0 && (
              <p className="text-blanc/40 text-xs mt-1">
                Frais estimés : ~{formatMontant(fraisEstimes)} (≈1.5%, débités du wallet)
              </p>
            )}
          </div>
          <div>
            <label className="block text-blanc/60 text-sm mb-1">Votre numéro mobile money</label>
            <input
              type="tel"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="input-noir w-full"
              placeholder="+225 07 07 07 07 07"
              required
            />
          </div>
          <div>
            <label className="block text-blanc/60 text-sm mb-1">Opérateur</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, provider: p.value })}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    form.provider === p.value
                      ? "bg-or/20 border-or text-or"
                      : "bg-noir-card border-or/10 text-blanc/60 hover:border-or/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-blanc/60 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.pourDimeDeLaDime}
              onChange={(e) => setForm({ ...form, pourDimeDeLaDime: e.target.checked })}
              className="accent-or w-4 h-4"
            />
            Ce retrait correspond à la dîme de la dîme (déduit du montant dû)
          </label>
          <button
            type="submit"
            disabled={submitting || loading || !form.montant || !form.telephone}
            className="btn-or w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Versement en cours…
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                Retirer {form.montant ? formatMontant(parseFloat(form.montant)) : ""}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Historique */}
      <div className="card-noir p-6">
        <h3 className="font-aeonik text-xl text-blanc mb-4">Historique des retraits</h3>
        {loading ? (
          <p className="text-blanc/50 text-center py-6">Chargement…</p>
        ) : retraits.length === 0 ? (
          <p className="text-blanc/50 text-center py-6">Aucun retrait pour le moment</p>
        ) : (
          <div className="space-y-2">
            {retraits.map((r) => {
              const s = STATUT_LABELS[r.statutPaiement || "EN_ATTENTE"] || STATUT_LABELS.EN_ATTENTE;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-noir-card border border-or/10"
                >
                  <div>
                    <p className="text-blanc font-aeonik">{formatMontant(Number(r.montant))}</p>
                    <p className="text-blanc/50 text-xs">
                      {formatDate(r.dateDepense)}
                      {r.beneficiaire && ` • ${r.beneficiaire.telephone}`}
                      {r.referencePaiement && ` • ${r.referencePaiement}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${s.cls}`}>
                    {r.statutPaiement === "PAYE" ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : r.statutPaiement === "ECHOUE" ? (
                      <XCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
