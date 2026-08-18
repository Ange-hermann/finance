import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import { Eye, FileText, Coins, Wallet, PiggyBank, Heart, Building2, TrendingUp } from "lucide-react";
import AnnotationForm from "@/components/AnnotationForm";
import AuditorTransactions from "@/components/AuditorTransactions";

export const dynamic = "force-dynamic";

export default async function AuditorDashboard() {
  const [transactions, logs, caisse, repartitions, dimesVersees, depensesNormales, depEconomie, depEpargne, depActionSociale, depConstruction] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contributeur: true,
        agent: true,
        repartition: true,
        annotations: { include: { auteur: true } },
      },
    }),
    prisma.logAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: true },
    }),
    prisma.caisse.findFirst(),
    prisma.repartition.findMany({
      where: { transaction: { statut: "VALIDE" } },
      include: { transaction: { select: { createdAt: true } } },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Audit — Commissaire aux comptes</h1>
        <p className="text-blanc/50 text-sm mt-1">Lecture seule + annotations d'audit</p>
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

      <AuditorTransactions
        transactions={transactions.map((t) => ({
          id: t.id,
          montant: Number(t.montant),
          categorie: t.categorie,
          mode: t.mode,
          createdAt: t.createdAt.toISOString(),
          statut: t.statut,
          agent: t.agent ? { nom: t.agent.nom } : null,
          contributeur: t.contributeur ? { nom: t.contributeur.nom } : null,
          repartition: t.repartition ? {
            montantEconomie: Number(t.repartition.montantEconomie),
            montantEpargne: Number(t.repartition.montantEpargne),
            montantActionSociale: Number(t.repartition.montantActionSociale),
            montantCaisse: Number(t.repartition.montantCaisse),
          } : null,
          annotations: t.annotations.map((ann) => ({
            id: ann.id,
            commentaire: ann.commentaire,
            createdAt: ann.createdAt.toISOString(),
            auteur: { nom: ann.auteur.nom },
          })),
        }))}
        renderAnnotationForm={(transactionId) => <AnnotationForm transactionId={transactionId} />}
      />

      <div className="card-noir">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Journal d'audit (non modifiable)</h3>
        </div>
        {logs.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-8">Aucun log pour le moment</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-noir-soft text-sm">
                <div className="w-2 h-2 rounded-full bg-or mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-blanc">
                    <span className="text-or">{log.action}</span> — {log.cible}
                  </p>
                  {log.details && <p className="text-blanc/40 text-xs mt-1">{log.details}</p>}
                  <p className="text-blanc/30 text-xs mt-1">
                    {log.user?.nom || "Système"} • {formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
