-- Ajout des colonnes à la table Depense
ALTER TABLE "Depense" ADD COLUMN IF NOT EXISTS "modePaiement" TEXT DEFAULT 'MANUEL';
ALTER TABLE "Depense" ADD COLUMN IF NOT EXISTS "lienPaiement" TEXT;
ALTER TABLE "Depense" ADD COLUMN IF NOT EXISTS "statutPaiement" TEXT;
ALTER TABLE "Depense" ADD COLUMN IF NOT EXISTS "datePaiement" TIMESTAMP(3);
ALTER TABLE "Depense" ADD COLUMN IF NOT EXISTS "referencePaiement" TEXT;
ALTER TABLE "Depense" ADD COLUMN IF NOT EXISTS "beneficiaireId" TEXT;

-- Ajout des clés étrangères si elles n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Depense_beneficiaireId_fkey') THEN
        ALTER TABLE "Depense" ADD CONSTRAINT "Depense_beneficiaireId_fkey" FOREIGN KEY ("beneficiaireId") REFERENCES "Beneficiaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Beneficiaire_createdBy_fkey') THEN
        ALTER TABLE "Beneficiaire" ADD CONSTRAINT "Beneficiaire_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

-- Ajout des index s'ils n'existent pas
CREATE INDEX IF NOT EXISTS "Depense_beneficiaireId_idx" ON "Depense"("beneficiaireId");
CREATE INDEX IF NOT EXISTS "Beneficiaire_createdBy_idx" ON "Beneficiaire"("createdBy");
