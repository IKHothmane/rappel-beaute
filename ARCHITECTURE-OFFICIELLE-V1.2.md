# Rappel Beauté — Architecture officielle (figée)

**Version :** 1.2 (alignée produit V1.3)  
**Statut :** FIGÉE — ne pas rouvrir sans décision explicite  
**Date de gel :** 2026-08-30

Ce document est la source de vérité architecture. En cas de conflit avec un prompt ou un ancien CDC, **ce fichier prime**.

---

## 0. Décision critique verrouillée — Login unique / email global

Un email = **un seul compte** dans tout Rappel Beauté.

| Incorrect (insuffisant) | Correct (V1) |
|---|---|
| `PlatformUser.email @unique` **et** `User.email @unique` séparément | Unicité **cross-tables** : un même email ne peut pas exister à la fois dans `PlatformUser` et `User` |

**Conséquence V1 :**

- `admin@…` → uniquement `PlatformUser` → `admin.rappelbeaute.ma`
- `institut@…` → uniquement `User` → `app.rappelbeaute.ma`
- Le serveur décide de la destination ; le frontend ne choisit jamais l’espace.

**Implémentation recommandée (à appliquer dès Sprint Auth/DB) :**

1. Colonne `email` unique dans chaque table (`PlatformUser`, `User`).
2. **Plus** contrainte applicative dans `authorize()` / création de compte : avant insert, vérifier l’absence dans l’autre table.
3. **Plus** (PostgreSQL) : table `AccountEmail` ou trigger / exclusion qui empêche le doublon cross-table.
4. Message d’erreur login toujours générique : « Identifiants invalides » (ne jamais révéler si l’email existe ni dans quelle table).

**Évolution future (hors V1) :** modèle `Identity` + `PlatformMembership` / `OrganizationMembership` pour une personne multi-contextes. **Interdit en V1.**

---

## 1. Vue d’ensemble

```
                         RAPPEL BEAUTÉ
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ↓                ↓                ↓
     rappelbeaute.ma    app.rappelbeaute.ma   admin.rappelbeaute.ma
       SITE VITRINE       ESPACE INSTITUT       SUPER ADMIN
             │                │                │
          Public             Auth              Auth
             │                │                │
             └────────────────┼────────────────┘
                              ↓
                    BACKEND COMMUN (modular monolith)
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
                 Prisma             PostgreSQL
                                        │
                                  RLS + Index + EXCLUDE
```

**Un seul codebase Next.js.** Routage par hostname dans `middleware.ts`. Pas de microservices.

| Domaine | Rôle | Auth | accountType |
|---|---|---|---|
| `rappelbeaute.ma` (www) | Vitrine SEO / acquisition | Aucune (sauf `/login`) | — |
| `app.rappelbeaute.ma` | Espace institut | Session requise | `ORGANIZATION` |
| `admin.rappelbeaute.ma` | Super admin | Session requise | `PLATFORM` |

Cookies de session **séparés** par domaine (`app_session` / `admin_session`) — pas de cookie partagé sur `.rappelbeaute.ma`.

---

## 2. Site vitrine — `rappelbeaute.ma`

Aucune donnée métier. SSG / SEO. Objectif : acquisition + conversion (demo / essai lead).

**Pages figées :**

- `/`
- `/fonctionnalites/`
- `/solutions/institut-beaute/`
- `/gestion-rendez-vous/`
- `/gestion-stock/`
- `/gestion-clientes/`
- `/whatsapp/`
- `/tarifs/`
- `/a-propos/`
- `/faq/`
- `/contact/`
- `/blog/`
- `/mentions-legales/`
- `/confidentialite/`
- `/login` (formulaire unique → redirection serveur)

Essai gratuit affiché = **demande lead** (activation sous 24h), pas de self-serve. Seul le SUPER_ADMIN crée les instituts.

---

## 3. Application institut — `app.rappelbeaute.ma`

Rôles V1 (matrice **statique en code**, pas de table `Permission`) :

`OWNER` | `MANAGER` | `STAFF` | `CASHIER` | `ACCOUNTANT`

**Modules (après connexion) :** Dashboard, Agenda, Clientes, Services, Employées, Ressources, Stock, Fournisseurs, Achats, Caisse, Dépenses, WhatsApp, Fidélité, Marketing, Promotions, Avis, Analytics, Rapports, Notifications, Paramètres, Profil.

Accès = **rôle** ∩ **plan** (`STARTER` / `INSTITUT` / `PREMIUM`). Un OWNER ne peut **jamais** accéder à `admin.`.

Plans (rappel) :

| Plan | Prix | Quotas clés |
|---|---|---|
| STARTER | 299 MAD | 150 RDV/mois, 1 site |
| INSTITUT | 499 MAD | 300 RDV/mois, modules métier |
| PREMIUM | 899 MAD | Illimité + multi-sites |

---

## 4. Super Admin — `admin.rappelbeaute.ma`

Uniquement `PlatformUser`. Écrans : Dashboard plateforme, Instituts, Créer institut, Détail, Abonnements, Utilisateurs, Activité, Audit, Support (impersonation journalisée), Configuration.

---

## 5. Login unique (flux)

```
rappelbeaute.ma/login
       │
   email + password
       │
      Auth.js (CredentialsProvider unique)
       │
       ├─ PlatformUser trouvé (email unique global) → PLATFORM → admin.
       ├─ sinon User trouvé → ORGANIZATION → app. (+ orgId, role, branchId)
       └─ sinon → null (« Identifiants invalides »)
```

