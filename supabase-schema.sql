-- ============================================================
-- Église Finance — Script SQL pour Supabase (idempotent)
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Drop existing tables and types (CASCADE pour les dépendances)
DROP TABLE IF EXISTS "DimeMensuelle" CASCADE;
DROP TABLE IF EXISTS "Depense" CASCADE;
DROP TABLE IF EXISTS "AnnotationAudit" CASCADE;
DROP TABLE IF EXISTS "LogAudit" CASCADE;
DROP TABLE IF EXISTS "Recu" CASCADE;
DROP TABLE IF EXISTS "Repartition" CASCADE;
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "TauxRepartition" CASCADE;
DROP TABLE IF EXISTS "Caisse" CASCADE;
DROP TABLE IF EXISTS "LienPaiement" CASCADE;
DROP TABLE IF EXISTS "Contributeur" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "CategorieTransaction" CASCADE;
DROP TYPE IF EXISTS "ModeTransaction" CASCADE;
DROP TYPE IF EXISTS "StatutTransaction" CASCADE;
DROP TYPE IF EXISTS "ModePaiementPhysique" CASCADE;
DROP TYPE IF EXISTS "TypeDepense" CASCADE;
DROP TYPE IF EXISTS "CategorieDepense" CASCADE;
DROP TYPE IF EXISTS "StatutDepense" CASCADE;
DROP TYPE IF EXISTS "StatutDime" CASCADE;
DROP TYPE IF EXISTS "SourceFonds" CASCADE;

-- Create Enums
CREATE TYPE "Role" AS ENUM ('COLLECTOR', 'TREASURER', 'PASTOR', 'AUDITOR', 'ADMIN');

CREATE TYPE "CategorieTransaction" AS ENUM ('OFFRANDE', 'DIME', 'CONSTRUCTION', 'DON_SPECIAL', 'PROJET', 'AUTRE');

CREATE TYPE "ModeTransaction" AS ENUM ('EN_LIGNE', 'MANUEL');

CREATE TYPE "StatutTransaction" AS ENUM ('EN_ATTENTE', 'VALIDE', 'ANNULE');

CREATE TYPE "ModePaiementPhysique" AS ENUM ('ESPECES', 'CHEQUE');

CREATE TYPE "TypeDepense" AS ENUM ('DEPENSE_CULTE', 'DEPENSE_NORMALE');

CREATE TYPE "CategorieDepense" AS ENUM ('MUSICIEN', 'TRANSPORT', 'MATERIEL', 'ENTRETIEN', 'FACTURE', 'SALAIRE', 'AUTRE');

CREATE TYPE "StatutDepense" AS ENUM ('EN_ATTENTE', 'VALIDE', 'ANNULE');

CREATE TYPE "StatutDime" AS ENUM ('NON_VERSE', 'VERSE');

CREATE TYPE "SourceFonds" AS ENUM ('CAISSE', 'ECONOMIE', 'EPARGNE', 'CONSTRUCTION', 'ACTION_SOCIALE');

-- Create Tables

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'COLLECTOR',
    "motDePasseHash" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contributeur" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contributeur_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "categorie" "CategorieTransaction" NOT NULL,
    "mode" "ModeTransaction" NOT NULL,
    "modePaiementPhysique" "ModePaiementPhysique",
    "contributeurId" TEXT,
    "agentId" TEXT,
    "statut" "StatutTransaction" NOT NULL DEFAULT 'EN_ATTENTE',
    "referencePaiement" TEXT,
    "lienId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Repartition" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "montantEconomie" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantEpargne" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantActionSociale" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantDimeDeLaDime" DECIMAL(12,2),
    "montantCaisse" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantFondsDedie" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Repartition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TauxRepartition" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieTransaction" NOT NULL,
    "nomPoste" TEXT NOT NULL,
    "pourcentage" DECIMAL(5,2) NOT NULL,
    "dateEffet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TauxRepartition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Caisse" (
    "id" TEXT NOT NULL,
    "soldeActuel" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Caisse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Recu" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "urlPdf" TEXT,
    "envoyeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnnotationAudit" (
    "id" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "commentaire" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnotationAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "cible" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LienPaiement" (
    "id" TEXT NOT NULL,
    "lienId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LienPaiement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Depense" (
    "id" TEXT NOT NULL,
    "type" "TypeDepense" NOT NULL,
    "categorie" "CategorieDepense" NOT NULL,
    "sourceFonds" "SourceFonds" NOT NULL DEFAULT 'CAISSE',
    "description" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "transactionId" TEXT,
    "agentId" TEXT,
    "dateDepense" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "justificatif" TEXT,
    "statut" "StatutDepense" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Repartition_transactionId_key" ON "Repartition"("transactionId");
CREATE UNIQUE INDEX "TauxRepartition_categorie_nomPoste_dateEffet_key" ON "TauxRepartition"("categorie", "nomPoste", "dateEffet");
CREATE UNIQUE INDEX "Recu_transactionId_key" ON "Recu"("transactionId");
CREATE UNIQUE INDEX "LienPaiement_lienId_key" ON "LienPaiement"("lienId");

-- Foreign Keys
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_contributeurId_fkey" FOREIGN KEY ("contributeurId") REFERENCES "Contributeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Repartition" ADD CONSTRAINT "Repartition_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recu" ADD CONSTRAINT "Recu_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnotationAudit" ADD CONSTRAINT "AnnotationAudit_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnnotationAudit" ADD CONSTRAINT "AnnotationAudit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogAudit" ADD CONSTRAINT "LogAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DimeMensuelle" (
    "id" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "dateVersement" TIMESTAMP(3),
    "statut" "StatutDime" NOT NULL DEFAULT 'NON_VERSE',
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DimeMensuelle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DimeMensuelle_mois_annee_key" ON "DimeMensuelle"("mois", "annee");
ALTER TABLE "DimeMensuelle" ADD CONSTRAINT "DimeMensuelle_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Seed : Utilisateurs de test (mots de passe hashés avec bcrypt)
-- ============================================================

INSERT INTO "User" ("id", "nom", "email", "telephone", "role", "motDePasseHash", "actif", "createdAt", "updatedAt")
VALUES
  ('usr_admin',    'Admin General',      'admin@eglise.org',      '+2250100000001', 'ADMIN',     '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqJ3Y0QqK0Z5aJQ9bYjKQhKQhKQhK', true, NOW(), NOW()),
  ('usr_tresor',   'Tresoriere Marie',   'tresoriere@eglise.org', '+2250100000002', 'TREASURER', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqJ3Y0QqK0Z5aJQ9bYjKQhKQhKQhK', true, NOW(), NOW()),
  ('usr_pasteur',  'Pasteur Jean',       'pasteur@eglise.org',    '+2250100000003', 'PASTOR',    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqJ3Y0QqK0Z5aJQ9bYjKQhKQhKQhK', true, NOW(), NOW()),
  ('usr_auditeur', 'Auditeur Paul',      'auditeur@eglise.org',   '+2250100000004', 'AUDITOR',   '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqJ3Y0QqK0Z5aJQ9bYjKQhKQhKQhK', true, NOW(), NOW()),
  ('usr_collect',  'Collecteur Luc',     'collecteur@eglise.org', '+2250100000005', 'COLLECTOR', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqJ3Y0QqK0Z5aJQ9bYjKQhKQhKQhK', true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;

-- Lien de paiement général
INSERT INTO "LienPaiement" ("id", "lienId", "actif", "createdAt", "updatedAt")
VALUES ('lien_general', 'general', true, NOW(), NOW())
ON CONFLICT ("lienId") DO NOTHING;
