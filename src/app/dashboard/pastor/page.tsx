import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { PiggyBank, Wallet, Heart, Building2, Coins, TrendingUp } from "lucide-react";
import PastorCharts from "@/components/PastorCharts";

export const dynamic = "force-dynamic";

export default async function PastorDashboard() {
  const [repartitions, caisse, transactions] = await Promise.all([
    prisma.repartition.findMany({
      where: { transaction: { statut: "VALIDE" } },
    }),
    prisma.caisse.findFirst(),
    prisma.transaction.findMany({
      where: { statut: "VALIDE" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { contributeur: true },
    }),
  ]);

  const grandTotalEconomie = repartitions.reduce((sum, r) => sum + Number(r.montantEconomie), 0);
  const grandTotalEpargne = repartitions.reduce((sum, r) => sum + Number(r.montantEpargne), 0);
  const grandTotalActionSociale = repartitions.reduce((sum, r) => sum + Number(r.montantActionSociale), 0);
  const grandTotalDimeDeLaDime = repartitions.reduce((sum, r) => sum + Number(r.montantDimeDeLaDime || 0), 0);
  const grandTotalConstruction = repartitions.reduce((sum, r) => sum + Number(r.montantFondsDedie), 0);
  const grandTotalCaisse = Number(caisse?.soldeActuel || 0);

  const kpis = [
    { label: "Économie", value: grandTotalEconomie, icon: PiggyBank },
    { label: "Épargne", value: grandTotalEpargne, icon: Wallet },
    { label: "Action sociale", value: grandTotalActionSociale, icon: Heart },
    { label: "Caisse", value: grandTotalCaisse, icon: Coins },
    { label: "Construction", value: grandTotalConstruction, icon: Building2 },
    { label: "Dîme de la dîme", value: grandTotalDimeDeLaDime, icon: TrendingUp },
  ];

  const monthlyData = await prisma.transaction.findMany({
    where: { statut: "VALIDE" },
    orderBy: { createdAt: "asc" },
  });

  const monthMap: Record<string, { offrandes: number; dimes: number }> = {};
  monthlyData.forEach((t) => {
    const monthKey = new Date(t.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    if (!monthMap[monthKey]) monthMap[monthKey] = { offrandes: 0, dimes: 0 };
    if (t.categorie === "OFFRANDE") monthMap[monthKey].offrandes += Number(t.montant);
    if (t.categorie === "DIME") monthMap[monthKey].dimes += Number(t.montant);
  });
  const chartData = Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));

  const categorieData = await prisma.transaction.groupBy({
    by: ["categorie"],
    where: { statut: "VALIDE" },
    _sum: { montant: true },
  });
  const pieData = categorieData.map((c) => ({
    name: c.categorie,
    value: Number(c._sum.montant || 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Vue globale — Pasteur</h1>
        <p className="text-blanc/50 text-sm mt-1">Lecture seule — grands totaux et graphiques</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="card-noir hover:shadow-gold transition-all animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <kpi.icon className="w-6 h-6 sm:w-7 sm:h-7 text-or mb-2" />
            <p className="text-blanc/50 text-xs truncate">{kpi.label}</p>
            <p className="font-display text-base sm:text-lg text-blanc mt-1">{formatMontant(kpi.value)}</p>
          </div>
        ))}
      </div>

      <PastorCharts chartData={chartData} pieData={pieData} />

      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">Dernières transactions (lecture seule)</h3>
        {transactions.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-8">Aucune transaction pour le moment</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-or/70 text-left border-b border-or/10">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Montant</th>
                  <th className="pb-3 pr-4 hidden sm:table-cell">Catégorie</th>
                  <th className="pb-3 pr-4 hidden sm:table-cell">Contributeur</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-or/5">
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3 pr-4 text-blanc font-medium whitespace-nowrap">{formatMontant(Number(t.montant))}</td>
                    <td className="py-3 pr-4 text-blanc/60 hidden sm:table-cell">{t.categorie}</td>
                    <td className="py-3 pr-4 text-blanc/60 hidden sm:table-cell">{t.contributeur?.nom || "Anonyme"}</td>
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
