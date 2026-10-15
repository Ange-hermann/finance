// Permissions d'accès aux fonds par rôle (partagé entre les routes API)
type Acces = { access: "LIBRE" | "RESTREINT"; requiresApproval: boolean };

const LIBRE: Acces = { access: "LIBRE", requiresApproval: false };
const RESTREINT: Acces = { access: "RESTREINT", requiresApproval: true };

const PERMISSIONS: Record<string, Record<string, Acces>> = {
  TREASURER: {
    CAISSE: LIBRE,
    ECONOMIE: RESTREINT,
    EPARGNE: RESTREINT,
    CONSTRUCTION: RESTREINT,
    ACTION_SOCIALE: RESTREINT,
  },
  PASTOR: {
    CAISSE: LIBRE,
    ECONOMIE: LIBRE,
    EPARGNE: LIBRE,
    CONSTRUCTION: LIBRE,
    ACTION_SOCIALE: LIBRE,
    PASTEUR: LIBRE,
  },
  AUDITOR: {
    CAISSE: LIBRE,
    ECONOMIE: LIBRE,
    EPARGNE: LIBRE,
    CONSTRUCTION: LIBRE,
    ACTION_SOCIALE: LIBRE,
    PASTEUR: LIBRE,
  },
  ADMIN: {
    CAISSE: LIBRE,
    ECONOMIE: LIBRE,
    EPARGNE: LIBRE,
    CONSTRUCTION: LIBRE,
    ACTION_SOCIALE: LIBRE,
    PASTEUR: LIBRE,
  },
  COLLECTOR: {
    CAISSE: RESTREINT,
    ECONOMIE: RESTREINT,
    EPARGNE: RESTREINT,
    CONSTRUCTION: RESTREINT,
    ACTION_SOCIALE: RESTREINT,
  },
};

export function getPermission(role: string | undefined, sourceFonds: string) {
  const permission = (role && PERMISSIONS[role]?.[sourceFonds]) || undefined;
  if (!permission) {
    return { authorized: false, needsApproval: true, access: "RESTREINT" as const };
  }
  return {
    authorized: permission.access === "LIBRE",
    needsApproval: permission.requiresApproval,
    access: permission.access,
  };
}

export async function checkPermission(
  role: string,
  sourceFonds: string,
  _montant?: number
): Promise<{ authorized: boolean; needsApproval: boolean }> {
  const { authorized, needsApproval } = getPermission(role, sourceFonds);
  return { authorized, needsApproval };
}

export async function canApprove(role: string): Promise<boolean> {
  return ["PASTOR", "AUDITOR", "ADMIN"].includes(role);
}
