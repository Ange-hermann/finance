"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const [statut, setStatut] = useState<"verification" | "paye" | "attente" | "erreur">("verification");

  useEffect(() => {
    const query = searchParams.toString();
    if (!query) {
      setStatut("attente");
      return;
    }

    fetch(`/api/payment/verify?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statut === "PAYE") {
          setStatut("paye");
        } else if (data.error) {
          setStatut("attente");
        } else {
          setStatut("attente");
        }
      })
      .catch(() => setStatut("attente"));
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-noir">
      <div className="card-noir text-center p-8 max-w-md">
        {statut === "verification" ? (
          <>
            <div className="w-16 h-16 bg-or/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-or animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <h1 className="font-aeonik text-2xl text-blanc mb-2">Vérification du paiement…</h1>
            <p className="text-blanc/60 mb-6">Confirmation en cours auprès de Genius Pay.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-aeonik text-2xl text-blanc mb-2">Paiement réussi</h1>
            <p className="text-blanc/60 mb-6">
              {statut === "paye"
                ? "Votre paiement a été confirmé et enregistré dans la caisse."
                : "Votre paiement a été traité. La confirmation peut prendre quelques instants."}
            </p>
            <Link href="/dashboard" className="btn-or inline-block">
              Retour au tableau de bord
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-noir">
          <div className="card-noir text-center p-8 max-w-md">
            <p className="text-blanc/60">Chargement…</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
