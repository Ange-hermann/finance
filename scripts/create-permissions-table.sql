-- Créer la table PermissionRole
CREATE TABLE IF NOT EXISTS "PermissionRole" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sourceFonds" TEXT NOT NULL,
    "niveauAcces" TEXT NOT NULL DEFAULT 'RESTREINT',
    "montantMax" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionRole_pkey" PRIMARY KEY ("id")
);

-- Créer la table DemandeAutorisation
CREATE TABLE IF NOT EXISTS "DemandeAutorisation" (
    "id" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "sourceFonds" TEXT NOT NULL,
    "typeAction" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "approbateurId" TEXT,
    "commentaire" TEXT,
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateReponse" TIMESTAMP(3),
    "depenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeAutorisation_pkey" PRIMARY KEY ("id")
);

-- Créer les index
CREATE UNIQUE INDEX IF NOT EXISTS "PermissionRole_role_sourceFonds_key" ON "PermissionRole"("role", "sourceFonds");

-- Ajouter les clés étrangères
ALTER TABLE "DemandeAutorisation" ADD CONSTRAINT "DemandeAutorisation_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeAutorisation" ADD CONSTRAINT "DemandeAutorisation_approbateurId_fkey" FOREIGN KEY ("approbateurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;