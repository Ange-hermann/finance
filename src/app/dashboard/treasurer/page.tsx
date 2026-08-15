import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import Link from "next/link";
import { TrendingUp, Wallet, PiggyBank, Heart, Building2, Coins, Receipt, Calendar, Clock, Globe } from "lucide-react";
import TreasurerCharts from "@/components/TreasurerCharts";

export default async function TreasurerDashboard() {
  const now = new Date();

  const [transactions, repartitions, caisse, depenses, allTransactions, dimeMoisStatut, dimesVersees] = await Promise.all([
    prisma.transaction.findMany({
      where: { statut: "VALIDE" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { contributeur: true, agent: true, repartition: true },
    }),
    prisma.repartition.findMany({
      where: { transaction: { statut: "VALIDE" } },
      include: { transaction: { select: { createdAt: true, categorie: true } } },
    }),
    prisma.caisse.findFirst(),
    prisma.depense.findMany({
      where: { statut: "VALIDE" },
      include: { transaction: { select: { createdAt: true } } },
    }),
    prisma.transaction.findMany({
      where: { statut: "VALIDE" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dimeMensuelle.findUnique({
      where: { mois_annee: { mois: now.getMonth() + 1, annee: now.getFullYear() } },
    }),
    prisma.dimeMensuelle.findMany({
      where: { statut: "VERSE" },
    }),
  ]);

  const moisActuel = now.getMonth();
  const anneeActuelle = now.getFullYear();

  // Helper : est-ce ce mois-ci ?
  const estCeMois = (date: Date) => date.getMonth() === moisActuel && date.getFullYear() === anneeActuelle;

  // Helper : est-ce un mois passé ?
  const estMoisPasse = (date: Date) =>
    date.getFullYear() < anneeActuelle || (date.getFullYear() === anneeActuelle && date.getMonth() < moisActuel);

  // === MOIS EN COURS ===
  const txMoisActuel = allTransactions.filter((t) => estCeMois(new Date(t.createdAt)));
  const recettesMoisActuel = txMoisActuel.reduce((s, t) => s + Number(t.montant), 0);
  const depensesCulteMois = depenses
    .filter((d) => d.type === "DEPENSE_CULTE" && estCeMois(new Date(d.dateDepense)))
    .reduce((s, d) => s + Number(d.montant), 0);
  const depensesNormalesMois = depenses
    .filter((d) => d.type === "DEPENSE_NORMALE" && estCeMois(new Date(d.dateDepense)))
    .reduce((s, d) => s + Number(d.montant), 0);
  const repartitionsMois = repartitions.filter((r) => estCeMois(new Date(r.transaction.createdAt)));
  const dimeMoisActuel = repartitionsMois.reduce((s, r) => s + Number(r.montantDimeDeLaDime || 0), 0);
  const nbTransactionsMois = txMoisActuel.length;

  // === MOIS PASSÉS (par mois) ===
  const moisPassesMap: Record<string, {
    mois: number; annee: number; moisNom: string;
    recettes: number; depensesCulte: number; depensesNormales: number;
    dime: number; nbTx: number;
  }> = {};

  const MOIS_NOMS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

  for (const t of allTransactions) {
    const d = new Date(t.createdAt);
    if (!estMoisPasse(d)) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!moisPassesMap[key]) {
      moisPassesMap[key] = {
        mois: d.getMonth(), annee: d.getFullYear(), moisNom: `${MOIS_NOMS[d.getMonth()]} ${d.getFullYear()}`,
        recettes: 0, depensesCulte: 0, depensesNormales: 0, dime: 0, nbTx: 0,
      };
    }
    moisPassesMap[key].recettes += Number(t.montant);
    moisPassesMap[key].nbTx++;
  }

  for (const r of repartitions) {
    const d = new Date(r.transaction.createdAt);
    if (!estMoisPasse(d)) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (moisPassesMap[key]) {
      moisPassesMap[key].dime += Number(r.montantDimeDeLaDime || 0);
    }
  }

  for (const d of depenses) {
    const date = new Date(d.dateDepense);
    if (!estMoisPasse(date)) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (moisPassesMap[key]) {
      if (d.type === "DEPENSE_CULTE") moisPassesMap[key].depensesCulte += Number(d.montant);
      else moisPassesMap[key].depensesNormales += Number(d.montant);
    }
  }

  const moisPasses = Object.values(moisPassesMap).sort((a, b) => b.annee - a.annee || b.mois - a.mois);

  // === VUE GLOBALE ===
  const totalRecettes = allTransactions.reduce((s, t) => s + Number(t.montant), 0);
  const totalDepensesCulte = depenses.filter((d) => d.type === "DEPENSE_CULTE").reduce((s, d) => s + Number(d.montant), 0);
  const totalDepensesNormales = depenses.filter((d) => d.type === "DEPENSE_NORMALE").reduce((s, d) => s + Number(d.montant), 0);
  const depParSource = (source: string) => depenses.filter((d) => d.type === "DEPENSE_NORMALE" && d.sourceFonds === source).reduce((s, d) => s + Number(d.montant), 0);
  const grandTotalEconomie = repartitions.reduce((sum, r) => sum + Number(r.montantEconomie), 0) - depParSource("ECONOMIE");
  const grandTotalEpargne = repartitions.reduce((sum, r) => sum + Number(r.montantEpargne), 0) - depParSource("EPARGNE");
  const grandTotalActionSociale = repartitions.reduce((sum, r) => sum + Number(r.montantActionSociale), 0) - depParSource("ACTION_SOCIALE");
  const grandTotalDimeDeLaDimeBrut = repartitions.reduce((sum, r) => sum + Number(r.montantDimeDeLaDime || 0), 0);

  // Déduire les dîmes déjà versées
  const dimesVerseesSet = new Set(dimesVersees.map((d) => `${d.annee}-${d.mois}`));
  const montantDimeVersee = repartitions
    .filter((r) => {
      const d = new Date(r.transaction.createdAt);
      return dimesVerseesSet.has(`${d.getFullYear()}-${d.getMonth() + 1}`);
    })
    .reduce((s, r) => s + Number(r.montantDimeDeLaDime || 0), 0);
  const grandTotalDimeDeLaDime = grandTotalDimeDeLaDimeBrut - montantDimeVersee;
  const grandTotalConstruction = repartitions.reduce((sum, r) => sum + Number(r.montantFondsDedie), 0) - depParSource("CONSTRUCTION");
  const grandTotalCaisse = Number(caisse?.soldeActuel || 0);
  const grandTotalCaisseRepartition = repartitions.reduce((sum, r) => sum + Number(r.montantCaisse), 0) - totalDepensesNormales;

  // Charts data
  const monthMap: Record<string, { offrandes: number; dimes: number }> = {};
  allTransactions.forEach((t) => {
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

  const kpisGlobaux = [
    { label: "Économie", value: grandTotalEconomie, icon: PiggyBank },
    { label: "Épargne", value: grandTotalEpargne, icon: Wallet },
    { label: "Action sociale", value: grandTotalActionSociale, icon: Heart },
    { label: "Construction", value: grandTotalConstruction, icon: Building2 },
    { label: "Caisse", value: grandTotalCaisseRepartition, icon: Wallet },
    { label: "Dîme de la dîme", value: grandTotalDimeDeLaDime, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Tableau de bord — Trésorière</h1>
          <p className="text-blanc/50 text-sm mt-1">Vue complète : mois en cours, mois passés et global</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/treasurer/depenses" className="btn-outline-or text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Dépenses
          </Link>
          <Link href="/dashboard/treasurer/dimes" className="btn-outline-or text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Dîme
          </Link>
        </div>
      </div>

      {/* === CE MOIS-CI === */}
      <div className="card-noir border-or/30">
        <h2 className="font-display text-xl text-or mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Ce mois-ci — {MOIS_NOMS[moisActuel]} {anneeActuelle}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-noir-soft rounded-xl p-3">
            <TrendingUp className="w-5 h-5 text-green-400 mb-1" />
            <p className="text-blanc/50 text-xs">Recettes</p>
            <p className="font-display text-sm text-blanc mt-1 whitespace-nowrap">{formatMontant(recettesMoisActuel)}</p>
          </div>
          <div className="bg-noir-soft rounded-xl p-3">
            <Receipt className="w-5 h-5 text-or mb-1" />
            <p className="text-blanc/50 text-xs">Dépenses culte</p>
            <p className="font-display text-sm text-blanc mt-1 whitespace-nowrap">{formatMontant(depensesCulteMois)}</p>
          </div>
          <div className="bg-noir-soft rounded-xl p-3">
            <Receipt className="w-5 h-5 text-red-400 mb-1" />
            <p className="text-blanc/50 text-xs">Dépenses normales</p>
            <p className="font-display text-sm text-blanc mt-1 whitespace-nowrap">{formatMontant(depensesNormalesMois)}</p>
          </div>
          <div className="bg-noir-soft rounded-xl p-3">
            <Coins className="w-5 h-5 text-or mb-1" />
            <p className="text-blanc/50 text-xs">Dîme à donner</p>
            <p className="font-display text-sm text-blanc mt-1 whitespace-nowrap">{formatMontant(dimeMoisActuel)}</p>
            {dimeMoisActuel > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-lg mt-1 inline-block ${
                dimeMoisStatut?.statut === "VERSE"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-or/10 text-or"
              }`}>
                {dimeMoisStatut?.statut === "VERSE" ? "✓ Donnée" : "Non donnée"}
              </span>
            )}
          </div>
          <div className="bg-noir-soft rounded-xl p-3">
            <Wallet className="w-5 h-5 text-blanc/60 mb-1" />
            <p className="text-blanc/50 text-xs">Transactions</p>
            <p className="font-display text-sm text-blanc mt-1">{nbTransactionsMois}</p>
          </div>
        </div>
      </div>

      {/* === MOIS PASSÉS === */}
      {moisPasses.length > 0 && (
        <div className="card-noir">
          <h2 className="font-display text-xl text-blanc mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-or" />
            Mois passés
          </h2>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-or/70 text-left border-b border-or/10">
                  <th className="pb-3 pr-4 whitespace-nowrap">Mois</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Recettes</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Dép. culte</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Dép. normales</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Net</th>
                  <th className="pb-3 pr-4 whitespace-nowrap">Dîme</th>
                  <th className="pb-3 whitespace-nowrap">Tx</th>
                </tr>
              </thead>
              <tbody>
                {moisPasses.map((m, i) => {
                  const net = m.recettes - m.depensesCulte - m.depensesNormales;
                  return (
                    <tr key={i} className="border-b border-or/5 hover:bg-or/5">
                      <td className="py-3 pr-4 text-blanc whitespace-nowrap">{m.moisNom}</td>
                      <td className="py-3 pr-4 text-green-400 whitespace-nowrap">{formatMontant(m.recettes)}</td>
                      <td className="py-3 pr-4 text-or whitespace-nowrap">{formatMontant(m.depensesCulte)}</td>
                      <td className="py-3 pr-4 text-red-400 whitespace-nowrap">{formatMontant(m.depensesNormales)}</td>
                      <td className={`py-3 pr-4 font-medium whitespace-nowrap ${net >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatMontant(net)}
                      </td>
                      <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{formatMontant(m.dime)}</td>
                      <td className="py-3 text-blanc/60">{m.nbTx}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === VUE GLOBALE === */}
      <div className="card-noir border-or/30">
        <h2 className="font-display text-xl text-or mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Vue globale — à ce jour
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-noir-soft rounded-xl p-3">
            <TrendingUp className="w-5 h-5 text-green-400 mb-1" />
            <p className="text-blanc/50 text-xs">Total recettes</p>
            <p className="font-display text-sm text-blanc mt-1 whitespace-nowrap">{formatMontant(totalRecettes)}</p>
          </div>
          <div className="bg-noir-soft rounded-xl p-3">
            <Receipt className="w-5 h-5 text-red-400 mb-1" />
            <p className="text-blanc/50 text-xs">Total dépenses</p>
            <p className="font-display text-sm text-blanc mt-1 whitespace-nowrap">{formatMontant(totalDepensesCulte + totalDepensesNormales)}</p>
          </div>
          <div className="bg-noir-soft rounded-xl p-3 border-or/20">
            <Coins className="w-5 h-5 text-or mb-1" />
            <p className="text-blanc/50 text-xs">Grande caisse (solde général)</p>
            <p className="font-display text-sm text-or mt-1 whitespace-nowrap">{formatMontant(grandTotalCaisse)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpisGlobaux.map((kpi, i) => (
            <div key={i} className="bg-noir-soft rounded-xl p-3">
              <kpi.icon className="w-5 h-5 text-or mb-1" />
              <p className="text-blanc/50 text-xs truncate">{kpi.label}</p>
              <p className="font-display text-sm text-blanc mt-1 whitespace-nowrap">{formatMontant(kpi.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <TreasurerCharts chartData={chartData} pieData={pieData} />

      {/* Transactions table */}
      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">Dernières transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-8">Aucune transaction pour le moment</p>
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
                  <th className="pb-3 whitespace-nowrap">Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-or/5 hover:bg-or/5">
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="py-3 pr-4 text-blanc font-medium whitespace-nowrap">{formatMontant(Number(t.montant))}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.categorie}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.mode}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.agent?.nom || "—"}</td>
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{t.contributeur?.nom || "Anonyme"}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs ${
                        t.statut === "VALIDE" ? "bg-green-500/10 text-green-400" :
                        t.statut === "EN_ATTENTE" ? "bg-or/10 text-or" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {t.statut}
                      </span>
                    </td>
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
