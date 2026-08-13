import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Users } from "lucide-react";
import UserManager from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nom: true,
      email: true,
      telephone: true,
      role: true,
      actif: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Gestion des utilisateurs</h1>
        <p className="text-blanc/50 text-sm mt-1">Créer, modifier, désactiver des comptes et assigner des rôles</p>
      </div>

      <UserManager users={users} />

      <div className="card-noir">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-or" />
          <h3 className="font-display text-xl text-blanc">Liste des utilisateurs</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-or/70 text-left border-b border-or/10">
                <th className="pb-3 pr-4">Nom</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Téléphone</th>
                <th className="pb-3 pr-4">Rôle</th>
                <th className="pb-3 pr-4">Statut</th>
                <th className="pb-3">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-or/5">
                  <td className="py-3 pr-4 text-blanc">{u.nom}</td>
                  <td className="py-3 pr-4 text-blanc/60">{u.email}</td>
                  <td className="py-3 pr-4 text-blanc/60">{u.telephone || "—"}</td>
                  <td className="py-3 pr-4">
                    <span className="text-or text-xs px-2 py-1 rounded-lg bg-or/10">{u.role}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-1 rounded-lg ${
                      u.actif ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {u.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="py-3 text-blanc/60">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
