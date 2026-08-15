import DimeManager from "@/components/DimeManager";

export const dynamic = "force-dynamic";

export default async function DimesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Dîme mensuelle</h1>
        <p className="text-blanc/50 text-sm mt-1">
          Suivi automatique de la dîme — le montant est calculé depuis les répartitions des transactions DÎME
        </p>
      </div>

      <DimeManager />
    </div>
  );
}
