"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, Receipt } from "lucide-react";

interface Depense {
  id: string;
  type: "DEPENSE_CULTE" | "DEPENSE_NORMALE";
  categorie: string;
  sourceFonds: string;
  description: string;
  montant: number;
  dateDepense: string;
  statut: string;
  transaction?: { id: string; montant: number; categorie: string } | null;
  agent?: { id: string; nom: string } | null;
}

interface Transaction {
  id: string;
  montant: number;
  categorie: string;
  createdAt: string;
}

const CATEGORIES_CULTE = ["MUSICIEN", "TRANSPORT", "MATERIEL", "AUTRE"];
const CATEGORIES_NORMALE = ["ENTRETIEN", "FACTURE", "SALAIRE", "AUTRE"];

const LABELS: Record<string, string> = {
  MUSICIEN: "Musiciens",
  TRANSPORT: "Transport",
  MATERIEL: "Matériel",
  ENTRETIEN: "Entretien",
  FACTURE: "Factures",
  SALAIRE: "Salaires",
  AUTRE: "Autre",
};

const SOURCE_LABELS: Record<string, string> = {
  CAISSE: "Caisse",
  ECONOMIE: "Économie",
  EPARGNE: "Épargne",
  CONSTRUCTION: "Construction",
  ACTION_SOCIALE: "Action sociale",
};

const SOURCES = ["CAISSE", "ECONOMIE", "EPARGNE", "CONSTRUCTION", "ACTION_SOCIALE"];

export default function DepenseManager({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: "DEPENSE_CULTE" as "DEPENSE_CULTE" | "DEPENSE_NORMALE",
    categorie: "MUSICIEN",
    sourceFonds: "CAISSE",
    description: "",
    montant: "",
    transactionId: "",
    dateDepense: "",
  });
  const [soldes, setSoldes] = useState<Record<string, number> | null>(null);

  const fetchDepenses = async () => {
    setLoading(true);
    const res = await fetch("/api/depenses");
    const data = await res.json();
    setDepenses(data);
    const resSoldes = await fetch("/api/depenses/soldes");
    if (resSoldes.ok) {
      setSoldes(await resSoldes.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/depenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        categorie: form.categorie,
        sourceFonds: form.type === "DEPENSE_NORMALE" ? form.sourceFonds : undefined,
        description: form.description,
        montant: parseFloat(form.montant),
        transactionId: form.type === "DEPENSE_CULTE" ? form.transactionId || null : null,
        dateDepense: form.dateDepense || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Dépense enregistrée");
      setForm({
        type: "DEPENSE_CULTE",
        categorie: "MUSICIEN",
        sourceFonds: "CAISSE",
        description: "",
        montant: "",
        transactionId: "",
        dateDepense: "",
      });
      setShowForm(false);
      fetchDepenses();
    } else {
      const data = await res.json();
      toast.error(data.error || "Erreur lors de l'enregistrement");
    }
    setSubmitting(false);
  };

  const handleStatutChange = async (id: string, statut: "VALIDE" | "ANNULE") => {
    const res = await fetch(`/api/depenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });

    if (res.ok) {
      toast.success(statut === "ANNULE" ? "Dépense annulée" : "Dépense validée");
      fetchDepenses();
    } else {
      toast.error("Erreur");
    }
  };

  const categories = form.type === "DEPENSE_CULTE" ? CATEGORIES_CULTE : CATEGORIES_NORMALE;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Gestion des dépenses</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-or text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle dépense
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card-noir space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-or">Type de dépense</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as "DEPENSE_CULTE" | "DEPENSE_NORMALE";
                  setForm({
                    ...form,
                    type,
                    categorie: type === "DEPENSE_CULTE" ? "MUSICIEN" : "ENTRETIEN",
                  });
                }}
                className="input-noir w-full"
              >
                <option value="DEPENSE_CULTE">Dépense après culte</option>
                <option value="DEPENSE_NORMALE">Dépense normale (caisse)</option>
              </select>
            </div>

            <div>
              <label className="label-or">Catégorie</label>
              <select
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                className="input-noir w-full"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-or">Description</label>
              <input
                type="text"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Paiement musiciens dimanche"
                className="input-noir w-full"
              />
            </div>

            <div>
              <label className="label-or">Montant (FCFA)</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                placeholder="0"
                className="input-noir w-full"
              />
            </div>

            {form.type === "DEPENSE_NORMALE" && (
              <div className="sm:col-span-2">
                <label className="label-or">Source du fonds</label>
                <select
                  value={form.sourceFonds}
                  onChange={(e) => setForm({ ...form, sourceFonds: e.target.value })}
                  className="input-noir w-full"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABELS[s]}{soldes ? ` — Solde: ${soldes[s]?.toLocaleString("fr-FR") || 0} FCFA` : ""}
                    </option>
                  ))}
                </select>
                {soldes && form.sourceFonds && soldes[form.sourceFonds] <= 0 && (
                  <p className="text-red-400 text-xs mt-1">
                    ⚠ Solde insuffisant dans {SOURCE_LABELS[form.sourceFonds]}
                  </p>
                )}
              </div>
            )}

            {form.type === "DEPENSE_CULTE" && (
              <div className="sm:col-span-2">
                <label className="label-or">Transaction liée (offrande du culte)</label>
                <select
                  value={form.transactionId}
                  onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                  className="input-noir w-full"
                >
                  <option value="">— Sélectionner une transaction —</option>
                  {transactions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {new Date(t.createdAt).toLocaleDateString("fr-FR")} — {t.categorie} — {Number(t.montant).toLocaleString("fr-FR")} FCFA
                    </option>
                  ))}
                </select>
                <p className="text-blanc/40 text-xs mt-1">
                  La répartition sera recalculée sur le montant net (offrande - dépenses culte)
                </p>
              </div>
            )}

            <div>
              <label className="label-or">Date de la dépense</label>
              <input
                type="date"
                value={form.dateDepense}
                onChange={(e) => setForm({ ...form, dateDepense: e.target.value })}
                className="input-noir w-full"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn-or text-sm flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-outline-or text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-or" />
        </div>
      ) : depenses.length === 0 ? (
        <p className="text-blanc/40 text-sm text-center py-8">Aucune dépense enregistrée</p>
      ) : (
        <div className="space-y-3">
          {depenses.map((d) => (
            <div
              key={d.id}
              className={`border rounded-xl p-4 ${
                d.statut === "ANNULE"
                  ? "border-red-500/20 bg-red-500/5 opacity-60"
                  : d.type === "DEPENSE_CULTE"
                  ? "border-or/20 bg-or/5"
                  : "border-or/10 bg-noir-soft"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-lg whitespace-nowrap ${
                      d.type === "DEPENSE_CULTE" ? "bg-or/10 text-or" : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {d.type === "DEPENSE_CULTE" ? "Après culte" : "Normale"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-blanc/5 text-blanc/60 whitespace-nowrap">
                      {LABELS[d.categorie] || d.categorie}
                    </span>
                    {d.type === "DEPENSE_NORMALE" && d.sourceFonds && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 whitespace-nowrap">
                        {SOURCE_LABELS[d.sourceFonds] || d.sourceFonds}
                      </span>
                    )}
                    {d.statut === "VALIDE" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 whitespace-nowrap">
                        Validée
                      </span>
                    )}
                  </div>
                  <p className="text-blanc font-medium mt-2 break-words">{d.description}</p>
                  <p className="text-blanc/40 text-xs mt-1">
                    {new Date(d.dateDepense).toLocaleDateString("fr-FR")}
                    {d.agent && ` • ${d.agent.nom}`}
                    {d.transaction && ` • Liée à: ${d.transaction.categorie}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-lg text-blanc whitespace-nowrap">
                    {Number(d.montant).toLocaleString("fr-FR")}
                    <span className="text-blanc/40 text-xs ml-1">FCFA</span>
                  </p>
                  {d.statut === "VALIDE" && (
                    <button
                      onClick={() => handleStatutChange(d.id, "ANNULE")}
                      className="text-xs text-red-400 hover:text-red-300 mt-1 whitespace-nowrap"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
