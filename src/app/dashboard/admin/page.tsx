import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import Link from "next/link";
import { Users, Settings, TrendingUp, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [users, transactions, taux, caisse] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count({ where: { statut: "VALIDE" } }),
    prisma.tauxRepartition.count(),
    prisma.caisse.findFirst(),
  ]);

  const stats = [
    { label: "Utilisateurs", value: users.toString(), icon: Users, href: "/dashboard/admin/utilisateurs" },
    { label: "Transactions validées", value: transactions.toString(), icon: TrendingUp, href: "/dashboard/treasurer" },
    { label: "Taux configurés", value: taux.toString(), icon: Settings, href: "/dashboard/admin/taux" },
    { label: "Solde caisse", value: formatMontant(Number(caisse?.soldeActuel || 0)), icon: Wallet, href: "/dashboard/treasurer" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Administration</h1>
        <p className="text-blanc/50 text-sm mt-1">Gestion des utilisateurs, rôles et taux de répartition</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Link
            key={i}
            href={stat.href}
            className="card-noir hover:shadow-gold transition-all animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <stat.icon className="w-8 h-8 text-or mb-2" />
            <p className="text-blanc/50 text-xs">{stat.label}</p>
            <p className="font-display text-xl text-blanc mt-1">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/admin/utilisateurs" className="card-noir hover:shadow-gold transition-all">
          <Users className="w-10 h-10 text-or mb-3" />
          <h3 className="font-display text-xl text-blanc mb-1">Gestion des utilisateurs</h3>
          <p className="text-blanc/50 text-sm">Créer, modifier, désactiver des comptes et assigner des rôles</p>
        </Link>
        <Link href="/dashboard/admin/taux" className="card-noir hover:shadow-gold transition-all">
          <Settings className="w-10 h-10 text-or mb-3" />
          <h3 className="font-display text-xl text-blanc mb-1">Taux de répartition</h3>
          <p className="text-blanc/50 text-sm">Configurer les pourcentages de ventilation par catégorie</p>
        </Link>
      </div>
    </div>
  );
}
