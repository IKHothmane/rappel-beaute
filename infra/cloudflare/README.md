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

Cloudflare recommande **Full (strict)** quand l'origine a un certificat valide : le tronçon Cloudflare → Railway est chiffré et le certificat est vérifié.

## Protection de l'origine

`*.up.railway.app` est une entrée publique. `*.railway.internal` ne sert qu'entre services Railway. Railway ne documente pas d'allowlist « IP Cloudflare uniquement » sur un service HTTP public. Le verrou réaliste est donc :

1. Domaines publics uniquement via Cloudflare (proxy orange) : apex, `www`, `app`, `admin`.
2. SSL **Full (strict)**.
3. Secret d'origine, puis suppression du domaine Railway public une fois les domaines Cloudflare validés.

Ne pas supprimer `xxxxx.up.railway.app` tant que ces URL répondent correctement :

- `https://rappelbeauty.com`
- `https://www.rappelbeauty.com`
- `https://app.rappelbeauty.com`
- `https://admin.rappelbeauty.com`

### Secret `X-Rappel-Origin`

Couche applicative, pas un remplacement du verrouillage réseau. Next.js refuse la requête (`403`) seulement si `ORIGIN_SECRET` est défini.

1. Générer une valeur : `openssl rand -base64 32`
2. Cloudflare → Rules → Transform Rules → **Modify Request Header**
   - Action : **Set** static `X-Rappel-Origin` = le secret (Set écrase la valeur du client)
   - Appliquer à toutes les requêtes vers l'origine
3. Railway → Variables : `ORIGIN_SECRET` = la même valeur
4. Redéployer. Le middleware Next inline cette variable au build : l'ajouter sans rebuild ne l'active pas.
5. Ne pas mettre `ORIGIN_SECRET` en local.

Le Worker `admin-proxy-worker.js` efface le header reçu et le repose depuis le binding `ORIGIN_SECRET`.

Authenticated Origin Pulls (certificat client Cloudflare) se vérifie au niveau TLS de l'origine. Railway termine TLS avant Next.js : l'application ne voit pas ce certificat. Ne pas compter sur un contrôle AOP dans le code.

### Vérification

Chemin normal :

`https://app.rappelbeauty.com/api/health/` → `200`, `status` / `database` / `redis` à `ok`.

Chemin direct, une fois `ORIGIN_SECRET` actif :

`https://xxxxx.up.railway.app/api/health/` → `403`.

Railway n'a pas de `healthcheckPath` dans `railway.toml`. Un healthcheck HTTP Railway irait à l'origine sans passer par Cloudflare et recevrait aussi `403`. Laisser ce healthcheck désactivé ; le monitoring externe utilise `HEALTH_BASE_URL` sur le domaine Cloudflare.

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
- [ ] SSL Full (strict)
- [ ] Règle Cloudflare `X-Rappel-Origin` + `ORIGIN_SECRET` Railway + redeploy
- [ ] `https://xxxxx.up.railway.app/api/health/` répond 403
- [ ] `HEALTH_BASE_URL=https://app.rappelbeauty.com`
- [ ] Test booking public en HTTPS
- [ ] Test login app + admin en HTTPS (sans `?__host=`)

Voir aussi : `infra/railway/PRODUCTION.md`
