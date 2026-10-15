import { redirect } from "next/navigation";

export default function PaymentErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-noir">
      <div className="card-noir text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-aeonik text-2xl text-blanc mb-2">Paiement échoué</h1>
        <p className="text-blanc/60 mb-6">Une erreur s'est produite lors du traitement de votre paiement.</p>
        <button
          onClick={() => redirect("/dashboard")}
          className="btn-or"
        >
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
}