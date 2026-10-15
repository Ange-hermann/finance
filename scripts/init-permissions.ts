import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Initialisation des permissions...");

  const permissions = [
    // Trésorière : accès libre seulement sur CAISSE, restreint sur les autres
    { role: "TREASURER", sourceFonds: "CAISSE", niveauAcces: "LIBRE", montantMax: null },
    { role: "TREASURER", sourceFonds: "ECONOMIE", niveauAcces: "RESTREINT", montantMax: 0 },
    { role: "TREASURER", sourceFonds: "EPARGNE", niveauAcces: "RESTREINT", montantMax: 0 },
    { role: "TREASURER", sourceFonds: "CONSTRUCTION", niveauAcces: "RESTREINT", montantMax: 0 },
    { role: "TREASURER", sourceFonds: "ACTION_SOCIALE", niveauAcces: "RESTREINT", montantMax: 0 },

    // Pasteur : accès libre sur tous les fonds
    { role: "PASTOR", sourceFonds: "CAISSE", niveauAcces: "LIBRE", montantMax: null },
    { role: "PASTOR", sourceFonds: "ECONOMIE", niveauAcces: "LIBRE", montantMax: null },
    { role: "PASTOR", sourceFonds: "EPARGNE", niveauAcces: "LIBRE", montantMax: null },
    { role: "PASTOR", sourceFonds: "CONSTRUCTION", niveauAcces: "LIBRE", montantMax: null },
    { role: "PASTOR", sourceFonds: "ACTION_SOCIALE", niveauAcces: "LIBRE", montantMax: null },

    // Commissaire aux comptes : accès libre sur tous les fonds (audit)
    { role: "AUDITOR", sourceFonds: "CAISSE", niveauAcces: "LIBRE", montantMax: null },
    { role: "AUDITOR", sourceFonds: "ECONOMIE", niveauAcces: "LIBRE", montantMax: null },
    { role: "AUDITOR", sourceFonds: "EPARGNE", niveauAcces: "LIBRE", montantMax: null },
    { role: "AUDITOR", sourceFonds: "CONSTRUCTION", niveauAcces: "LIBRE", montantMax: null },
    { role: "AUDITOR", sourceFonds: "ACTION_SOCIALE", niveauAcces: "LIBRE", montantMax: null },

    // Administrateur : accès libre sur tous les fonds
    { role: "ADMIN", sourceFonds: "CAISSE", niveauAcces: "LIBRE", montantMax: null },
    { role: "ADMIN", sourceFonds: "ECONOMIE", niveauAcces: "LIBRE", montantMax: null },
    { role: "ADMIN", sourceFonds: "EPARGNE", niveauAcces: "LIBRE", montantMax: null },
    { role: "ADMIN", sourceFonds: "CONSTRUCTION", niveauAcces: "LIBRE", montantMax: null },
    { role: "ADMIN", sourceFonds: "ACTION_SOCIALE", niveauAcces: "LIBRE", montantMax: null },

    // Agent de saisie : accès restreint sur tous les fonds
    { role: "COLLECTOR", sourceFonds: "CAISSE", niveauAcces: "RESTREINT", montantMax: 0 },
    { role: "COLLECTOR", sourceFonds: "ECONOMIE", niveauAcces: "RESTREINT", montantMax: 0 },
    { role: "COLLECTOR", sourceFonds: "EPARGNE", niveauAcces: "RESTREINT", montantMax: 0 },
    { role: "COLLECTOR", sourceFonds: "CONSTRUCTION", niveauAcces: "RESTREINT", montantMax: 0 },
    { role: "COLLECTOR", sourceFonds: "ACTION_SOCIALE", niveauAcces: "RESTREINT", montantMax: 0 },
  ];

  for (const permission of permissions) {
    await prisma.permissionRole.upsert({
      where: {
        role_sourceFonds: {
          role: permission.role as any,
          sourceFonds: permission.sourceFonds as any,
        },
      },
      update: permission as any,
      create: permission as any,
    });
  }

  console.log("Permissions initialisées avec succès!");
}

main()
  .catch((e) => {
    console.error("Erreur lors de l'initialisation:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });