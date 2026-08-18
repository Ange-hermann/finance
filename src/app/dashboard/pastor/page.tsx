import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { Coins, Wallet, PiggyBank, Heart, Building2, TrendingUp } from "lucide-react";
import PastorCharts from "@/components/PastorCharts";
import TransactionsParMois from "@/components/TransactionsParMois";

export const dynamic = "force-dynamic";

export default async function PastorDashboard() {
  const [repartitions, caisse, transactions, dimesVersees, depensesNormales, depEconomie, depEpargne, depActionSociale, depConstruction] = await Promise.all([
    prisma.repartition.findMany({
      where: { transaction: { statut: "VALIDE" } },
      include: { transaction: { select: { createdAt: true } } },
    }),
    prisma.caisse.findFirst(),
    prisma.transaction.findMany({
      where: { statut: "VALIDE" },
      orderBy: { createdAt: "desc" },
      include: { contributeur: true },
    }),
    prisma.dimeMensuelle.findMany({
      where: { statut: "VERSE" },
    }),
    prisma.depense.aggregate({
      where: { type: "DEPENSE_NORMALE", statut: "VALIDE" },
      _sum: { montant: true },
    }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "ECONOMIE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "EPARGNE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "ACTION_SOCIALE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "CONSTRUCTION" }, _sum: { montant: true } }),
  ]);

  const totalDepensesNormales = Number(depensesNormales._sum?.montant || 0);
  const grandTotalCaisse = Number(caisse?.soldeActuel || 0);
  const grandTotalCaisseRepartition = repartitions.reduce((sum, r) => sum + Number(r.montantCaisse), 0) - totalDepensesNormales;
  const grandTotalEconomie = repartitions.reduce((sum, r) => sum + Number(r.montantEconomie), 0) - Number(depEconomie._sum?.montant || 0);
  const grandTotalEpargne = repartitions.reduce((sum, r) => sum + Number(r.montantEpargne), 0) - Number(depEpargne._sum?.montant || 0);
  const grandTotalActionSociale = repartitions.reduce((sum, r) => sum + Number(r.montantActionSociale), 0) - Number(depActionSociale._sum?.montant || 0);
  const grandTotalDimeDeLaDimeBrut = repartitions.reduce((sum, r) => sum + Number(r.montantDimeDeLaDime || 0), 0);
  const grandTotalConstruction = repartitions.reduce((sum, r) => sum + Number(r.montantFondsDedie), 0) - Number(depConstruction._sum?.montant || 0);

  // Déduire les dîmes déjà versées (uniquement celles reçues avant la date de versement)
  const dimesVerseesMap = new Map(dimesVersees.map((d) => [`${d.annee}-${d.mois}`, d.dateVersement ? new Date(d.dateVersement) : null]));
  const montantDimeVersee = repartitions
    .filter((r) => {
      const d = new Date(r.transaction.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const dateVersement = dimesVerseesMap.get(key);
      if (!dateVersement) return false;
      return d <= dateVersement;
    })
    .reduce((s, r) => s + Number(r.montantDimeDeLaDime || 0), 0);
  const grandTotalDimeDeLaDime = grandTotalDimeDeLaDimeBrut - montantDimeVersee;

  const kpis = [
    { label: "Grande caisse", value: grandTotalCaisse, icon: Coins },
    { label: "Caisse", value: grandTotalCaisseRepartition, icon: Wallet },
    { label: "Économie", value: grandTotalEconomie, icon: PiggyBank },
    { label: "Épargne", value: grandTotalEpargne, icon: Wallet },
    { label: "Action sociale", value: grandTotalActionSociale, icon: Heart },
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      <TransactionsParMois
        transactions={transactions.map((t) => ({
          id: t.id,
          montant: Number(t.montant),
          categorie: t.categorie,
          createdAt: t.createdAt.toISOString(),
          statut: t.statut,
          contributeur: t.contributeur ? { nom: t.contributeur.nom } : null,
        }))}
        showStatut={false}
        title="Transactions (lecture seule)"
      />
    </div>
  );
}
