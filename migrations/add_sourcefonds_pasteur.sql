-- Ajout du fonds PASTEUR (part du pasteur : dîmes + 10% des dons)
-- Utilisé pour les retraits du pasteur via Genius Pay.
ALTER TYPE "SourceFonds" ADD VALUE IF NOT EXISTS 'PASTEUR';
