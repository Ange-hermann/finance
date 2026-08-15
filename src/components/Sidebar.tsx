"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Wallet,
  ScanLine,
  FileText,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ShieldCheck,
  Eye,
  Menu,
  X,
  Receipt,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const roleMenus: Record<string, { href: string; label: string; icon: any }[]> = {
  COLLECTOR: [
    { href: "/dashboard/collector", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/dashboard/collector/saisie", label: "Saisie manuelle", icon: Wallet },
    { href: "/dashboard/collector/scan", label: "Scan QR", icon: ScanLine },
  ],
  TREASURER: [
    { href: "/dashboard/treasurer", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/dashboard/treasurer/depenses", label: "Dépenses", icon: Receipt },
    { href: "/dashboard/treasurer/dimes", label: "Dîme mensuelle", icon: Calendar },
    { href: "/dashboard/treasurer/rapports", label: "Rapports & Export", icon: FileText },
  ],
  PASTOR: [
    { href: "/dashboard/pastor", label: "Vue globale", icon: BarChart3 },
  ],
  AUDITOR: [
    { href: "/dashboard/auditor", label: "Audit & Annotations", icon: Eye },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/dashboard/admin/taux", label: "Taux de répartition", icon: Settings },
    { href: "/dashboard/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  ],
};

const roleLabels: Record<string, string> = {
  COLLECTOR: "Agent de saisie",
  TREASURER: "Trésorière",
  PASTOR: "Pasteur",
  AUDITOR: "Commissaire aux comptes",
  ADMIN: "Administrateur",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (session?.user as any)?.role || "COLLECTOR";
  const menus = roleMenus[role] || [];
  const roleLabel = roleLabels[role] || role;

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-noir-soft border-b border-or/20 flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/Logo.png" alt="Logo" width={40} height={40} className="rounded-lg" style={{ width: "auto", height: "auto" }} />
          <span className="font-display text-base font-bold text-blanc">
            CTF <span className="text-or">Finance</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-blanc/70 hover:text-or p-2"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "w-64 min-h-screen bg-noir-soft border-r border-or/20 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-or/20 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <Image src="/Logo.png" alt="Logo" width={48} height={48} className="rounded-lg" style={{ width: "auto", height: "auto" }} />
            <span className="font-display text-lg font-bold text-blanc">
              CTF <span className="text-or">Finance</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-blanc/60 hover:text-or"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="px-6 py-4 border-b border-or/10">
        <div className="flex items-center gap-2 text-or/80 text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>{roleLabel}</span>
        </div>
        <p className="text-blanc/50 text-sm mt-1 truncate">
          {session?.user?.name || session?.user?.email}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {menus.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                isActive
                  ? "bg-or/10 text-or border border-or/30"
                  : "text-blanc/60 hover:text-blanc hover:bg-noir-card"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-or/20">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-blanc/60 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
    </>
  );
}
