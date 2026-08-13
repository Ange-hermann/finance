# Église Finance — Plateforme de Gestion Financière d'Église

Application web complète de gestion financière pour église, construite avec Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma + PostgreSQL.

## Fonctionnalités

- **Paiement en ligne sans compte** : liens et QR codes partageables, les fidèles paient sans créer de compte
- **Répartition automatique** : calcul automatique des sous-postes (économie, épargne, action sociale, caisse, dîme de la dîme, fonds dédié)
- **Saisie manuelle** : pour les paiements reçus en main propre (espèces/chèque)
- **Scan QR** : rapprochement des paiements via scan de QR codes
- **Dashboards avec graphiques** (Recharts) : évolution des recettes, répartition par catégorie, KPI
- **5 rôles RBAC** : Collector, Treasurer, Pastor, Auditor, Admin
- **Reçus PDF** générés automatiquement après chaque transaction
- **Export PDF et Excel** des rapports
- **Journal d'audit** complet et non modifiable
- **Annotations d'audit** par le commissaire aux comptes
- **Couche d'abstraction de paiement** interchangeable (mock, Stripe, CinetPay, PayDunya, etc.)

## Stack technique

| Domaine | Technologie |
|---------|------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript strict |
| UI | Tailwind CSS + composants custom noir/or/blanc |
| Base de données | Prisma ORM + PostgreSQL |
| Auth | NextAuth.js (Credentials + RBAC) |
| Graphiques | Recharts |
| Formulaires | React Hook Form + Zod |
| PDF | pdf-lib |
| Excel | ExcelJS |
| QR Code | qrcode.react + @zxing/browser |
| Tests | Vitest |
| Notifications | Sonner (toasts) |

## Installation

### Prérequis

- Node.js 18+
- PostgreSQL (local ou cloud)
- npm

### Étapes

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Éditez `.env` avec votre `DATABASE_URL` PostgreSQL et générez un `NEXTAUTH_SECRET` :

```bash
openssl rand -base64 32
```

3. **Créer la base de données et lancer les migrations**

```bash
npx prisma migrate dev --name init
```

4. **Générer le client Prisma**

```bash
npx prisma generate
```

5. **Seed : créer les utilisateurs de test**

```bash
npm run prisma:seed
```

Comptes de test créés :

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@eglise.org | Admin123! |
| Trésorière | tresoriere@eglise.org | Tresor123! |
| Pasteur | pasteur@eglise.org | Pasteur123! |
| Auditeur | auditeur@eglise.org | Audit123! |
| Collecteur | collecteur@eglise.org | Collect123! |

6. **Lancer le serveur de développement**

```bash
npm run dev
```

L'app est accessible sur [http://localhost:3000](http://localhost:3000)

## Tests

```bash
npm test
```

16 tests unitaires couvrent la logique de calcul de répartition (`/lib/finance.ts`).

## Structure des routes

```
/                          → Landing (publique)
/login                     → Connexion équipe finance
/pay/[lienId]              → Page publique de paiement (sans compte)

/dashboard                 → Redirection selon rôle
/dashboard/collector        → Agent : saisie + scan
/dashboard/collector/saisie → Saisie manuelle
/dashboard/collector/scan   → Scan QR

/dashboard/treasurer         → Vue complète + graphiques
/dashboard/treasurer/rapports → Rapports PDF/Excel

/dashboard/pastor            → Vue globale lecture seule

/dashboard/auditor           → Audit + annotations

/dashboard/admin             → Administration
/dashboard/admin/taux        → CRUD taux de répartition
/dashboard/admin/utilisateurs → CRUD utilisateurs
```

## Logique de répartition

| Catégorie | Économie | Épargne | Action sociale | Dîme de la dîme | Caisse | Fonds dédié |
|-----------|----------|---------|---------------|-----------------|--------|-------------|
| OFFRANDE | 10% | 10% | 10% | — | 70% | — |
| DIME | 10% | 10% | 10% | 10% | 60% | — |
| CONSTRUCTION | — | — | — | — | — | 100% |
| DON_SPECIAL | 10% | 10% | 10% | — | 70% | — |
| PROJET | 10% | 10% | 10% | — | 70% | — |
| AUTRE | 10% | 10% | 10% | — | 70% | — |

Les taux sont lus depuis la table `TauxRepartition` et sont paramétrables par l'admin.

## Couche d'abstraction de paiement

Le fichier `/lib/payment/provider.ts` définit l'interface `PaymentProvider` :

```ts
interface PaymentProvider {
  createPaymentSession(montant, categorie, metadata): Promise<{ url, sessionId }>
  verifyPayment(sessionId): Promise<{ statut }>
  handleWebhook(payload, signature?): Promise<{ statut }>
}
```

Pour ajouter un provider (Stripe, CinetPay, etc.) :
1. Créer un fichier dans `/lib/payment/` implémentant l'interface
2. L'ajouter au switch dans `/lib/payment/index.ts`
3. Configurer les variables d'environnement dans `.env`

## Déploiement

```bash
npm run build
npm start
```

Variables d'environnement de production :
- `DATABASE_URL` : URL PostgreSQL de production
- `NEXTAUTH_SECRET` : secret fort et unique
- `NEXTAUTH_URL` : URL de production
- `PAYMENT_PROVIDER` : provider de paiement choisi
