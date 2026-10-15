import AutorisationWrapper from "@/components/AutorisationWrapper";

export default function AutorisationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-aeonik text-2xl sm:text-3xl font-bold text-blanc uppercase">Demandes d'autorisation</h1>
        <p className="text-blanc/50 text-sm mt-1">Gérez les demandes d'autorisation de dépenses</p>
      </div>

      <AutorisationWrapper />
    </div>
  );
}