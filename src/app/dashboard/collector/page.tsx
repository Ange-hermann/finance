import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import { Wallet, ScanLine, TrendingUp, Link2 } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "@/components/CopyButton";

export default async function CollectorDashboard() {
  const session = await getServerSession(authOptions);
  const agentId = (session?.user as any)?.id;

  const [transactions, stats] = await Promise.all([
    prisma.transaction.findMany({
      where: { agentId, mode: "MANUEL" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { contributeur: true },
    }),
    prisma.transaction.aggregate({
      where: { agentId, mode: "MANUEL", statut: "VALIDE" },
      _sum: { montant: true },
      _count: true,
    }),
  ]);

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const lienPaiement = `${appUrl}/pay/general`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Espace Agent</h1>
        <p className="text-blanc/50 text-sm mt-1">Saisie manuelle et scan des paiements</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/collector/saisie" className="card-noir hover:shadow-gold transition-all group">
          <Wallet className="w-10 h-10 text-or mb-3" />
          <h3 className="font-display text-xl text-blanc mb-1">Saisie manuelle</h3>
          <p className="text-blanc/50 text-sm">Enregistrer un paiement reçu en main propre</p>
        </Link>
        <Link href="/dashboard/collector/scan" className="card-noir hover:shadow-gold transition-all group">
          <ScanLine className="w-10 h-10 text-or mb-3" />
          <h3 className="font-display text-xl text-blanc mb-1">Scanner un QR code</h3>
          <p className="text-blanc/50 text-sm">Rapprocher un paiement via scan</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-noir">
          <TrendingUp className="w-8 h-8 text-or mb-2" />
          <p className="text-blanc/50 text-sm">Total saisi</p>
          <p className="font-display text-2xl text-blanc">{formatMontant(Number(stats._sum.montant || 0))}</p>
        </div>
        <div className="card-noir">
          <Wallet className="w-8 h-8 text-or mb-2" />
          <p className="text-blanc/50 text-sm">Transactions saisies</p>
          <p className="font-display text-2xl text-blanc">{stats._count}</p>
        </div>
        <div className="card-noir">
          <Link2 className="w-8 h-8 text-or mb-2" />
          <p className="text-blanc/50 text-sm">Lien de paiement</p>
          <p className="text-blanc/40 text-xs truncate">{lienPaiement}</p>
        </div>
      </div>

      {/* QR Code partageable */}
      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">QR Code de paiement à partager</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="bg-blanc-pur p-3 sm:p-4 rounded-xl shrink-0">
            <QRCodeSVG value={lienPaiement} size={160} />
          </div>
          <div className="flex-1">
            <p className="text-blanc/60 text-sm mb-2">
              Partagez ce QR code ou le lien ci-dessous avec les fidèles via WhatsApp, SMS, ou affiche.
              Ils pourront payer sans créer de compte.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <input
                readOnly
                value={lienPaiement}
                className="input-noir flex-1 text-sm"
              />
              <CopyButton text={lienPaiement} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card-noir">
        <h3 className="font-display text-xl text-blanc mb-4">Dernières transactions saisies</h3>
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
                  <th className="pb-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-or/5">
                    <td className="py-3 pr-4 text-blanc/60 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="py-3 pr-4 text-blanc font-medium whitespace-nowrap">{formatMontant(Number(t.montant))}</td>
                    <td className="py-3 pr-4 text-blanc/60 hidden sm:table-cell">{t.categorie}</td>
                    <td className="py-3 pr-4 text-blanc/60 hidden sm:table-cell">{t.contributeur?.nom || "Anonyme"}</td>
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
