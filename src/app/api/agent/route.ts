import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AgentResponse {
  message: string;
  actions?: { label: string; href: string }[];
  suggestions?: string[];
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function normalize(str: string): string {
  return str.toLowerCase().trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(dimee|dimes|dimme|dîme|dîmes|tithe|tithes)\b/g, "dime")
    .replace(/\b(dorca|dorcat|dorkas|dorka)\b/g, "dorcas")
    .replace(/\b(tresoriere|tresor)\b/g, "tresoriere")
    .replace(/\b(pasteur|pastor)\b/g, "pasteur")
    .replace(/\b(auditeur|audit)\b/g, "auditeur")
    .replace(/\b(collecteur|collect)\b/g, "collecteur")
    .replace(/\b(offrand|offrande|offrandes)\b/g, "offrande")
    .replace(/\b(epargn|epargne)\b/g, "epargne")
    .replace(/\b(economi|economie)\b/g, "economie")
    .replace(/\b(construction|constru)\b/g, "construction")
    .replace(/\b(social|sociale)\b/g, "sociale")
    .replace(/\b(caisse)\b/g, "caisse")
    .replace(/\b(depense|depenses|charge|charges)\b/g, "depense")
    .replace(/\b(transaction|transactions|paiement|payement)\b/g, "transaction")
    .replace(/\b(rapport|rapports|report)\b/g, "rapport")
    .replace(/\b(utilisateur|utilisateurs|user|users|membre|membres)\b/g, "utilisateur");
}

function correctPronunciation(text: string): string {
  return text
    .replace(/\bDorcas\b/g, "Dorquasse")
    .replace(/\bDorca\b/g, "Dorquasse")
    .replace(/\bKabasele\b/g, "Kabassélé")
    .replace(/\bkabasele\b/g, "kabassélé")
    .replace(/\bFCFA\b/g, "francs CFA")
    .replace(/\bXOF\b/g, "francs CFA");
}

function getRoleTitle(role: string, name: string): string {
  const n = normalize(name);
  switch (role) {
    case "PASTOR":
      return "Pasteur";
    case "TREASURER":
      if (n.includes("dorcas")) return "Diaconesse";
      return "Frère";
    case "ADMIN":
      if (n.includes("joel") || n.includes("joël")) return "Mentor";
      if (n.includes("boua")) return "Monsieur";
      return "Frère";
    case "AUDITOR":
      return "Frère";
    case "COLLECTOR":
      return "Frère";
    default:
      return "";
  }
}

function formatTransactions(count: number): string {
  if (count <= 1) return "une transaction";
  return `${count} transactions`;
}

function formatTransactionsValidees(count: number): string {
  if (count <= 1) return "une transaction validée";
  return `${count} transactions validées`;
}

// === CACHE des données DB (30 secondes) ===
interface DashboardStats {
  grandCaisse: number;
  caisseRepart: number;
  economie: number;
  epargne: number;
  construction: number;
  actionSociale: number;
  totalDepenses: number;
  totalDime: number;
  dimeVersee: number;
  dimeRestant: number;
  transactions: number;
  users: number;
}

let dashboardCache: { data: DashboardStats; time: number } | null = null;
const CACHE_TTL = 30000;

