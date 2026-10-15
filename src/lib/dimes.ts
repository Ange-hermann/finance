import { prisma } from "@/lib/prisma";

// Suivi de la dîme de la dîme du pasteur, par mois.
// Reçu mensuel = dîmes (100% au pasteur) + part de 10% sur les dons.
// Dîme de la dîme due = 10% du total reçu ; "remis" = dépenses PASTEUR
// taguées "dîme de la dîme" (remise physique ou retrait en ligne).
export async function getSuiviDimeDeLaDime() {
  const [dimes, repartitionsDons, depensesTithe] = await Promise.all([
    prisma.transaction.findMany({
      where: { categorie: "DIME", statut: "VALIDE" },
      orderBy: { createdAt: "desc" },
      include: { contributeur: true, repartition: true },
    }),
    prisma.repartition.findMany({
      where: {
        montantDimeDeLaDime: { not: null },
        transaction: { categorie: { not: "DIME" }, statut: "VALIDE" },
      },
      include: { transaction: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.depense.findMany({
      where: {
        sourceFonds: "PASTEUR",
        statut: { not: "ANNULE" },
        description: { contains: "dîme de la dîme", mode: "insensitive" },
      },
    }),
  ]);

  const moisMap: Record<string, any> = {};

  const ensureMois = (key: string, date: Date) => {
    if (!moisMap[key]) {
      moisMap[key] = {
        nomMois: date.toLocaleString("fr-FR", { month: "long", year: "numeric" }),
        dimes: [],
        partDons: 0,
        total: 0,
        dimeDeLaDime: 0,
        remis: 0,
        distribue: false,
      };
    }
    return moisMap[key];
  };

  for (const dime of dimes) {
    const date = new Date(dime.createdAt);
    const m = ensureMois(date.toISOString().slice(0, 7), date);
    m.dimes.push(dime);
    m.total += Number(dime.montant);
  }

  for (const r of repartitionsDons) {
    const date = new Date(r.transaction.createdAt);
    const m = ensureMois(date.toISOString().slice(0, 7), date);
    const part = Number(r.montantDimeDeLaDime || 0);
    m.partDons += part;
    m.total += part;
  }

  for (const [key, m] of Object.entries(moisMap)) {
    m.dimeDeLaDime = Math.round(m.total * 0.10);
    m.remis = depensesTithe
      .filter((d) => d.description.includes(key))
      .reduce((s, d) => s + Number(d.montant), 0);
    m.distribue =
      (m.dimeDeLaDime > 0 && m.remis >= m.dimeDeLaDime) ||
      (m.dimes.length > 0 && m.dimes.every((d: any) => d.repartition));
  }

  const totalDimes = dimes.reduce((s, d) => s + Number(d.montant), 0);
  const partPasteurDons = repartitionsDons.reduce(
    (s, r) => s + Number(r.montantDimeDeLaDime || 0),
    0
  );
  const totalRecu = totalDimes + partPasteurDons;
  const dimeDeLaDimeDue = Math.round(totalRecu * 0.10);
  const dejaRemis = depensesTithe.reduce((s, d) => s + Number(d.montant), 0);
  const dimeDeLaDimeRestante = Math.max(0, dimeDeLaDimeDue - dejaRemis);

  const moisArray = Object.entries(moisMap)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.key.localeCompare(a.key));

  return {
    dimes,
    moisArray,
    totalDimes,
    partPasteurDons,
    totalRecu,
    dimeDeLaDimeDue,
    dejaRemis,
    dimeDeLaDimeRestante,
  };
}
