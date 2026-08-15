"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Eye, EyeOff } from "lucide-react";

interface UserItem {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
  actif: boolean;
  createdAt: Date;
}

export default function UserManager({ users }: { users: UserItem[] }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    role: "COLLECTOR",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Utilisateur créé avec succès");
        setShowForm(false);
        setForm({ nom: "", email: "", telephone: "", role: "COLLECTOR", password: "" });
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const toggleActif = async (userId: string, currentActif: boolean) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, actif: !currentActif }),
      });

      if (res.ok) {
        toast.success(`Utilisateur ${!currentActif ? "activé" : "désactivé"}`);
        window.location.reload();
      }
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-or text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card-noir space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-or">Nom complet *</label>
              <input
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="input-noir w-full"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="label-or">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-noir w-full"
                placeholder="jean@ctf.org"
              />
            </div>
            <div>
              <label className="label-or">Téléphone</label>
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="input-noir w-full"
                placeholder="+225 ..."
              />
            </div>
            <div>
              <label className="label-or">Rôle *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input-noir w-full"
              >
                <option value="COLLECTOR">Agent de saisie (Collector)</option>
                <option value="TREASURER">Trésorière (Treasurer)</option>
                <option value="PASTOR">Pasteur (Pastor)</option>
                <option value="AUDITOR">Commissaire aux comptes (Auditor)</option>
                <option value="ADMIN">Administrateur (Admin)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label-or">Mot de passe *</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-noir w-full pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-or/50 hover:text-or transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-or flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer l'utilisateur"}
          </button>
        </form>
      )}

      {/* Quick toggle buttons */}
      <div className="flex flex-wrap gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => toggleActif(u.id, u.actif)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              u.actif
                ? "bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400"
                : "bg-red-500/10 text-red-400 hover:bg-green-500/10 hover:text-green-400"
            }`}
            title={u.actif ? "Cliquer pour désactiver" : "Cliquer pour activer"}
          >
            {u.nom} ({u.role})
          </button>
        ))}
      </div>
    </div>
  );
}