async function getDashboardStats(): Promise<DashboardStats> {
  if (dashboardCache && Date.now() - dashboardCache.time < CACHE_TTL) {
    return dashboardCache.data;
  }

  const [caisse, repartitions, depenses, depensesNormales, depEconomie, depEpargne, depActionSociale, depConstruction, dimesVersees, transactions, users] = await Promise.all([
    prisma.caisse.findFirst(),
    prisma.repartition.findMany({ where: { transaction: { statut: "VALIDE" } }, include: { transaction: { select: { createdAt: true } } } }),
    prisma.depense.aggregate({ where: { statut: "VALIDE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "ECONOMIE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "EPARGNE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "ACTION_SOCIALE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE", sourceFonds: "CONSTRUCTION" }, _sum: { montant: true } }),
    prisma.dimeMensuelle.findMany({ where: { statut: "VERSE" } }),
    prisma.transaction.count({ where: { statut: "VALIDE" } }),
    prisma.user.count(),
  ]);

  const grandCaisse = Number(caisse?.soldeActuel || 0);
  const totalDepensesNormales = Number(depensesNormales._sum?.montant || 0);
  const caisseRepart = repartitions.reduce((s, r) => s + Number(r.montantCaisse), 0) - totalDepensesNormales;
  const economie = repartitions.reduce((s, r) => s + Number(r.montantEconomie), 0) - Number(depEconomie._sum?.montant || 0);
  const epargne = repartitions.reduce((s, r) => s + Number(r.montantEpargne), 0) - Number(depEpargne._sum?.montant || 0);
  const construction = repartitions.reduce((s, r) => s + Number(r.montantFondsDedie), 0) - Number(depConstruction._sum?.montant || 0);
  const actionSociale = repartitions.reduce((s, r) => s + Number(r.montantActionSociale), 0) - Number(depActionSociale._sum?.montant || 0);
  const totalDepenses = Number(depenses._sum?.montant || 0);
  const dimesVerseesMap = new Map(dimesVersees.map((d) => [`${d.annee}-${d.mois}`, d.dateVersement ? new Date(d.dateVersement) : null]));
  const totalDime = repartitions.reduce((s, r) => s + Number(r.montantDimeDeLaDime || 0), 0);
  const dimeVersee = repartitions
    .filter((r) => {
      const d = new Date(r.transaction.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const dateVersement = dimesVerseesMap.get(key);
      if (!dateVersement) return false;
      return d <= dateVersement;
    })
    .reduce((s, r) => s + Number(r.montantDimeDeLaDime || 0), 0);

  const data: DashboardStats = {
    grandCaisse, caisseRepart, economie, epargne, construction, actionSociale,
    totalDepenses, totalDime, dimeVersee, dimeRestant: totalDime - dimeVersee,
    transactions, users,
  };

  dashboardCache = { data, time: Date.now() };
  return data;
}

function getDashboardData(role: string, stats: DashboardStats): string {
  return `Caisse ${formatNum(stats.grandCaisse)}, Répartition ${formatNum(stats.caisseRepart)}, Économie ${formatNum(stats.economie)}, Épargne ${formatNum(stats.epargne)}, Construction ${formatNum(stats.construction)}, Action sociale ${formatNum(stats.actionSociale)}, Dépenses ${formatNum(stats.totalDepenses)}, Dîme total ${formatNum(stats.totalDime)} versée ${formatNum(stats.dimeVersee)} restant ${formatNum(stats.dimeRestant)}, Transactions ${stats.transactions}, Utilisateurs ${stats.users}. Rôle: ${role}.`;
}

// === IA ultra-rapide : prompt court, timeout 6s ===
async function askAI(userMessage: string, dashboardData: string): Promise<string> {
  const prompt = `Tu es un assistant vocal d'église. Réponds UNIQUEMENT en français, sois bref (2 phrases maximum), naturel et conversationnel. Ne jamais utiliser l'anglais. ${dashboardData} Question: ${userMessage}`;

  try {
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
      method: "GET",
      headers: { "Accept": "text/plain" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error("fail");
    const text = await res.text();
    return text.trim().substring(0, 400);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { message, isInitial } = body;
  const userName = session.user?.name || "";
  const role = (session.user as any)?.role as string;

  if (isInitial) {
    const greeting = await getInitialGreeting(userName, role, (session.user as any)?.id);
    return NextResponse.json({ ...greeting, message: correctPronunciation(greeting.message) });
  }
  const result = await processMessage(message, role, userName);
  return NextResponse.json({ ...result, message: correctPronunciation(result.message) });
}

// === Greeting instantané (DB directe, pas d'IA) ===
async function getInitialGreeting(userName: string, role: string, userId: string): Promise<AgentResponse> {
  const greeting = getTimeGreeting();
  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const [caisse, repartitions, transactions, depenses, depensesNormales, dimesVersees, users, logs] = await Promise.all([
    prisma.caisse.findFirst(),
    prisma.repartition.findMany({ where: { transaction: { statut: "VALIDE" } }, include: { transaction: { select: { createdAt: true } } } }),
    prisma.transaction.count({ where: { statut: "VALIDE" } }),
    prisma.depense.aggregate({ where: { statut: "VALIDE" }, _sum: { montant: true } }),
    prisma.depense.aggregate({ where: { type: "DEPENSE_NORMALE", statut: "VALIDE" }, _sum: { montant: true } }),
    prisma.dimeMensuelle.findMany({ where: { statut: "VERSE" } }),
    prisma.user.count(),
    prisma.logAudit.count(),
  ]);

  const grandCaisse = Number(caisse?.soldeActuel || 0);
  const totalDepensesNormales = Number(depensesNormales._sum?.montant || 0);
  const caisseRepart = repartitions.reduce((s, r) => s + Number(r.montantCaisse), 0) - totalDepensesNormales;
  const totalDepenses = Number(depenses._sum?.montant || 0);
  const dimesVerseesMap = new Map(dimesVersees.map((d) => [`${d.annee}-${d.mois}`, d.dateVersement ? new Date(d.dateVersement) : null]));
  const totalDime = repartitions.reduce((s, r) => s + Number(r.montantDimeDeLaDime || 0), 0);
  const dimeVersee = repartitions
    .filter((r) => {
      const d = new Date(r.transaction.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const dateVersement = dimesVerseesMap.get(key);
      if (!dateVersement) return false;
      return d <= dateVersement;
    })
    .reduce((s, r) => s + Number(r.montantDimeDeLaDime || 0), 0);

  const commonSuggestions: Record<string, string[]> = {
    PASTOR: ["Consulter les soldes", "Voir les dernières transactions", "Voir le rapport financier", "Consulter les graphiques"],
    TREASURER: ["Voir les soldes par fonds", "Gérer les dépenses", "Gérer la dîme", "Générer un rapport"],
    AUDITOR: ["Auditer les transactions", "Consulter le journal d'audit", "Voir le rapport financier", "Consulter les soldes"],
    ADMIN: ["Gérer les utilisateurs", "Configurer les taux", "Consulter les soldes", "Voir le tableau de bord"],
    COLLECTOR: ["Saisie manuelle", "Scanner un QR code", "Voir mes statistiques"],
  };

  let message: string;
  const title = getRoleTitle(role, userName);
  const displayName = title ? `${title} ${userName}` : userName;

  if (role === "PASTOR") {
    const isJustin = normalize(userName).includes("justin") || normalize(userName).includes("kabasele");
    if (isJustin) {
      message = `${greeting} Pasteur ${userName} ! Nous sommes le ${dateStr}. La grande caisse contient ${formatNum(grandCaisse)} FCFA, la caisse de répartition ${formatNum(caisseRepart)} FCFA, et il y a ${formatTransactionsValidees(transactions)}. Comment puis-je vous aider ?`;
    } else {
      message = `${greeting} ${displayName} ! Nous sommes le ${dateStr}. La grande caisse contient ${formatNum(grandCaisse)} FCFA, la caisse de répartition ${formatNum(caisseRepart)} FCFA, et il y a ${formatTransactionsValidees(transactions)}. Comment puis-je vous aider ?`;
    }
  } else if (role === "TREASURER") {
    message = `${greeting} ${displayName} ! Voici le résumé : grande caisse ${formatNum(grandCaisse)} FCFA, caisse ${formatNum(caisseRepart)} FCFA, dépenses ${formatNum(totalDepenses)} FCFA, et il reste ${formatNum(totalDime - dimeVersee)} FCFA de dîme à verser. Que souhaitez-vous faire ?`;
  } else if (role === "AUDITOR") {
    message = `${greeting} ${displayName} ! Espace audit : ${formatTransactions(transactions)}, grande caisse ${formatNum(grandCaisse)} FCFA, ${logs} entrées dans le journal. Que voulez-vous examiner ?`;
  } else if (role === "ADMIN") {
    const isAdminJoel = normalize(userName).includes("joel") || normalize(userName).includes("joël");
    if (isAdminJoel) {
      message = `${greeting} Mentor ${userName} de CTF ! Nous sommes le ${dateStr}. Administration : ${users} utilisateurs, ${formatTransactionsValidees(transactions)}. Que souhaitez-vous configurer ?`;
    } else {
      message = `${greeting} ${displayName} ! Administration : ${users} utilisateurs, ${formatTransactionsValidees(transactions)}. Que souhaitez-vous configurer ?`;
    }
  } else if (role === "COLLECTOR") {
    const stats = await prisma.transaction.aggregate({
      where: { agentId: userId, mode: "MANUEL", statut: "VALIDE" },
      _sum: { montant: true },
      _count: true,
    });
    message = `${greeting} ${displayName} ! Vous avez saisi ${formatNum(Number(stats._sum?.montant || 0))} FCFA en ${formatTransactions(stats._count)}. Que voulez-vous faire ?`;
  } else {
    message = `${greeting} ${displayName} ! Comment puis-je vous aider ?`;
  }

  return { message, suggestions: commonSuggestions[role] || commonSuggestions.TREASURER };
}

// === Navigation instantanée ===
const NAV_ACTIONS: { keywords: string[]; action: { label: string; href: string }; suggestions: string[]; roles?: string[] }[] = [
  { keywords: ["rapport", "report", "exporter", "pdf", "excel"], action: { label: "Aller aux rapports", href: "/dashboard/treasurer/rapports" }, suggestions: ["Voir les soldes", "Voir les dépenses", "Consulter la dîme"] },
  { keywords: ["depense", "gerer depense"], action: { label: "Gérer les dépenses", href: "/dashboard/treasurer/depenses" }, suggestions: ["Voir les soldes", "Consulter la dîme", "Générer un rapport"], roles: ["TREASURER", "ADMIN"] },
  { keywords: ["scan", "qr"], action: { label: "Scanner un QR code", href: "/dashboard/collector/scan" }, suggestions: ["Saisie manuelle", "Voir mes statistiques"], roles: ["COLLECTOR", "TREASURER"] },
  { keywords: ["saisie", "enregistrer", "ajouter transaction", "nouvelle transaction"], action: { label: "Saisie manuelle", href: "/dashboard/collector/saisie" }, suggestions: ["Scanner un QR code", "Voir mes statistiques"], roles: ["COLLECTOR", "TREASURER"] },
  { keywords: ["graphique", "chart", "statistique"], action: { label: "Voir les graphiques", href: "/dashboard" }, suggestions: ["Consulter les soldes", "Voir les transactions"] },
  { keywords: ["audit page", "page audit", "verif"], action: { label: "Auditer les transactions", href: "/dashboard/auditor" }, suggestions: ["Consulter le journal d'audit", "Voir le rapport financier"], roles: ["AUDITOR", "ADMIN"] },
  { keywords: ["gerer utilisateur", "page utilisateur", "gerer user"], action: { label: "Gérer les utilisateurs", href: "/dashboard/admin/utilisateurs" }, suggestions: ["Configurer les taux", "Consulter les soldes"], roles: ["ADMIN"] },
  { keywords: ["taux", "config"], action: { label: "Configurer les taux", href: "/dashboard/admin/taux" }, suggestions: ["Gérer les utilisateurs", "Consulter les soldes"], roles: ["ADMIN"] },
];

// === Réponses DB instantanées par fond précis (sans IA) ===
function getInstantDBResponse(msg: string, s: DashboardStats): string | null {
  // Dîme de la dîme
  if (msg.includes("dime") || msg.includes("dim") || msg.includes("tithe")) {
    return `La dîme de la dîme s'élève à ${formatNum(s.totalDime)} francs CFA au total. ${formatNum(s.dimeVersee)} francs CFA ont déjà été versés, et il reste ${formatNum(s.dimeRestant)} francs CFA à verser.`;
  }
  // Dépenses
  if (msg.includes("depense") || msg.includes("charge")) {
    return `Le total des dépenses validées est de ${formatNum(s.totalDepenses)} FCFA. Vous pouvez gérer les dépenses depuis la page dédiée.`;
  }
  // Épargne
  if (msg.includes("epargne")) {
    return `Le fonds d'épargne contient actuellement ${formatNum(s.epargne)} FCFA. C'est un fonds de réserve pour les besoins futurs de l'église.`;
  }
  // Économie
  if (msg.includes("economie")) {
    return `Le fonds d'économie contient ${formatNum(s.economie)} FCFA. Il sert à couvrir les dépenses courantes et imprévues.`;
  }
  // Construction
  if (msg.includes("construction")) {
    return `Le fonds de construction dispose de ${formatNum(s.construction)} FCFA. Il est dédié aux projets de construction et rénovation de l'église.`;
  }
  // Action sociale
  if (msg.includes("action sociale") || msg.includes("sociale")) {
    return `Le fonds d'action sociale contient ${formatNum(s.actionSociale)} FCFA. Il est utilisé pour soutenir les membres dans le besoin et les actions caritatives.`;
  }
  // Caisse de répartition
  if (msg.includes("repartition") || (msg.includes("caisse") && msg.includes("repart"))) {
    return `La caisse de répartition contient ${formatNum(s.caisseRepart)} FCFA. C'est le fonds principal pour les opérations quotidiennes.`;
  }
  // Grande caisse / solde général
  if (msg.includes("grande caisse") || (msg.includes("caisse") && !msg.includes("repart"))) {
    return `La grande caisse contient ${formatNum(s.grandCaisse)} FCFA. C'est le fonds central de l'église.`;
  }
  // Soldes / argent / combien (vue d'ensemble)
  if (msg.includes("solde") || msg.includes("argent") || msg.includes("combien") || msg.includes("fonds") || msg.includes("total")) {
    return `Voici tous les fonds : Grande caisse ${formatNum(s.grandCaisse)} FCFA, Caisse de répartition ${formatNum(s.caisseRepart)} FCFA, Économie ${formatNum(s.economie)} FCFA, Épargne ${formatNum(s.epargne)} FCFA, Construction ${formatNum(s.construction)} FCFA, Action sociale ${formatNum(s.actionSociale)} FCFA.`;
  }
  // Transactions
  if (msg.includes("transaction") || msg.includes("paiement") || msg.includes("offrande") || msg.includes("don") || msg.includes("collecte")) {
    return `Il y a ${formatTransactionsValidees(s.transactions)} au total. Le total des dépenses est de ${formatNum(s.totalDepenses)} FCFA.`;
  }
  return null;
}

// === Réponses détaillées avec vraies données (dépenses, transactions) ===
async function getDetailedResponse(msg: string, role: string): Promise<string | null> {
  const isRecent = msg.includes("recent") || msg.includes("dernier") || msg.includes("aujourdhui") || msg.includes("date");
  const isList = msg.includes("quelle") || msg.includes("liste") || msg.includes("voir") || msg.includes("montre") || msg.includes("detail") || msg.includes("recap");

  // === Dépenses ===
  if (msg.includes("depense") || msg.includes("charge")) {
    const depenses = await prisma.depense.findMany({
      where: { statut: "VALIDE" },
      orderBy: { dateDepense: "desc" },
      take: isRecent ? 5 : 10,
      include: { agent: true },
    });

    if (depenses.length === 0) {
      return `Il n'y a aucune dépense validée pour le moment.`;
    }

    const total = depenses.reduce((s, d) => s + Number(d.montant), 0);
    let response = isRecent
      ? `Voici les ${depenses.length} dernières dépenses : `
      : `Voici les dépenses récentes : `;

    response += depenses.map((d, i) =>
      `${i + 1}. ${d.description} — ${formatNum(Number(d.montant))} francs CFA (${d.categorie}, ${d.type === "DEPENSE_CULTE" ? "culte" : "normale"}, source: ${d.sourceFonds})`
    ).join(". ");

    response += `. Le total de ces dépenses est ${formatNum(total)} francs CFA.`;
    return response;
  }

  // === Transactions ===
  if (msg.includes("transaction") || msg.includes("paiement") || msg.includes("offrande") || msg.includes("don") || msg.includes("collecte")) {
    const transactions = await prisma.transaction.findMany({
      where: { statut: "VALIDE" },
      orderBy: { createdAt: "desc" },
      take: isRecent ? 5 : 10,
      include: { contributeur: true, agent: true },
    });

    if (transactions.length === 0) {
      return `Il n'y a aucune transaction validée pour le moment.`;
    }

    let response = isRecent
      ? `Voici les ${transactions.length} dernières transactions : `
      : `Voici les transactions récentes : `;

    response += transactions.map((t, i) =>
      `${i + 1}. ${t.categorie} de ${formatNum(Number(t.montant))} francs CFA par ${t.contributeur?.nom || "anonyme"} le ${new Date(t.createdAt).toLocaleDateString("fr-FR")}`
    ).join(". ");

    return response;
  }

  // === Dîme mensuelle ===
  if (msg.includes("dime mensuelle") || msg.includes("dime du mois") || msg.includes("dime mensuel") || (msg.includes("dime") && isList)) {
    const dimes = await prisma.dimeMensuelle.findMany({
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
      take: 5,
    });

    if (dimes.length === 0) {
      return `Aucune dîme mensuelle n'a été enregistrée pour le moment.`;
    }

    const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    let response = `Voici les dernières dîmes mensuelles : `;
    response += dimes.map((d) =>
      `${moisNoms[d.mois - 1]} ${d.annee} — ${formatNum(Number(d.montant))} francs CFA (${d.statut === "VERSE" ? "versée" : "en attente"})`
    ).join(". ");
    return response;
  }

  // === Utilisateurs (admin) ===
  if ((msg.includes("utilisateur") || msg.includes("user") || msg.includes("membre")) && isList) {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { nom: true, email: true, role: true },
    });

    if (users.length === 0) {
      return `Aucun utilisateur enregistré.`;
    }

    let response = `Voici les ${users.length} utilisateurs : `;
    response += users.map((u, i) =>
      `${i + 1}. ${u.nom} (${u.role}) — ${u.email}`
    ).join(". ");
    return response;
  }

  // === Journal d'audit (auditor) ===
  if (msg.includes("audit") || msg.includes("journal") || msg.includes("log")) {
    const logs = await prisma.logAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true },
    });

    if (logs.length === 0) {
      return `Le journal d'audit est vide pour le moment.`;
    }

    let response = `Voici les ${logs.length} dernières actions du journal : `;
    response += logs.map((l) =>
      `${l.action} sur ${l.cible} par ${l.user?.nom || "système"} le ${new Date(l.createdAt).toLocaleDateString("fr-FR")}`
    ).join(". ");
    return response;
  }

  return null;
}

async function processMessage(message: string, role: string, userName: string): Promise<AgentResponse> {
  const msg = normalize(message);

  // 0. Réponses détaillées avec vraies données (avant tout)
  const detailedResponse = await getDetailedResponse(msg, role);
  if (detailedResponse) {
    return {
      message: detailedResponse,
      suggestions: ["Consulter les soldes", "Voir les transactions", "Générer un rapport", "Aide"],
    };
  }

  // 1. Navigation instantanée
  for (const nav of NAV_ACTIONS) {
    if (nav.keywords.some((kw) => msg.includes(kw))) {
      if (nav.roles && !nav.roles.includes(role)) {
        return {
          message: `Cette fonctionnalité n'est pas accessible avec votre rôle ${role}. Contactez un administrateur.`,
          suggestions: ["Consulter les soldes", "Voir les transactions", "Aide"],
        };
      }
      return {
        message: `Je vous redirige vers ${nav.action.label.toLowerCase()}.`,
        actions: [nav.action],
        suggestions: nav.suggestions,
      };
    }
  }

  // 2. Réponses DB instantanées par fond précis (sans appeler l'IA)
  const stats = await getDashboardStats();
  const instantResponse = getInstantDBResponse(msg, stats);
  if (instantResponse) {
    return {
      message: instantResponse,
      suggestions: ["Consulter les soldes", "Voir les transactions", "Générer un rapport", "Aide"],
    };
  }

  // 3. Salutations
  if (msg.includes("bonjour") || msg.includes("salut") || msg.includes("hello") || msg.includes("coucou")) {
    return {
      message: `${getTimeGreeting()} ${userName} ! Comment puis-je vous aider ?`,
      suggestions: ["Consulter les soldes", "Voir les transactions", "Générer un rapport"],
    };
  }
  if (msg.includes("merci")) {
    return { message: "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.", suggestions: ["Consulter les soldes", "Aide"] };
  }
  if (msg.includes("aide") || msg.includes("help") || msg.includes("que peux")) {
    return {
      message: `Je peux vous donner le détail de chaque fond : la dîme, l'épargne, l'économie, la construction, l'action sociale, la grande caisse, les dépenses, ou répondre à des questions générales. Posez-moi simplement votre question !`,
      suggestions: ["Consulter les soldes", "Voir les dépenses", "Consulter la dîme", "Voir les transactions"],
    };
  }

  // 4. IA pour questions ouvertes (seul cas qui appelle Pollinations)
  const dashboardData = getDashboardData(role, stats);
  const aiResponse = await askAI(message, dashboardData);
  if (aiResponse && aiResponse.length > 5) {
    return {
      message: aiResponse,
      suggestions: ["Consulter les soldes", "Voir les transactions", "Générer un rapport", "Aide"],
    };
  }

  // 5. Fallback avec données réelles
  return {
    message: `Voici un résumé : Grande caisse ${formatNum(stats.grandCaisse)}, Caisse ${formatNum(stats.caisseRepart)}, Économie ${formatNum(stats.economie)}, Épargne ${formatNum(stats.epargne)}, Construction ${formatNum(stats.construction)}, Action sociale ${formatNum(stats.actionSociale)}, Dépenses ${formatNum(stats.totalDepenses)}. Posez-moi une question sur un fond précis !`,
    suggestions: ["Consulter les soldes", "Générer un rapport", "Voir les dépenses", "Consulter la dîme", "Aide"],
  };
}
