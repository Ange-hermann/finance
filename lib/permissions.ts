import { prisma } from "../src/lib/prisma";
import { Role, SourceFonds } from "../src/generated/prisma/client";

// Configuration des permissions par défaut (simplifiée avec strings)
export const DEFAULT_PERMISSIONS = [
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

export async function initPermissions() {
  for (const permission of DEFAULT_PERMISSIONS) {
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
}

export async function checkPermission(
  role: string,
  sourceFonds: string,
  montant: number
): Promise<{ authorized: boolean; needsApproval: boolean }> {
  const permission = await prisma.permissionRole.findUnique({
    where: {
      role_sourceFonds: {
        role: role as any,
        sourceFonds: sourceFonds as any,
      },
    },
  });

  if (!permission) {
    return { authorized: false, needsApproval: true };
  }

  if (permission.niveauAcces === "LIBRE") {
    return { authorized: true, needsApproval: false };
  }

  if (permission.niveauAcces === "RESTREINT") {
    if (permission.montantMax === null || Number(permission.montantMax) === 0) {
      return { authorized: false, needsApproval: true };
    }

    if (montant <= Number(permission.montantMax)) {
      return { authorized: true, needsApproval: false };
    }

    return { authorized: false, needsApproval: true };
  }

  return { authorized: false, needsApproval: true };
}

export async function canApprove(role: string): Promise<boolean> {
  return ["PASTOR", "AUDITOR", "ADMIN"].includes(role);
}