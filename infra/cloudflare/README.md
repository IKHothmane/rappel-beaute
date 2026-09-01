# Cloudflare — DNS & HTTPS

Configuration cible pour Rappel Beauté (étape 41).

## Schéma

```
                    Cloudflare (proxy ON)
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
  www.rappelbeaute.ma   app.rappelbeaute.ma   admin.rappelbeaute.ma
        │                     │                     │
     Vitrine              Application           Super Admin
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              ↓
                         Next.js (1 deploy)
                              │
                    PostgreSQL + Redis
```

## Enregistrements DNS (exemple)

| Type | Nom | Contenu | Proxy |
|------|-----|---------|-------|
| CNAME | `@` | `cname.vercel-dns.com` ou IP VM | ✅ Proxied |
| CNAME | `www` | même origine | ✅ Proxied |
| CNAME | `app` | même origine | ✅ Proxied |
| CNAME | `admin` | même origine | ✅ Proxied |

`rappelbeaute.ma` (apex) → vitrine (redirect ou même app avec domaine `www`).

## Booking public

Phase 1 (actuelle) :

```
https://app.rappelbeaute.ma/book/institut-royal/
```

Phase 2 (isolation backend public) :

```
https://rappelbeaute.ma/book/institut-royal/
```

Le middleware route déjà via `x-rappel-domain` / sous-domaines.

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
- `SameSite=Lax` (ou `Strict` admin)

## Page Rules / Redirect Rules

| Règle | Action |
|-------|--------|
| `http://*rappelbeaute.ma/*` | Redirect 301 → HTTPS |
| `www.rappelbeaute.ma` | Canonique (optionnel apex → www) |

## Rate limiting Cloudflare (couche edge)

Complète le rate limit Redis applicatif :

- `/api/auth/login/` — 10 req/min/IP
- `/api/public/booking/` — 30 req/min/IP

## R2 (stockage S3-compatible)

```
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_PUBLIC_URL=https://assets.rappelbeaute.ma
S3_BUCKET=rappel-beaute-prod
```

Bucket public en lecture seule pour logos ; uploads via API Next.js uniquement.

## Checklist go-live

- [ ] DNS propagé (4 enregistrements)
- [ ] Certificat SSL actif sur tous les hosts
- [ ] `HEALTH_BASE_URL` configuré dans GitHub Environment
- [ ] Test booking public en HTTPS
- [ ] Test login app + admin en HTTPS