Le frontend ne choisit **jamais** l’espace.

---

## 6. Chaîne de sécurité (non négociable)

```
Session → accountType → role → organizationId → permission → business rule → database (RLS)
```

Interdit : confiance au frontend (« je suis OWNER », `organizationId` fourni par le client).

`GET /api/customers` conceptuel :

1. Session valide ?
2. `accountType === ORGANIZATION` ?
3. `organizationId` depuis la session (jamais du body/query client)
4. Rôle autorisé (matrice) ?
5. Feature plan OK ?
6. RLS `app.current_org_id`
7. Retour données filtrées

Isolation multi-tenant : même avec `customerId` forgé dans l’URL, org B ne voit jamais les données de org A.

---

## 7. Agenda — EXCLUDE dès migration 001

Deux contraintes PostgreSQL `EXCLUDE USING gist` :

1. `(branchId, staffId, tstzrange(startAt, endAt))` si `staffId` non null, hors `CANCELLED` / `NO_SHOW`, `deletedAt IS NULL`
2. Idem pour `resourceId`

La base refuse le chevauchement concurrent — pas seulement l’appli.

---

## 8. Argent

- Toujours `Decimal` — **jamais** `Float`.
- Paiement enregistré = historique immuable : correction via opération de remboursement / ajustement, pas `UPDATE amount`.
- Factures : numérotation backend transaction-safe (`SELECT FOR UPDATE` / `DocumentSequence` ou `invoice_counters`).

---

## 9. Stock

Source de vérité = `InventoryMovement` (ledger append-only).  
`Product.currentStock` = cache recalculable (`SUM(quantity)`), jamais la vérité seule.

Types : `PURCHASE` / `SALE` / `USE` / `LOSS` (+ ajustement selon schéma). Traçabilité : qui, quand, produit, qty, type, motif, institut, liens RDV/achat, `idempotencyKey`.

---

## 10. Flux métier principal (avant les écrans)

```
Réservation → Disponibilité → Appointment → Confirmation → Arrivée
    → Prestation → COMPLETED
         ├── Payment
         ├── InventoryMovement
         ├── Commission
         ├── Loyalty
         ├── Review request (WhatsApp PREPARED)
         └── Analytics
```

Traitement **idempotent** (`idempotencyKey = appointmentId`) : rejouer COMPLETED ne double ni stock, ni paiement, ni points, ni commission.

---

## 11. WhatsApp V1

```
Event → Template → WhatsAppLog PREPARED → liste « À envoyer »
  → clic → wa.me → envoi humain → SENT
```

Interdit V1 : bot, API Business, faux statuts `READ` / `REPLIED`.

---

## 12. Audit & suppression

- `AuditLog` JSONB `before` / `after` sur opérations sensibles.
- Soft delete : `deletedAt` et/ou `ARCHIVED` — pas de DELETE destructif sur Organization, Customer, Appointment, Payment, Product.

---

## 13. Structure code (modular monolith)

```
rappel-beaute/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   ├── (auth)/
│   │   ├── (app)/
│   │   └── (admin)/
│   ├── modules/          # domaine métier (auth, appointments, inventory, …)
│   ├── components/
│   ├── lib/
│   ├── server/
│   └── styles/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
├── middleware.ts
├── docker-compose.yml
└── package.json
```

Logique métier dans `modules/` + `server/` — **jamais** dans les composants React.

---

## 14. Ordre de développement (obligatoire)

| Étape | Contenu | Ne pas faire encore |
|---|---|---|
| **1** | Fondation FE : Next.js, TS, Tailwind, fonts, theme, responsive, composants de base | Toutes les pages métier |
| **2** | Vitrine : Home, Fonctionnalités, Institut, Tarifs, FAQ, Contact | App / Admin |
| **3** | Auth : Login, Auth.js, PlatformUser/User, sessions, middleware sous-domaines, **email unique global** | Features métier |
| **4** | DB : Organization, User, Customer, Staff, Service, Resource, Appointment + seed | UI complète |
| **5** | Moteur : Availability, EXCLUDE, permissions, RLS, Audit, transactions, idempotence | Dashboard polish |
| **6** | Dashboard puis Agenda, Clientes, Services, Employées, … | — |

**Règle :** ne pas coder toutes les pages d’un coup. Fondation → vitrine → auth → DB → moteur → écrans.

---

## 15. Interdits V1 (rappel)

- Microservices / multi-repos
- Auth maison
- Logique métier dans React
- `organizationId` / rôle fournis par le frontend
- Stock mutable comme source de vérité
- Float pour l’argent
- Photos clientes
- WhatsApp automatisé / faux READ-REPLIED
- Numérotation facture côté frontend
- Email partagé PlatformUser + User

---

## 16. Checklist « architecture figée »

- [x] 3 domaines + backend commun
- [x] Login unique, serveur décide PLATFORM vs ORG
- [x] Email unique **cross-tables** PlatformUser ↔ User
- [x] Chaîne Session → RLS
- [x] EXCLUDE agenda staff + resource
- [x] Decimal + historique financier non réécrit
- [x] Ledger stock
- [x] COMPLETED idempotent
- [x] WhatsApp PREPARED → wa.me → SENT
- [x] AuditLog + soft delete
- [x] Structure modules + ordre de build

**Prochaine action autorisée :** Étape 1 — Fondation frontend (scaffold Next.js + Tailwind + theme), sans pages métier.
