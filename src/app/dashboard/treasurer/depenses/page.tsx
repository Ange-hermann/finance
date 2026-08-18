import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import { Receipt, TrendingDown, Wallet } from "lucide-react";
import DepenseManager from "@/components/DepenseManager";
import DepenseExportButtons from "@/components/DepenseExportButtons";

export const dynamic = "force-dynamic";

export default async function DepensesPage() {
  const [depenses, transactions, caisse, repartitions, depensesNormales] = await Promise.all([
    prisma.depense.findMany({
      where: { statut: "VALIDE" },
      include: {
        transaction: { select: { id: true, montant: true, categorie: true, createdAt: true } },
        agent: { select: { id: true, nom: true } },
      },
      orderBy: { dateDepense: "desc" },
    }),
    prisma.transaction.findMany({
      where: { statut: "VALIDE" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, montant: true, categorie: true, createdAt: true },
    }),
    prisma.caisse.findFirst(),
    prisma.repartition.findMany({ where: { transaction: { statut: "VALIDE" } } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE" }, _sum: { montant: true } }),
  ]);

  const totalCulte = depenses
    .filter((d) => d.type === "DEPENSE_CULTE")
    .reduce((sum, d) => sum + Number(d.montant), 0);
  const totalNormale = depenses
    .filter((d) => d.type === "DEPENSE_NORMALE")
    .reduce((sum, d) => sum + Number(d.montant), 0);

  const totalDepensesNormales = Number(depensesNormales._sum?.montant || 0);
  const caisseRepartition = repartitions.reduce((sum, r) => sum + Number(r.montantCaisse), 0) - totalDepensesNormales;

  const stats = [
    { label: "Dépenses après culte", value: formatMontant(totalCulte), icon: Receipt },
    { label: "Dépenses normales", value: formatMontant(totalNormale), icon: TrendingDown },
    { label: "Total dépenses", value: formatMontant(totalCulte + totalNormale), icon: Wallet },
    { label: "Caisse de répartition", value: formatMontant(caisseRepartition), icon: Wallet },
  ];

  const depensesForExport = depenses.map((d) => ({
    id: d.id,
    type: d.type,
    categorie: d.categorie,
    sourceFonds: d.sourceFonds,
    description: d.description,
    montant: Number(d.montant),
    dateDepense: d.dateDepense.toISOString(),
    statut: d.statut,
    agent: d.agent ? { nom: d.agent.nom } : null,
  }));

  const exportTotals = [
    { label: "Dépenses après culte", value: totalCulte },
    { label: "Dépenses normales", value: totalNormale },
    { label: "Total dépenses", value: totalCulte + totalNormale },
    { label: "Caisse de répartition", value: caisseRepartition },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Dépenses</h1>
          <p className="text-blanc/50 text-sm mt-1">
            Dépenses après culte (avant répartition) et dépenses normales (caisse)
          </p>
        </div>
        <DepenseExportButtons depenses={depensesForExport} totals={exportTotals} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="card-noir hover:shadow-gold transition-all animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 text-or mb-2" />
            <p className="text-blanc/50 text-xs truncate">{stat.label}</p>
            <p className="font-display text-sm sm:text-base text-blanc mt-1 whitespace-nowrap">{stat.value}</p>
          </div>
        ))}
      </div>

      <DepenseManager transactions={transactions.map((t) => ({ ...t, montant: Number(t.montant), createdAt: t.createdAt.toISOString() }))} />
    </div>
  );
}
