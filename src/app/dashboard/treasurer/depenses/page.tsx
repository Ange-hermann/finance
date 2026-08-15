import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import { Receipt, TrendingDown, Wallet } from "lucide-react";
import DepenseManager from "@/components/DepenseManager";

export const dynamic = "force-dynamic";

export default async function DepensesPage() {
  const [depenses, transactions, caisse] = await Promise.all([
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
  ]);

  const totalCulte = depenses
    .filter((d) => d.type === "DEPENSE_CULTE")
    .reduce((sum, d) => sum + Number(d.montant), 0);
  const totalNormale = depenses
    .filter((d) => d.type === "DEPENSE_NORMALE")
    .reduce((sum, d) => sum + Number(d.montant), 0);

  const stats = [
    { label: "Dépenses après culte", value: formatMontant(totalCulte), icon: Receipt },
    { label: "Dépenses normales", value: formatMontant(totalNormale), icon: TrendingDown },
    { label: "Total dépenses", value: formatMontant(totalCulte + totalNormale), icon: Wallet },
    { label: "Solde caisse", value: formatMontant(Number(caisse?.soldeActuel || 0)), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Dépenses</h1>
        <p className="text-blanc/50 text-sm mt-1">
          Dépenses après culte (avant répartition) et dépenses normales (caisse)
        </p>
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
