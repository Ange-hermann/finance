import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMontant, formatDate } from "@/lib/utils";
import { Wallet, Calendar, CheckCircle, Clock, TrendingUp, Loader2 } from "lucide-react";
import DimesManager from "./DimesManager";

export default async function PastorDimesPage() {
  const session = await getServerSession(authOptions);

  // Récupérer toutes les dîmes
  const dimes = await prisma.transaction.findMany({
    where: { categorie: "DIME" },
    orderBy: { createdAt: "desc" },
    include: { contributeur: true, repartition: true },
  });

  // Grouper par mois
  const dimesParMois = dimes.reduce((acc, dime) => {
    const date = new Date(dime.createdAt);
    const mois = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const moisKey = date.toISOString().slice(0, 7); // YYYY-MM pour tri

    if (!acc[moisKey]) {
      acc[moisKey] = {
        nomMois: mois,
        dimes: [],
        total: 0,
        dimeDeLaDime: 0,
        distribue: false,
      };
    }

    acc[moisKey].dimes.push(dime);
    acc[moisKey].total += Number(dime.montant);
    acc[moisKey].dimeDeLaDime = Math.round(acc[moisKey].total * 0.10);

    // Vérifier si toutes les dîmes du mois sont distribuées
    acc[moisKey].distribue = acc[moisKey].dimes.every((d: any) => d.repartition);

    return acc;
  }, {} as Record<string, any>);

  // Calculer le total global
  const totalDimes = dimes.reduce((sum, d) => sum + Number(d.montant), 0);
  const dimeDeLaDime = Math.round(totalDimes * 0.10);

  // Récupérer les dîmes qui ont déjà été distribuées
  const dimesDistribuees = await prisma.repartition.count({
    where: {
      transaction: { categorie: "DIME" },
      montantDimeDeLaDime: { not: null },
    },
  });

  // Part du pasteur (10%) prélevée sur les offrandes, dons, projets, etc.
  const partPasteurDonsAgg = await prisma.repartition.aggregate({
    _sum: { montantDimeDeLaDime: true },
    where: {
      transaction: { categorie: { not: "DIME" } },
      montantDimeDeLaDime: { not: null },
    },
  });
  const partPasteurDons = Number(partPasteurDonsAgg._sum.montantDimeDeLaDime || 0);

  // Dîmes non distribuées
  const dimesNonDistribuees = dimes.filter(d => !d.repartition);

  // Convertir en tableau et trier par date (plus récent en premier)
  const moisArray = Object.entries(dimesParMois)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.key.localeCompare(a.key));

  return (
    <DimesManager
      dimes={dimes}
      totalDimes={totalDimes}
      dimeDeLaDime={dimeDeLaDime}
      partPasteurDons={partPasteurDons}
      dimesDistribuees={dimesDistribuees}
      dimesNonDistribuees={dimesNonDistribuees}
      dimesParMois={moisArray}
    />
  );
}