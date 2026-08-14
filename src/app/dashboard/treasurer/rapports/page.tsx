import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import ExportButtons from "@/components/ExportButtons";

export const dynamic = "force-dynamic";

export default async function RapportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [transactions, repartitions, caisse] = await Promise.all([
    prisma.transaction.findMany({
      where: { statut: "VALIDE" },
      orderBy: { createdAt: "desc" },
      include: { contributeur: true, agent: true, repartition: true },
    }),
    prisma.repartition.findMany({
      where: { transaction: { statut: "VALIDE" } },
    }),
    prisma.caisse.findFirst(),
  ]);

  const grandTotalEconomie = repartitions.reduce((sum, r) => sum + Number(r.montantEconomie), 0);
  const grandTotalEpargne = repartitions.reduce((sum, r) => sum + Number(r.montantEpargne), 0);
  const grandTotalActionSociale = repartitions.reduce((sum, r) => sum + Number(r.montantActionSociale), 0);
  const grandTotalDimeDeLaDime = repartitions.reduce((sum, r) => sum + Number(r.montantDimeDeLaDime || 0), 0);
  const grandTotalConstruction = repartitions.reduce((sum, r) => sum + Number(r.montantFondsDedie), 0);
  const grandTotalCaisse = Number(caisse?.soldeActuel || 0);
  const totalGeneral = grandTotalEconomie + grandTotalEpargne + grandTotalActionSociale + grandTotalDimeDeLaDime + grandTotalConstruction + grandTotalCaisse;

  const totals = [
    { label: "Grand total Économie", value: grandTotalEconomie },
    { label: "Grand total Épargne", value: grandTotalEpargne },
    { label: "Grand total Action sociale", value: grandTotalActionSociale },
    { label: "Grand total Dîme de la dîme", value: grandTotalDimeDeLaDime },
    { label: "Grand total Construction", value: grandTotalConstruction },
    { label: "Grand total Caisse", value: grandTotalCaisse },
    { label: "Total général", value: totalGeneral },
  ];

  const serializedTransactions = transactions.map((t) => ({
    id: t.id,
    montant: Number(t.montant),
    categorie: t.categorie,
    mode: t.mode,
    referencePaiement: t.referencePaiement,
    createdAt: t.createdAt.toISOString(),
    contributeur: t.contributeur ? { nom: t.contributeur.nom } : null,
    agent: t.agent ? { nom: t.agent.nom } : null,
    repartition: t.repartition ? {
      montantEconomie: Number(t.repartition.montantEconomie),
      montantEpargne: Number(t.repartition.montantEpargne),
      montantActionSociale: Number(t.repartition.montantActionSociale),
      montantDimeDeLaDime: t.repartition.montantDimeDeLaDime ? Number(t.repartition.montantDimeDeLaDime) : null,
      montantCaisse: Number(t.repartition.montantCaisse),
      montantFondsDedie: Number(t.repartition.montantFondsDedie),
    } : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Rapports & Export</h1>
          <p className="text-blanc/50 text-sm mt-1">Génération de rapports PDF et Excel</p>
        </div>
        <ExportButtons transactions={serializedTransactions} totals={totals} />
      </div>

      <div className="card-noir">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Grands totaux</h3>
        </div>
        <div className="space-y-3">
          {totals.map((t, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-2 p-3 rounded-xl ${
                t.label === "Total général" ? "bg-or/10 border border-or/30" : "bg-noir-soft"
              }`}
            >
              <span className={`text-sm min-w-0 truncate ${t.label === "Total général" ? "text-or font-medium" : "text-blanc/60"}`}>
                {t.label}
              </span>
              <span className={`font-display text-sm sm:text-base whitespace-nowrap ${t.label === "Total général" ? "text-or sm:text-xl" : "text-blanc"}`}>
                {formatMontant(t.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">Toutes les transactions validées</h3>
        {transactions.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-8">Aucune transaction</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-or/70 text-left border-b border-or/10">
                  <th className="pb-3 pr-4 whitespace-nowrap">Date</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Montant</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Catégorie</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Mode</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Agent</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Contributeur</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Référence</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-or/5">
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="py-3 pr-4 text-blanc font-medium whitespace-nowrap">{formatMontant(Number(t.montant))}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.categorie}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.mode}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.agent?.nom || "—"}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.contributeur?.nom || "Anonyme"}</td>
                    <td className="py-3 pr-4 text-blanc/40 text-xs whitespace-nowrap">{t.referencePaiement || "—"}</td>
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
