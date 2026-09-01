# 📘 RAPPEL BEAUTÉ — Cahier des charges consolidé & prompt de démarrage

Version : 1.3
Portée : 3 propriétés distinctes sous un seul modular monolith Next.js

| Domaine | Rôle | Type de compte |
|---|---|---|
| `www.rappelbeaute.ma` | Vitrine publique | Aucun (public) |
| `app.rappelbeaute.ma` | Application institut | `User` (ORGANIZATION) |
| `admin.rappelbeaute.ma` | Backoffice plateforme | `PlatformUser` (PLATFORM) |

---

## 0. Décisions déjà figées (à ne pas rouvrir sans raison forte)

- **Architecture** : modular monolith, un seul codebase Next.js + TypeScript, 3 domaines routés par middleware selon le hostname.
- **Stack** : Next.js, Tailwind, PostgreSQL, Prisma, Redis + BullMQ, S3/R2, Docker, Cloudflare.
- **Multi-tenant** : `organizationId` sur chaque table métier + RLS PostgreSQL en deuxième couche (la couche applicative reste la protection principale).
- **Rôles V1** (matrice statique en code, pas de table `Permission`) : `OWNER`, `MANAGER`, `STAFF`, `CASHIER`, `ACCOUNTANT`.
- **Plans** : `STARTER` (299 MAD, 150 RDV/mois), `INSTITUT` (499 MAD, 300 RDV/mois), `PREMIUM` (899 MAD, illimité + multi-sites).
- **WhatsApp V1** : manuel assisté uniquement — le système prépare, l'humain envoie et marque. Pas de bot, pas d'API Business officielle avant Phase 3.
- **Photos clientes** : aucune en V1.
- **Argent** : toujours `Decimal`, jamais `Float`.
- **Agenda** : contrainte `EXCLUDE USING gist` PostgreSQL anti-chevauchement (staffId et resourceId), à ajouter en migration SQL brute.
- **Historique** : snapshot de prix/durée sur `Appointment`, mouvements de stock en ledger append-only, soft delete (`deletedAt`/`status`) sur les entités sensibles.
- **Auth** : solution éprouvée (Auth.js ou équivalent), pas d'auth maison. Un seul formulaire de connexion, le backend détermine le type de compte.
- **Schéma de données** : `schema.prisma` déjà rédigé (v1.3, avec `SubscriptionPlan` renommé et support multi-sites via `Organization.parentOrganizationId`).

---

## 1. 🌐 VITRINE PUBLIQUE — `www.rappelbeaute.ma`

### 1.1 Cahier des charges fonctionnel

