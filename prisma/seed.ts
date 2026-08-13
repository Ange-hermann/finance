import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seed: création des utilisateurs...");

  const users = [
    { nom: "Admin General", email: "admin@eglise.org", telephone: "+2250100000001", role: "ADMIN", password: "Admin123!" },
    { nom: "Tresoriere Marie", email: "tresoriere@eglise.org", telephone: "+2250100000002", role: "TREASURER", password: "Tresor123!" },
    { nom: "Pasteur Jean", email: "pasteur@eglise.org", telephone: "+2250100000003", role: "PASTOR", password: "Pasteur123!" },
    { nom: "Auditeur Paul", email: "auditeur@eglise.org", telephone: "+2250100000004", role: "AUDITOR", password: "Audit123!" },
    { nom: "Collecteur Luc", email: "collecteur@eglise.org", telephone: "+2250100000005", role: "COLLECTOR", password: "Collect123!" },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { motDePasseHash: hash, actif: true },
      create: {
        nom: u.nom,
        email: u.email,
        telephone: u.telephone,
        role: u.role as any,
        motDePasseHash: hash,
      },
    });
    console.log(`  ✓ ${u.nom} (${u.role})`);
  }

  console.log("Seed: création du lien de paiement général...");
  await prisma.lienPaiement.upsert({
    where: { lienId: "general" },
    update: {},
    create: { lienId: "general", actif: true },
  });

  console.log("Seed terminé avec succès !");
  console.log("\nComptes de test:");
  users.forEach((u) => {
    console.log(`  ${u.role}: ${u.email} / ${u.password}`);
  });
}

main()
  .catch((e) => {
    console.error("Erreur seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
