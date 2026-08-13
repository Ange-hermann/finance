"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface TauxItem {
  id: string;
  categorie: string;
  nomPoste: string;
  pourcentage: number | { toNumber: () => number };
  dateEffet: Date;
}

export default function TauxManager({ grouped }: { grouped: Record<string, TauxItem[]> }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    categorie: "OFFRANDE",
    nomPoste: "economie",
    pourcentage: "10",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/taux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pourcentage: parseFloat(form.pourcentage),
        }),
      });

      if (res.ok) {
        toast.success("Taux créé avec succès");
        setShowForm(false);
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-or text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouveau taux
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card-noir space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-or">Catégorie</label>
              <select
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                className="input-noir w-full"
              >
                {["OFFRANDE", "DIME", "CONSTRUCTION", "DON_SPECIAL", "PROJET", "AUTRE"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-or">Poste</label>
              <select
                value={form.nomPoste}
                onChange={(e) => setForm({ ...form, nomPoste: e.target.value })}
                className="input-noir w-full"
              >
                {["economie", "epargne", "actionSociale", "dimeDeLaDime", "caisse", "fondsDedie"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-or">Pourcentage (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.pourcentage}
                onChange={(e) => setForm({ ...form, pourcentage: e.target.value })}
                className="input-noir w-full"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-or flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer"}
          </button>
        </form>
      )}

      {/* Taux actuels par catégorie */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(grouped).map(([cat, tauxList]) => (
          <div key={cat} className="card-noir">
            <h4 className="text-or font-display text-lg mb-3">{cat}</h4>
            <div className="space-y-2">
              {tauxList.map((t) => (
                <div key={t.id} className="flex justify-between text-sm">
                  <span className="text-blanc/60">{t.nomPoste}</span>
                  <span className="text-blanc font-medium">{typeof t.pourcentage === "number" ? t.pourcentage : t.pourcentage.toNumber()}%</span>
                </div>
              ))}
              {tauxList.length === 0 && (
                <p className="text-blanc/30 text-xs">Valeurs par défaut utilisées</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
