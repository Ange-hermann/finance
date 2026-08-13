"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { formatMontant } from "@/lib/utils";

const schema = z.object({
  categorie: z.enum(["OFFRANDE", "DIME", "CONSTRUCTION", "DON_SPECIAL", "PROJET", "AUTRE"]),
  montant: z.string().refine((v) => parseFloat(v) > 0, "Montant invalide"),
  modePaiementPhysique: z.enum(["ESPECES", "CHEQUE"]),
  nom: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const categories = [
  { value: "OFFRANDE", label: "Offrande" },
  { value: "DIME", label: "Dîme" },
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "DON_SPECIAL", label: "Don spécial" },
  { value: "PROJET", label: "Projet" },
  { value: "AUTRE", label: "Autre" },
];

export default function SaisieManuellePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ economie: number; epargne: number; actionSociale: number; caisse: number; dimeDeLaDime: number | null; fondsDedie: number } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const montant = watch("montant");
  const categorie = watch("categorie");

  const calculerPreview = (montantStr: string, cat: string) => {
    const m = parseFloat(montantStr);
    if (!m || m <= 0 || !cat) {
      setPreview(null);
      return;
    }
    const taux: Record<string, any> = {
      OFFRANDE: { economie: 0.10, epargne: 0.10, actionSociale: 0.10, caisse: 0.70, dimeDeLaDime: null, fondsDedie: 0 },
      DIME: { economie: 0.10, epargne: 0.10, actionSociale: 0.10, caisse: 0.60, dimeDeLaDime: 0.10, fondsDedie: 0 },
      CONSTRUCTION: { economie: 0, epargne: 0, actionSociale: 0, caisse: 0, dimeDeLaDime: null, fondsDedie: 1.00 },
      DON_SPECIAL: { economie: 0.10, epargne: 0.10, actionSociale: 0.10, caisse: 0.70, dimeDeLaDime: null, fondsDedie: 0 },
      PROJET: { economie: 0.10, epargne: 0.10, actionSociale: 0.10, caisse: 0.70, dimeDeLaDime: null, fondsDedie: 0 },
      AUTRE: { economie: 0.10, epargne: 0.10, actionSociale: 0.10, caisse: 0.70, dimeDeLaDime: null, fondsDedie: 0 },
    };
    const t = taux[cat];
    setPreview({
      economie: Math.round(m * t.economie * 100) / 100,
      epargne: Math.round(m * t.epargne * 100) / 100,
      actionSociale: Math.round(m * t.actionSociale * 100) / 100,
      caisse: Math.round(m * t.caisse * 100) / 100,
      dimeDeLaDime: t.dimeDeLaDime ? Math.round(m * t.dimeDeLaDime * 100) / 100 : null,
      fondsDedie: Math.round(m * t.fondsDedie * 100) / 100,
    });
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (res.ok) {
        toast.success("Transaction enregistrée avec succès");
        router.push("/dashboard/collector");
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Saisie manuelle</h1>
        <p className="text-blanc/50 text-sm mt-1">Enregistrer un paiement reçu en main propre</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="card-noir space-y-5">
          <div>
            <label className="label-or">Catégorie *</label>
            <select
              {...register("categorie")}
              onChange={(e) => {
                register("categorie").onChange(e);
                calculerPreview(montant, e.target.value);
              }}
              className="input-noir w-full"
            >
              <option value="">Sélectionner...</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.categorie && <p className="text-red-400 text-xs mt-1">{errors.categorie.message}</p>}
          </div>

          <div>
            <label className="label-or">Montant (FCFA) *</label>
            <input
              type="number"
              {...register("montant")}
              onChange={(e) => {
                register("montant").onChange(e);
                calculerPreview(e.target.value, categorie);
              }}
              placeholder="10000"
              className="input-noir w-full"
            />
            {errors.montant && <p className="text-red-400 text-xs mt-1">{errors.montant.message}</p>}
          </div>

          <div>
            <label className="label-or">Mode de paiement *</label>
            <select {...register("modePaiementPhysique")} className="input-noir w-full">
              <option value="ESPECES">Espèces</option>
              <option value="CHEQUE">Chèque</option>
            </select>
          </div>

          <div className="border-t border-or/10 pt-4">
            <p className="text-or/70 text-sm mb-3">Informations du contributeur (optionnelles)</p>
            <div className="space-y-3">
              <div>
                <label className="label-or">Nom</label>
                <input {...register("nom")} placeholder="Nom du fidèle" className="input-noir w-full" />
              </div>
              <div>
                <label className="label-or">Téléphone</label>
                <input {...register("telephone")} placeholder="+225 ..." className="input-noir w-full" />
              </div>
              <div>
                <label className="label-or">Email</label>
                <input {...register("email")} placeholder="email@exemple.com" className="input-noir w-full" />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-or w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
            Enregistrer la transaction
          </button>
        </form>

        {/* Preview repartition */}
        <div className="card-noir">
          <h3 className="font-display text-xl text-blanc mb-4">Aperçu de la répartition</h3>
          {preview ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-or/10">
                <span className="text-blanc/60 text-sm">Montant total</span>
                <span className="font-display text-2xl text-or">{formatMontant(parseFloat(montant))}</span>
              </div>
              {preview.fondsDedie > 0 ? (
                <div className="flex justify-between p-3 rounded-xl bg-or/5">
                  <span className="text-blanc/60 text-sm">Fonds dédié (Construction)</span>
                  <span className="text-blanc font-medium">{formatMontant(preview.fondsDedie)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between p-3 rounded-xl bg-or/5">
                    <span className="text-blanc/60 text-sm">Économie (10%)</span>
                    <span className="text-blanc font-medium">{formatMontant(preview.economie)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-or/5">
                    <span className="text-blanc/60 text-sm">Épargne (10%)</span>
                    <span className="text-blanc font-medium">{formatMontant(preview.epargne)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-or/5">
                    <span className="text-blanc/60 text-sm">Action sociale (10%)</span>
                    <span className="text-blanc font-medium">{formatMontant(preview.actionSociale)}</span>
                  </div>
                  {preview.dimeDeLaDime !== null && (
                    <div className="flex justify-between p-3 rounded-xl bg-or/5">
                      <span className="text-blanc/60 text-sm">Dîme de la dîme (10%)</span>
                      <span className="text-blanc font-medium">{formatMontant(preview.dimeDeLaDime)}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-3 rounded-xl bg-or/5">
                    <span className="text-blanc/60 text-sm">Caisse</span>
                    <span className="text-blanc font-medium">{formatMontant(preview.caisse)}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-blanc/40 text-sm text-center py-8">
              Sélectionnez une catégorie et un montant pour voir la répartition
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
