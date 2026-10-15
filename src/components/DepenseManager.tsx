"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, Receipt, RefreshCw, Link as LinkIcon, Copy } from "lucide-react";

interface Transaction {
  id: string;
  montant: number;
  categorie: string;
  createdAt: string;
}

interface Depense {
  id: string;
  type: string;
  categorie: string;
  sourceFonds?: string;
  description: string;
  montant: number;
  transactionId?: string;
  dateDepense: string;
  statut: string;
  agent?: { nom: string };
  transaction?: { categorie: string };
  modePaiement?: string;
  statutPaiement?: string;
  lienPaiement?: string;
  referencePaiement?: string;
  beneficiaire?: {
    nom: string;
    telephone: string;
    email?: string;
    modePaiement: string;
  };
}

const CATEGORIES_CULTE = ["MUSICIEN", "TRANSPORT", "MATERIEL"];
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
    modePaiement: "MANUEL" as "MANUEL" | "GENIUS_PAY",
    beneficiaireNom: "",
    beneficiaireTelephone: "",
    beneficiaireEmail: "",
    beneficiaireModePaiement: "WAVE" as "WAVE" | "ORANGE_MOMO" | "MTN_MOMO" | "CARTE" | "ESPECES",
  });
  const [soldes, setSoldes] = useState<Record<string, number> | null>(null);

  const fetchDepenses = async () => {
    setLoading(true);
    const res = await fetch("/api/depenses");
    const data = await res.json();
    console.log("Dépenses récupérées:", data);
    setDepenses(data);
    const resSoldes = await fetch("/api/depenses/soldes");
    if (resSoldes.ok) {
      setSoldes(await resSoldes.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepenses();
    const interval = setInterval(fetchDepenses, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const sourceFonds = form.type === "DEPENSE_NORMALE" ? form.sourceFonds : "CAISSE";

    const depenseRes = await fetch("/api/depenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        categorie: form.categorie,
        sourceFonds: sourceFonds,
        description: form.description,
        montant: parseFloat(form.montant),
        transactionId: form.type === "DEPENSE_CULTE" ? form.transactionId || null : null,
        dateDepense: form.dateDepense || undefined,
        modePaiement: form.modePaiement,
        ...(form.modePaiement === "GENIUS_PAY" && {
          beneficiaireNom: form.beneficiaireNom,
          beneficiaireTelephone: form.beneficiaireTelephone,
          beneficiaireEmail: form.beneficiaireEmail || undefined,
          beneficiaireModePaiement: form.beneficiaireModePaiement,
        }),
      }),
    });

    if (depenseRes.ok) {
      const depenseData = await depenseRes.json();
      
      const permissionRes = await fetch("/api/permissions/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFonds: sourceFonds,
          montant: parseFloat(form.montant),
        }),
      });

      const permissionData = await permissionRes.json();

      if (permissionData.authorized) {
        toast.success("Dépense enregistrée et validée");
      } else if (permissionData.needsApproval) {
        const demandeRes = await fetch("/api/demandes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceFonds: sourceFonds,
            typeAction: "DEPENSE",
            montant: parseFloat(form.montant),
            description: form.description,
            motif: `Dépense ${form.type === "DEPENSE_CULTE" ? "après culte" : "normale"} - ${form.categorie}`,
            depenseId: depenseData.id,
          }),
        });

        if (demandeRes.ok) {
          toast.success("Dépense enregistrée. Demande d'autorisation envoyée au pasteur/commissaire");
        } else {
          toast.error("Erreur lors de la création de la demande d'autorisation");
        }
      } else {
        toast.error("Erreur lors de la vérification des autorisations");
      }

      setForm({
        type: "DEPENSE_CULTE",
        categorie: "MUSICIEN",
        sourceFonds: "CAISSE",
        description: "",
        montant: "",
        transactionId: "",
        dateDepense: "",
        modePaiement: "MANUEL",
        beneficiaireNom: "",
        beneficiaireTelephone: "",
        beneficiaireEmail: "",
        beneficiaireModePaiement: "WAVE",
      });
      setShowForm(false);
      fetchDepenses();
    } else {
      const data = await depenseRes.json();
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

  const handleCopyPaymentLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien de paiement copié");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const handlePayerDepense = async (id: string) => {
    try {
      const res = await fetch(`/api/depenses/${id}/payment-link`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.statutPaiement === "PAYE"
            ? "Paiement effectué"
            : "Paiement initié — versement en cours vers le bénéficiaire"
        );
        fetchDepenses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const categories = form.type === "DEPENSE_CULTE" ? CATEGORIES_CULTE : CATEGORIES_NORMALE;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-or" />
          <h3 className="font-aeonik text-xl text-blanc">Gestion des dépenses</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDepenses}
            className="btn-outline-or text-sm flex items-center justify-center gap-2"
            title="Rafraîchir la liste"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-or text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle dépense
          </button>
        </div>
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
                    sourceFonds: type === "DEPENSE_CULTE" ? "CAISSE" : form.sourceFonds,
                  });
                }}
                className="input-noir w-full"
              >
                <option value="DEPENSE_CULTE">Dépense après culte</option>
                <option value="DEPENSE_NORMALE">Dépense normale</option>
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
              {form.sourceFonds !== "CAISSE" && (
                <p className="text-or/60 text-xs mt-1">
                  ⚠️ Cette source nécessite une autorisation du pasteur ou du commissaire
                </p>
              )}
            </div>

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

            {form.type === "DEPENSE_NORMALE" && (
              <div className="sm:col-span-2">
                <label className="label-or">Mode de paiement</label>
                <select
                  value={form.modePaiement}
                  onChange={(e) => setForm({ ...form, modePaiement: e.target.value as "MANUEL" | "GENIUS_PAY" })}
                  className="input-noir w-full"
                >
                  <option value="MANUEL">Paiement manuel (espèces/chèque)</option>
                  <option value="GENIUS_PAY">Paiement en ligne (Genius Pay)</option>
                </select>
              </div>
            )}

            {form.type === "DEPENSE_NORMALE" && form.modePaiement === "GENIUS_PAY" && (
              <div className="sm:col-span-2 border-t border-or/10 pt-4">
                <p className="text-or/70 text-sm mb-3">Coordonnées du bénéficiaire</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-or">Nom du bénéficiaire *</label>
                    <input
                      type="text"
                      required
                      value={form.beneficiaireNom}
                      onChange={(e) => setForm({ ...form, beneficiaireNom: e.target.value })}
                      placeholder="Nom du fournisseur"
                      className="input-noir w-full"
                    />
                  </div>
                  <div>
                    <label className="label-or">Téléphone *</label>
                    <input
                      type="tel"
                      required
                      value={form.beneficiaireTelephone}
                      onChange={(e) => setForm({ ...form, beneficiaireTelephone: e.target.value })}
                      placeholder="+225 07..."
                      className="input-noir w-full"
                    />
                  </div>
                  <div>
                    <label className="label-or">Email (optionnel)</label>
                    <input
                      type="email"
                      value={form.beneficiaireEmail}
                      onChange={(e) => setForm({ ...form, beneficiaireEmail: e.target.value })}
                      placeholder="email@exemple.com"
                      className="input-noir w-full"
                    />
                  </div>
                  <div>
                    <label className="label-or">Mode de paiement du bénéficiaire *</label>
                    <select
                      required
                      value={form.beneficiaireModePaiement}
                      onChange={(e) => setForm({ ...form, beneficiaireModePaiement: e.target.value as any })}
                      className="input-noir w-full"
                    >
                      <option value="WAVE">Wave</option>
                      <option value="ORANGE_MOMO">Orange Money</option>
                      <option value="MTN_MOMO">MTN Mobile Money</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
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
          <p className="text-blanc/40 text-xs">{depenses.length} dépense(s)</p>
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
                    {d.statut === "EN_ATTENTE" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 whitespace-nowrap">
                        En attente
                      </span>
                    )}
                    {d.modePaiement === "GENIUS_PAY" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 whitespace-nowrap">
                        Genius Pay
                      </span>
                    )}
                    {d.statutPaiement === "PAYE" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 whitespace-nowrap">
                        Payé
                      </span>
                    )}
                    {d.statutPaiement === "EN_ATTENTE" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 whitespace-nowrap">
                        Paiement en attente
                      </span>
                    )}
                    {d.statutPaiement === "EN_COURS" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 whitespace-nowrap">
                        Versement en cours
                      </span>
                    )}
                    {d.statutPaiement === "LIEN_GENERE" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 whitespace-nowrap">
                        Lien généré
                      </span>
                    )}
                    {d.statutPaiement === "ECHOUE" && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 whitespace-nowrap">
                        Paiement échoué
                      </span>
                    )}
                  </div>
                  <p className="text-blanc font-medium mt-2 break-words">{d.description}</p>
                  <p className="text-blanc/40 text-xs mt-1">
                    {new Date(d.dateDepense).toLocaleDateString("fr-FR")}
                    {d.agent && ` • ${d.agent.nom}`}
                    {d.transaction && ` • Liée à: ${d.transaction.categorie}`}
                  </p>
                  {d.beneficiaire && (
                    <p className="text-blanc/40 text-xs mt-1">
                      Bénéficiaire: {d.beneficiaire.nom} ({d.beneficiaire.telephone})
                    </p>
                  )}
                  {d.modePaiement === "GENIUS_PAY" && d.lienPaiement && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopyPaymentLink(d.lienPaiement!)}
                        className="text-xs text-or hover:text-or/80 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copier le lien
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-aeonik text-lg text-blanc whitespace-nowrap">
                    {Number(d.montant).toLocaleString("fr-FR")}
                    <span className="text-blanc/40 text-xs ml-1">FCFA</span>
                  </p>
                  {d.modePaiement === "GENIUS_PAY" && d.statut === "VALIDE" && d.statutPaiement !== "PAYE" && d.statutPaiement !== "EN_COURS" && (
                    <button
                      onClick={() => handlePayerDepense(d.id)}
                      className="text-xs text-or hover:text-or/80 mt-1 whitespace-nowrap flex items-center gap-1 justify-end"
                    >
                      <LinkIcon className="w-3 h-3" />
                      Payer le bénéficiaire
                    </button>
                  )}
                  {d.statut === "VALIDE" && (
                    <button
                      onClick={() => handleStatutChange(d.id, "ANNULE")}
                      className="text-xs text-red-400 hover:text-red-300 mt-1 whitespace-nowrap"
                    >
                      Annuler
                    </button>
                  )}
                  {d.statut === "EN_ATTENTE" && (
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