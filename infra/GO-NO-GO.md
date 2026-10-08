# Checklist GO / NO-GO — Rappel Beauté

**Décision en cours : rester sur l’environnement Railway déjà en place (staging).**  
Pas de second environnement production, pas de second PostgreSQL, pas de second Redis — ça doublerait la facture.  
`infra/railway/PRODUCTION.md` reste une procédure pour plus tard, pas une action à lancer maintenant.

Guides : `infra/railway/STAGING.md`, `infra/cloudflare/README.md`.

## Règle

| Verdict | Condition |
|---------|-----------|
| **GO** | Toutes les cases **bloquantes** cochées |
| **NO-GO** | Une seule case bloquante restante |

---

## Bloquantes (NO-GO si non cochées)

### Environnements

- [ ] **STAGING** isolé (Next.js + PostgreSQL + Redis **propres**)
- [ ] **PRODUCTION** isolé (Next.js + PostgreSQL + Redis **propres**)
- [ ] Staging **ne** pointe **jamais** vers `DATABASE_URL` / Redis prod
- [ ] Secrets distincts staging ≠ prod (`SESSION_SECRET`, `ENCRYPTION_KEY`, OAuth…)

### Données

- [ ] Backups Railway Postgres prod : Daily + Weekly + Monthly
- [ ] Au moins un **restore testé** (voir `ops:verify-restore` / `ops:dr-test` / workflow `restore-test.yml`)
- [ ] Migrations uniquement via `prisma migrate deploy` (release) — jamais `db push` / `migrate reset` / seed démo en prod

### Sécurité & auth

- [ ] SUPER_ADMIN → admin uniquement (pas d’app institut)
- [ ] OWNER → uniquement son organisation
- [ ] Isolation multi-tenant A/B vérifiée (API + UI)
- [ ] Aucun secret dans Git / Dockerfile / logs

### Runtime

- [ ] Build prod vert
- [ ] `/api/health/` → `200` avec `database: ok` (et `redis: ok` si `REDIS_URL`)
- [ ] Domaines HTTPS (Cloudflare) : marketing + app + admin
- [ ] Si `ORIGIN_SECRET` actif : healthcheck HTTP **Railway désactivé** ; monitoring via `HEALTH_BASE_URL` (domaine public)

### Produit critique

- [ ] RDV : double booking impossible (contrainte GiST)
- [ ] Stock : pas de stock négatif sous concurrence
- [ ] Paiements : subscription ≠ invoice ≠ payment ; refunds corrects
- [ ] Boutique publique `/book/:slug/` : commande → stock → `InventoryMovement`

---

## Recommandées (fortement, non bloquantes V1 soft-launch)

- [ ] Restart policy `ALWAYS` (déjà dans `railway.toml`)
- [ ] Monitoring `/system/health` + alertes (`ALERT_WEBHOOK_URL`)
- [ ] Audit : LOGIN, ROLE_CHANGED, PAYMENT_*, ORGANIZATION_*
- [ ] E2E Playwright sur staging (`test:e2e`)
- [ ] Plan de rollback documenté (`infra/rollback/README.md`)
- [ ] Mobile : aucune URL localhost / staging en build store

---

## Commandes Railway (rappel)

| Phase | Commande |
|-------|----------|
| Build | `npm run build` |
| Pre-Deploy / Release | `npx prisma migrate deploy` |
| Start | `npm run start` → `next start` |

WhatsApp V1 = manuel → ne pas exiger `WHATSAPP_*` si non utilisés.

---

## Ordre d’exécution (maintenant)

1. Créer / valider **environnement Railway `staging`** + PG/Redis staging  
2. Déployer staging → health OK → smoke tests  
3. Valider backups + restore sur **copie** (pas sur prod live)  
4. Verrouiller variables **production** (secrets nouveaux)  
5. DNS / Cloudflare  
6. Deploy prod → smoke → ouvrir instituts

**Ne pas** promouvoir l’environnement actuel « tel quel » en production s’il mélange données de test et secrets partagés avec le local.

---

## État code vs actions Railway (étapes 2 → 23)

Le domaine câblé dans le repo est **`rappelbeauty.com`** (`www` / `app` / `admin`). `rappelbeaute.ma` n’est pas dans le code : ne pas l’ouvrir tant que DNS + `NEXT_PUBLIC_*` ne sont pas alignés.

| # | Sujet | Dans le repo | À faire dans Railway / navigateur |
|---|--------|--------------|-------------------------------------|
| 2–3 | Backups volume + PITR + `pg_dump` | `npm run ops:backup` (format custom `.dump`), rétention locale 14 j, `*.dump` gitignoré | Postgres prod → Backups : Daily, Weekly, Monthly, PITR si le plan l’offre. Copier le dump **hors** du projet Railway |
| 4 | Restore testé | `ops:restore` + `ops:verify-restore` (Users, Orgs, RDV, Product, PosSale, Payments, InventoryMovement, AuditLog, contrainte EXCLUDE) | Restaurer sur une **base vide de test**, jamais sur la prod live |
| 5 | Variables | `.env.production.example` | Service Next.js, environnement production uniquement. Références `${{Postgres.DATABASE_URL}}` et `${{Redis.REDIS_URL}}` |
| 6 | Secrets | Pas de `.env.production` versionné. Logger masque password, token, secret, DATABASE_URL | `SESSION_SECRET` et `ENCRYPTION_KEY` **nouveaux** (`openssl rand -base64 32`), différents du local et du staging |
| 7–8 | Auth + multi-tenant | Tests `tests/security`, `tests/stabilization/multi-tenant.test.ts` | Smoke manuel : SUPER_ADMIN sur admin, OWNER bloqué hors de son institut |
| 9–12 | Paiements, stock, boutique, RDV | Stock en `FOR UPDATE` ; RDV `EXCLUDE USING gist` (`appointment_no_staff_overlap`) | Rejouer les scénarios sur **staging** avant le DNS prod |
| 13 | Healthcheck Railway | `/api/health/` renvoie 200 ou 503 | **Laisser le healthcheck Railway vide** si `ORIGIN_SECRET` est défini : le middleware répond 403 sans l’en-tête Cloudflare. La sonde est `HEALTH_BASE_URL` (domaine public) |
| 14 | Restart | `railway.toml` → `ALWAYS` | Vérifier que le service n’a pas été forcé à On Failure dans l’UI |
| 15–17 | Health, logs, audit | `/system/health`, logger redact, AuditLog (LOGIN, org, subscription…). WhatsApp V1 = tâches manuelles, pas d’API Meta | Contrôle visuel admin après deploy staging |
| 18 | Domaines | `www` + `app` + `admin` `.rappelbeauty.com`. Booking : `app…/book/:slug/` | Custom domains Railway puis Cloudflare Full (strict). `book.` = plus tard |
| 19 | Mobile | — | Aucune URL `localhost` / staging dans le build store |
| 20 | E2E | Playwright `npm run test:e2e` + vitest sécurité | Les faire passer sur staging |
| 21–22 | Prisma | Build = `prisma generate && next build`. Release = `npx prisma migrate deploy`. Start = `next start` | Ne pas ajouter `migrate` dans Start. Pas de `db push` / `migrate reset` / seed démo |
| 23 | Verdict | Migrations et restart sont prêts côté repo | **NO-GO** tant que backups non activés, restore non prouvé, staging ≠ prod non prouvé |
