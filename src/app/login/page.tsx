"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Email ou mot de passe incorrect");
      setLoading(false);
    } else {
      toast.success("Connexion réussie");
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-noir flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/Logo.png" alt="Logo" width={100} height={100} className="rounded-xl mx-auto mb-4" style={{ width: "auto", height: "auto" }} />
          <h1 className="font-display text-3xl font-bold text-blanc">
            CTF <span className="text-or">Finance</span>
          </h1>
          <p className="text-blanc/50 text-sm mt-2">
            Réservé à l&apos;équipe de gestion financière
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-noir space-y-5">
          <div>
            <label className="label-or">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-or/50" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@ctf.org"
                className="input-noir pl-11 w-full"
              />
            </div>
          </div>

          <div>
            <label className="label-or">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-or/50" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-noir pl-11 pr-11 w-full"
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

          <button
            type="submit"
            disabled={loading}
            className="btn-or w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Se connecter"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
