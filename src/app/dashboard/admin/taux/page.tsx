import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Settings } from "lucide-react";
import TauxManager from "@/components/TauxManager";

export const dynamic = "force-dynamic";

export default async function TauxPage() {
  const taux = await prisma.tauxRepartition.findMany({
    orderBy: [{ categorie: "asc" }, { nomPoste: "asc" }],
  });

  const grouped: Record<string, typeof taux> = {};
  taux.forEach((t) => {
    if (!grouped[t.categorie]) grouped[t.categorie] = [];
    grouped[t.categorie].push(t);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Taux de répartition</h1>
        <p className="text-blanc/50 text-sm mt-1">Configuration des pourcentages de ventilation par catégorie</p>
      </div>

      <TauxManager grouped={grouped} />

      <div className="card-noir">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Historique des taux</h3>
        </div>
        {taux.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-8">
            Aucun taux configuré. Les valeurs par défaut sont utilisées.
          </p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-or/70 text-left border-b border-or/10">
                  <th className="pb-3 pr-4">Catégorie</th>
                  <th className="pb-3 pr-4">Poste</th>
                  <th className="pb-3 pr-4">Pourcentage</th>
                  <th className="pb-3">Date d'effet</th>
                </tr>
              </thead>
              <tbody>
                {taux.map((t) => (
                  <tr key={t.id} className="border-b border-or/5">
                    <td className="py-3 pr-4 text-blanc">{t.categorie}</td>
                    <td className="py-3 pr-4 text-blanc/60">{t.nomPoste}</td>
                    <td className="py-3 pr-4 text-or font-medium">{Number(t.pourcentage)}%</td>
                    <td className="py-3 text-blanc/60">{formatDate(t.dateEffet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
