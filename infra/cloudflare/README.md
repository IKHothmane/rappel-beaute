# Cloudflare — DNS & HTTPS (`rappelbeauty.com`)

Configuration cible pour Rappel Beauty (étape 41) — **Railway + Cloudflare**.

## Schéma

```
                    Cloudflare (proxy ON)
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
  www.rappelbeauty.com  app.rappelbeauty.com  admin.rappelbeauty.com
        │                     │                     │
     Vitrine              Application           Super Admin
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              ↓
                    Railway — Next.js (1 deploy)
                              │
                    PostgreSQL + Redis (privés)
```

## Enregistrements DNS (après health Railway OK)

Remplacer `xxx.up.railway.app` par le CNAME affiché dans Railway → Custom Domain.

| Type | Nom | Contenu | Proxy |
|------|-----|---------|-------|
| CNAME | `www` | `xxx.up.railway.app` | ✅ Proxied |
| CNAME | `app` | `xxx.up.railway.app` | ✅ Proxied |
| CNAME | `admin` | `xxx.up.railway.app` | ✅ Proxied |
| CNAME | `@` | `xxx.up.railway.app` (ou redirect → www) | ✅ Proxied |

⚠️ Ne pas créer ces records tant que `https://xxx.up.railway.app/api/health/` n’est pas vert.

## Booking public

Phase 1 (actuelle) :

```
https://app.rappelbeauty.com/book/institut-royal/
```

Phase 2 (optionnel) :

```
https://book.rappelbeauty.com/institut-royal/
```

## SSL/TLS

- Mode : **Full (strict)**
- Always Use HTTPS : **ON**
- Automatic HTTPS Rewrites : **ON**
- Minimum TLS : 1.2

L'application force aussi HTTP → HTTPS via middleware (`x-forwarded-proto`).

## Cookies session

En production (`NODE_ENV=production`) :

- `HttpOnly`
- `Secure`
- `SameSite=Lax`

## Redirect Rules

| Règle | Action |
|-------|--------|
| `http://*rappelbeauty.com/*` | Redirect 301 → HTTPS |
| `rappelbeauty.com/*` | Redirect 301 → `https://www.rappelbeauty.com/$1` (optionnel) |

## Rate limiting Cloudflare (couche edge)

Complète le rate limit Redis applicatif :

- `/api/auth/login/` — 10 req/min/IP
- `/api/public/booking/` — 30 req/min/IP

## R2 (stockage S3-compatible)

```
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_PUBLIC_URL=https://assets.rappelbeauty.com
S3_BUCKET=rappel-beauty-prod
```

## Checklist go-live

- [ ] DNS propagé (www / app / admin / apex)
- [ ] Certificat SSL actif sur tous les hosts
- [ ] `HEALTH_BASE_URL=https://app.rappelbeauty.com`
- [ ] Test booking public en HTTPS
- [ ] Test login app + admin en HTTPS (sans `?__host=`)

Voir aussi : `infra/railway/PRODUCTION.md`