**Objectif** : convertir un visiteur (patronne d'institut) en demande d'essai ou de démo. Aucune donnée métier n'est servie depuis ce domaine — c'est un site marketing statique/SSG, sans session utilisateur.

**Contrainte de cohérence importante** : la vitrine promet *"Essayer gratuitement 14 jours, sans carte bancaire"*, mais le cahier des charges V1 interdit la création libre d'institut (seul le SUPER_ADMIN crée les comptes). **Décision retenue** : la page d'essai est un formulaire de **demande** (lead), avec engagement affiché *"Votre accès sera activé sous 24h"*. Cela respecte le flux `SUPER_ADMIN → Créer institut → Créer OWNER → Activer → Envoyer accès` sans mentir au visiteur.

**SEO / perf** : rendu statique (SSG) ou ISR, pas de dépendance à la base de données applicative — doit pouvoir être déployée indépendamment du reste si besoin plus tard.

### 1.2 Liste des pages

| # | Page | Route | Contenu clé |
|---|---|---|---|
| 1 | Accueil | `/` | Hero, 6 fonctionnalités, bloc sécurité/architecture, bloc WhatsApp manuel, tarifs (3 plans), stats + témoignage, CTA final |
| 2 | Fonctionnalités détaillées | `/fonctionnalites` | Sections ancrées : agenda, clientes, stock, caisse, fidélité, analytics |
| 3 | Tarifs | `/#tarifs` (ancre sur l'accueil en V1) | 3 cartes de plans avec quotas RDV/mois et feature-gating |
| 4 | À propos | `/apropos` | Histoire, mission, équipe (placeholder V1) |
| 5 | Ressources | `/ressources` | Hub : centre d'aide, blog, guides institut, doc API (placeholders V1, contenus réels plus tard) |
| 6 | Connexion | `/login` | Formulaire unique email + mot de passe ; le backend redirige vers `admin.` ou `app.` selon le type de compte |
| 7 | Demander une démo | `/demo` | Formulaire lead : nom, institut, ville, téléphone, email, message |
| 8 | Demande d'essai | `/essai` | Formulaire lead avec plan présélectionné via `?plan=starter\|institut\|premium` ; message "activation sous 24h" |
| 9 | Mentions légales | `/mentions-legales` | ICE, raison sociale, hébergeur — obligatoire avant mise en production commerciale au Maroc |
| 10 | Politique de confidentialité | `/confidentialite` | Traitement des données personnelles (loi 09-08 / CNDP) |
| 11 | 404 | `/404` | Page d'erreur générique avec retour à l'accueil |

---

## 2. 🏢 APP INSTITUT — `app.rappelbeaute.ma`

### 2.1 Cahier des charges fonctionnel

**Public** : `OWNER`, `MANAGER`, `STAFF`, `CASHIER`, `ACCOUNTANT` d'un institut donné. Toute route (sauf la page de réservation publique) exige une session `ORGANIZATION` valide et applique la matrice de permissions par rôle **et** le feature-gating par plan (`STARTER` n'a pas accès à `/stock`, `/cash-register`, etc.).

**Règle de sécurité** : le middleware vérifie `hostname === app.rappelbeaute.ma` ET `session.accountType === 'ORGANIZATION'` avant de laisser passer une requête. Un `PlatformUser` connecté qui arrive ici est redirigé/rejeté.

**Page de réservation publique** : accessible sans authentification à `app.rappelbeaute.ma/reserver/:slug` (choix V1 : chemin plutôt que sous-domaine par institut, pour éviter la gestion de sous-domaines dynamiques ; à revoir si le besoin de branding par institut devient fort). Cette route ne doit exposer que services, disponibilités et prise de RDV — aucune donnée privée de l'institut.

### 2.2 Liste des pages (26 écrans)

| # | Écran | Route | Rôles avec accès | Plan minimum |
|---|---|---|---|---|
| 1 | Onboarding (10 étapes, reprenable) | `/onboarding` | OWNER | Tous |
| 2 | Dashboard | `/dashboard` | Tous (vue adaptée par rôle) | Tous |
| 3 | Agenda | `/agenda` | OWNER, MANAGER, STAFF (son agenda) | Tous |
| 4 | Clientes (liste) | `/clients` | OWNER, MANAGER, STAFF | Tous |
| 5 | Fiche cliente (onglets : profil, historique, fidélité, forfaits, paiements, notes) | `/clients/:id` | OWNER, MANAGER, STAFF (limité) | Tous |
| 6 | Services | `/services` | OWNER, MANAGER | Tous |
| 7 | Employées (onglets : fiches, planning, commissions) | `/employees` | OWNER, MANAGER | Tous |
| 8 | Ressources | `/resources` | OWNER, MANAGER | Tous |
| 9 | Stock & produits (onglets : produits, mouvements, inventaire, alertes) | `/stock` | OWNER, MANAGER | INSTITUT+ |
| 10 | Fournisseurs & achats (onglets) | `/suppliers-purchases` | OWNER, MANAGER | INSTITUT+ |
| 11 | Caisse & paiements | `/cash-register` | OWNER, MANAGER, CASHIER | INSTITUT+ |
| 12 | Ticket / reçu | `/cash-register/tickets/:id` | OWNER, MANAGER, CASHIER | INSTITUT+ |
| 13 | Dépenses | `/expenses` | OWNER, MANAGER, ACCOUNTANT (limité) | INSTITUT+ |
| 14 | WhatsApp (file "à envoyer", manuel) | `/whatsapp` | OWNER, MANAGER | Tous |
| 15 | Fidélité & forfaits | `/loyalty-packages` | OWNER, MANAGER | INSTITUT+ |
| 16 | Marketing (campagnes) | `/marketing` | OWNER, MANAGER | INSTITUT+ |
| 17 | Promotions & cartes cadeaux | `/promotions-giftcards` | OWNER, MANAGER | INSTITUT+ |
| 18 | Avis clients | `/reviews` | OWNER, MANAGER | INSTITUT+ |
| 19 | Analytics | `/analytics` | OWNER, MANAGER, ACCOUNTANT | INSTITUT+ (avancé), Tous (basique) |
| 20 | Rapports & exports | `/reports` | OWNER, MANAGER, ACCOUNTANT (limité) | INSTITUT+ |
| 21 | Centre de notifications | `/notifications` | Tous | Tous |
| 22 | Paramètres (onglets : institut, business, communication, utilisateurs, abonnement) | `/settings` | OWNER (MANAGER limité) | Tous |
| 23 | Profil & sécurité | `/profile` | Tous | Tous |
| 24 | Dashboard consolidé multi-sites | `/sites` | OWNER | PREMIUM uniquement |
| 25 | Page de réservation publique | `/reserver/:slug` | Public (sans auth) | Tous |
| 26 | Erreurs (403 / 404) | `/403`, `/404` | — | — |

---

## 3. 👑 BACKOFFICE SUPER ADMIN — `admin.rappelbeaute.ma`

### 3.1 Cahier des charges fonctionnel

**Public** : uniquement `PlatformUser`. Complètement séparé des comptes d'instituts — pas de rôle partagé, pas de table commune avec `User`.

**Règle de sécurité** : middleware `hostname === admin.rappelbeaute.ma` ET `session.accountType === 'PLATFORM'`. Toute action d'impersonation (support) doit être journalisée dans `ImpersonationLog` avec horodatage de début/fin.

### 3.2 Liste des pages

| # | Écran | Route | Contenu clé |
|---|---|---|---|
| 1 | Dashboard plateforme | `/dashboard` | MRR, ARR, instituts actifs, RDV traités, croissance MRR |
| 2 | Instituts (liste) | `/organizations` | Recherche, filtre par plan/statut |
| 3 | Créer un institut | `/organizations/new` | Nom, ville, owner, plan → déclenche création `Organization` + `User` OWNER + `Subscription` |
| 4 | Détail institut | `/organizations/:id` | Infos, abonnement, historique d'audit, actions (suspendre/réactiver/support) |
| 5 | Mode support (impersonation) | `/organizations/:id/support` | Connexion en tant que l'institut, journalisée |
| 6 | Abonnements & plans | `/subscriptions` | Vue globale des abonnements, statut de facturation |
| 7 | Journal d'audit global | `/audit` | Recherche cross-instituts (accès plateforme uniquement) |
| 8 | Paramètres plateforme | `/settings` | Config globale (ex. modèles WhatsApp par défaut, textes légaux) |
| 9 | Mon profil (PlatformUser) | `/profile` | Sécurité, mot de passe |
| 10 | Erreurs (403 / 404) | `/403`, `/404` | — |

---

## 4. 🚀 PROMPT DE DÉMARRAGE — à copier-coller pour lancer le développement

```
Contexte : je construis "Rappel Beauté", un SaaS multi-tenant de gestion
d'instituts de beauté au Maroc. Le schéma de données est déjà figé
(schema.prisma fourni). Je veux démarrer l'implémentation.

Stack imposée :
- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma
- Redis + BullMQ pour les jobs asynchrones
- Auth.js (ou équivalent éprouvé) — pas d'auth maison
- Un seul codebase, routé en middleware selon 3 hostnames :
  www.rappelbeaute.ma (public), app.rappelbeaute.ma (ORGANIZATION),
  admin.rappelbeaute.ma (PLATFORM)

Règles non négociables :
1. Chaque requête sur une donnée métier doit filtrer par organizationId
   (isolation multi-tenant), avec RLS PostgreSQL en deuxième couche.
2. Aucune donnée financière en Float — Decimal partout.
3. L'agenda doit avoir une contrainte EXCLUDE (staffId, resourceId) x
   tsrange(startAt, endAt) — pas seulement une vérification applicative.
4. WhatsApp reste manuel assisté (READY → OPENED → MARKED_SENT), aucun
   envoi automatique, aucun statut "lu/répondu".
5. Les rôles (OWNER, MANAGER, STAFF, CASHIER, ACCOUNTANT) sont vérifiés
   via une matrice statique en code, pas une table Permission.
6. Le plan de l'organisation (STARTER/INSTITUT/PREMIUM) conditionne
   l'accès aux modules (feature-gating), en plus du rôle.
7. Soft delete partout où l'historique compte (Customer, Appointment,
   Payment, Organization) — jamais de DELETE réel sur ces tables.

Ordre de développement (sprints) :
Sprint 1 — Fondation : Auth, User/PlatformUser, Organization, rôles,
           middleware multi-domaine, audit log, RLS.
Sprint 2 — Institut : onboarding, services, staff, resources, customers.
Sprint 3 — Agenda : disponibilité, appointments, contrainte EXCLUDE.
Sprint 4 — Argent : payments, cash register, expenses, commissions,
           numérotation de factures (DocumentSequence, transaction-safe).
Sprint 5 — Stock : products, inventory ledger, suppliers, purchases,
           consommation automatique à la fin d'un service.
Sprint 6 — Réservation publique : /reserver/:slug, disponibilité temps réel.
Sprint 7 — Communication : templates WhatsApp, file "à envoyer",
           notifications.
Sprint 8 — Croissance : loyalty, packages, promotions, gift cards,
           reviews, marketing (envoi manuel WhatsApp/email).
Sprint 9 — Pilotage : dashboard, analytics, rapports, exports.
Sprint 10 — Vitrine publique : pages statiques (SSG), formulaires de
           lead (demo, essai), sans dépendance à la DB applicative.
Sprint 11 — Backoffice super admin : dashboard plateforme, gestion
           instituts, abonnements, mode support avec impersonation loggée.

Commence par Sprint 1 : mets en place le schema.prisma fourni, la
migration SQL complémentaire pour la contrainte EXCLUDE et les policies
RLS, puis l'authentification unique (un seul formulaire /login qui
détermine PlatformUser vs User par email, avec email globalement unique
sur User pour permettre cette recherche).
```

---

## 5. À trancher avant de coder (non bloquant mais à garder en tête)

- **Page de réservation publique** : chemin (`/reserver/:slug`) retenu pour la V1 par simplicité, à réévaluer si les instituts veulent une URL personnalisée (sous-domaine dynamique = complexité DNS/certificats supplémentaire).
- **Dashboard multi-sites (Premium)** : lecture seule agrégée, à spécifier précisément (quelles métriques consolidées, quel niveau de détail par site) avant le Sprint 9.
- **Contenu réel des pages Ressources/À propos/Blog** : actuellement des placeholders côté vitrine, à remplir avec du vrai contenu avant lancement commercial.
