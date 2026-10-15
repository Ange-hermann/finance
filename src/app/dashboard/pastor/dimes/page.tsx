import { prisma } from "@/lib/prisma";
import { getSuiviDimeDeLaDime } from "@/lib/dimes";
import DimesManager from "./DimesManager";

export default async function PastorDimesPage() {
  const {
    dimes,
    moisArray,
    totalDimes,
    partPasteurDons,
    totalRecu,
    dimeDeLaDimeRestante,
  } = await getSuiviDimeDeLaDime();

  // Dîmes marquées (déjà traitées)
  const dimesDistribuees = await prisma.repartition.count({
    where: {
      transaction: { categorie: "DIME" },
      montantDimeDeLaDime: { not: null },
    },
  });

  const dimesNonDistribuees = dimes.filter((d) => !d.repartition);

  return (
    <DimesManager
      dimes={dimes}
      totalDimes={totalDimes}
      totalRecu={totalRecu}
      dimeDeLaDime={dimeDeLaDimeRestante}
      partPasteurDons={partPasteurDons}
      dimesDistribuees={dimesDistribuees}
      dimesNonDistribuees={dimesNonDistribuees}
      dimesParMois={moisArray}
    />
  );
}
