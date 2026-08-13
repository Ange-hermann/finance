import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import { Eye, FileText } from "lucide-react";
import AnnotationForm from "@/components/AnnotationForm";

export const dynamic = "force-dynamic";

export default async function AuditorDashboard() {
  const [transactions, logs] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Audit — Commissaire aux comptes</h1>
        <p className="text-blanc/50 text-sm mt-1">Lecture seule + annotations d'audit</p>
      </div>

      <div className="card-noir">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Transactions à auditer</h3>
        </div>
        {transactions.length === 0 ? (
          <p className="text-blanc/40 text-sm text-center py-8">Aucune transaction pour le moment</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((t) => (
              <div key={t.id} className="border border-or/10 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-blanc font-medium">{formatMontant(Number(t.montant))} — {t.categorie}</p>
                    <p className="text-blanc/40 text-xs mt-1">
                      {formatDate(t.createdAt)} • Mode: {t.mode} • Agent: {t.agent?.nom || "N/A"}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs ${
                    t.statut === "VALIDE" ? "bg-green-500/10 text-green-400" :
                    t.statut === "EN_ATTENTE" ? "bg-or/10 text-or" :
                    "bg-red-500/10 text-red-400"
                  }`}>
                    {t.statut}
                  </span>
                </div>

                {t.repartition && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                    <div className="text-blanc/50">Économie: <span className="text-blanc">{formatMontant(Number(t.repartition.montantEconomie))}</span></div>
                    <div className="text-blanc/50">Épargne: <span className="text-blanc">{formatMontant(Number(t.repartition.montantEpargne))}</span></div>
                    <div className="text-blanc/50">Action sociale: <span className="text-blanc">{formatMontant(Number(t.repartition.montantActionSociale))}</span></div>
                    <div className="text-blanc/50">Caisse: <span className="text-blanc">{formatMontant(Number(t.repartition.montantCaisse))}</span></div>
                  </div>
                )}

                {t.annotations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {t.annotations.map((ann) => (
                      <div key={ann.id} className="bg-or/5 rounded-lg p-3 text-sm">
                        <p className="text-blanc/70">{ann.commentaire}</p>
                        <p className="text-blanc/30 text-xs mt-1">— {ann.auteur.nom}, {formatDate(ann.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}

                <AnnotationForm transactionId={t.id} />
              </div>
            ))}
          </div>
        )}
      </div>

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
