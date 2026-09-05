# Étape 41 — Production Railway + Cloudflare (`rappelbeauty.com`)

> **Décision V1** : Cloudflare = DNS + SSL + proxy.  
> **App** = un seul service Next.js Railway.  
> **Données** = PostgreSQL + Redis Railway (jamais exposés sur Internet).  
> **Ne pas** pointer le DNS avant que `/api/health/` soit vert sur l’URL Railway.

## Architecture

```
                    Cloudflare (proxy ON)
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
  www.rappelbeauty.com  app.rappelbeauty.com  admin.rappelbeauty.com
  (apex → www)                │                     │
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              ↓
                    Railway — Next.js (1 service)
                              │
                    ┌─────────┼─────────┐
                    ↓         ↓         ↓
               PostgreSQL   Redis   (pas public)
```

Sous-domaines → routage middleware (sans `?__host=` en prod) :

| Host | Espace |
|------|--------|
| `rappelbeauty.com` / `www` | Marketing (www) |
| `app.rappelbeauty.com` | App institut |
| `admin.rappelbeauty.com` | Super Admin |
| `app…/book/:slug/` | Réservation publique |

---

## ÉTAPE A — Projet Railway production

1. [railway.app](https://railway.app) → **New Project** (ou projet existant **production**)
2. Nom suggéré : `rappelbeauty-production`
3. ❌ Ne pas réutiliser la DB staging

### Services à avoir

```
rappelbeauty-production
├── Next.js (GitHub)
├── PostgreSQL
└── Redis
```

Si Postgres + Redis existent déjà → **ne rien recréer**.

---

## ÉTAPE B — PostgreSQL + Redis (privés)

1. **+ New → Database → PostgreSQL** → Active
2. **+ New → Database → Redis** → Active
3. Noter que Railway expose `DATABASE_URL` / `REDIS_URL` **en privé** entre services  
   → le navigateur ne parle **jamais** à Postgres/Redis

---

## ÉTAPE C — Service Next.js

1. **+ New → GitHub Repo** → ce repo, branche `main`
2. `railway.toml` gère déjà :
   - Build : `npm run build` (`prisma generate` inclus)
   - Release : `npx prisma migrate deploy`
   - Start : `npm run start`

### Variables (service Next.js)

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DIRECT_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `NODE_ENV` | `production` |
| `APP_ENV` | `production` |
| `SESSION_SECRET` | `openssl rand -base64 32` (**≠ staging**) |
| `ENCRYPTION_KEY` | 32+ chars (**≠ staging**) |
| `NEXT_PUBLIC_APP_URL` | `https://app.rappelbeauty.com` |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.rappelbeauty.com` |
| `NEXT_PUBLIC_MARKETING_URL` | `https://www.rappelbeauty.com` |
| `APP_BASE_URL` | `https://app.rappelbeauty.com` |

Voir aussi `.env.production.example`.

### Premier deploy

1. Deploy → logs **Release** : `migrate deploy` OK
2. Seed **une fois** (données démo ou restore dump) :

```bash
railway link
railway run npm run db:seed
```

3. Health sur l’URL Railway (avant DNS) :

```
https://<xxx>.up.railway.app/api/health/
```

Attendu : `database: ok`, `redis: ok`.

---

## ÉTAPE D — Domaines custom Railway (avant Cloudflare)

Service Next.js → **Settings → Networking → Custom Domain** — ajouter :

- `www.rappelbeauty.com`
- `rappelbeauty.com` (apex, si supporté)
- `app.rappelbeauty.com`
- `admin.rappelbeauty.com`

Railway donne une cible **CNAME** (ex. `xxx.up.railway.app`).

---

## ÉTAPE E — Cloudflare DNS (seulement quand health vert)

Dans Cloudflare → zone **rappelbeauty.com** → **DNS** :

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `www` | CNAME Railway | ✅ Proxied |
| CNAME | `app` | CNAME Railway | ✅ Proxied |
| CNAME | `admin` | CNAME Railway | ✅ Proxied |
| CNAME / ALIAS | `@` | CNAME Railway (ou redirect → www) | ✅ |

**SSL/TLS** : Full (strict) · Always Use HTTPS ON · TLS min 1.2

Redirect (optionnel) : `rappelbeauty.com` → `https://www.rappelbeauty.com`

Détails : `infra/cloudflare/README.md`

---

## ÉTAPE F — Tests go-live

- [ ] `https://www.rappelbeauty.com` → vitrine
- [ ] `https://app.rappelbeauty.com/api/health/` → 200
- [ ] `https://app.rappelbeauty.com/login/` → login institut
- [ ] `https://admin.rappelbeauty.com/login/` → Super Admin
- [ ] `https://app.rappelbeauty.com/book/institut-royal/` → booking
- [ ] Cookies Secure / HTTPS only
- [ ] Aucune URL `localhost` dans les liens prod

---

## Migration données (si besoin)

```
PostgreSQL LOCAL
   → pg_dump
   → restore sur Postgres Railway (staging d’abord)
   → validation
   → production
Puis : npx prisma migrate deploy  (déjà en releaseCommand)
```

❌ Jamais `prisma db push` en production.

---

## Dépannage

| Symptôme | Action |
|----------|--------|
| Health DB fail | Variable `DATABASE_URL` liée au service Postgres |
| Health Redis fail | Variable `REDIS_URL` liée au Redis |
| Mauvais espace (app vs www) | Host Cloudflare correct + middleware `app.` / `admin.` |
| 502 Cloudflare | SSL Full (strict) + domaine custom Railway actif |
