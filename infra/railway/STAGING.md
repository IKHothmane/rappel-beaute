# Étape 41.1 — Staging Railway + Cloudflare DNS

> **Décision V1** : Cloudflare = DNS + SSL + proxy uniquement.  
> **App** = Railway (Node.js) + PostgreSQL + Redis.  
> **Pas** Cloudflare Workers / vinext pour l'instant.

## Architecture cible

```
staging.rappelbeaute.ma  (ou app-staging…)
         │
     Cloudflare (DNS + HTTPS)
         │
         ▼
   Railway — service Next.js
         │
    ┌────┴────┐
    ▼         ▼
PostgreSQL  Redis
 (staging)  (staging)
```

⚠️ **Jamais** la base locale → staging.  
⚠️ **Jamais** staging = production.

---

## Partie A — Railway (clic par clic)

### 1. Créer le projet

1. [railway.app](https://railway.app) → **New Project**
2. Nom : `rappelbeaute-staging`
3. Environnement : **staging** (ou un seul env pour commencer)

### 2. PostgreSQL staging

1. **+ New** → **Database** → **PostgreSQL**
2. Attendre le statut **Active**
3. Onglet **Variables** → copier `DATABASE_URL` (interne Railway)
4. Dupliquer en `DIRECT_DATABASE_URL` = même valeur (Railway sans pooler séparé en V1)

### 3. Redis staging

1. **+ New** → **Database** → **Redis**
2. Copier `REDIS_URL` (format `redis://…`)

### 4. Application Next.js (GitHub)

1. **+ New** → **GitHub Repo** → `IKHothmane/rappel-beaute`
2. Branche : `main`
3. Railway détecte `railway.toml` :
   - **Build** : `npm ci && npx prisma generate && npm run build`
   - **Release** : `npx prisma migrate deploy`
   - **Start** : `npm run start`

### 5. Variables d'environnement (service App)

Dans le service **Next.js** → **Variables** :

| Variable | Valeur | Notes |
|----------|--------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Référence service PG |
| `DIRECT_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Migrations Prisma |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Référence service Redis |
| `NODE_ENV` | `production` | |
| `APP_ENV` | `staging` | |
| `SESSION_SECRET` | *(générer)* | `openssl rand -base64 32` — **unique staging** |
| `ENCRYPTION_KEY` | *(générer)* | 32+ caractères — **≠ production** |
| `PORT` | `3000` | Railway injecte souvent `$PORT` — utiliser `${{PORT}}` si proposé |

**Optionnel (plus tard)** :

| Variable | Usage |
|----------|--------|
| `ALERT_WEBHOOK_URL` | Discord/Slack |
| `HEALTH_BASE_URL` | URL publique staging |

❌ **Ne pas** coller de secrets dans Cloudflare Workers UI.  
❌ **Ne pas** committer `.env.staging` dans Git.

### 6. Premier déploiement

1. **Deploy** → attendre build vert
2. Vérifier les logs **Release** : `migrate deploy` sans erreur
3. **Seed une seule fois** (CLI Railway) :

```bash
railway link          # projet rappelbeaute-staging
railway run npm run db:seed
```

4. Health check :

```
https://<votre-url-railway>.up.railway.app/api/health/
```

Attendu : `"database":"ok"`, `"redis":"ok"`.

### 7. Domaine custom staging

1. Service App → **Settings** → **Networking** → **Custom Domain**
2. Ajouter : `app-staging.rappelbeaute.ma` (ou `staging.rappelbeaute.ma`)
3. Railway affiche un **CNAME** cible (ex. `xxx.up.railway.app`)

---

## Partie B — Cloudflare (DNS seulement)

Sur l'écran **Workers** : **ne pas cliquer Déployer**.

1. **DNS** → **Add record**
2. Type **CNAME** | Nom `app-staging` | Cible = CNAME Railway | **Proxied** ✅
3. **SSL/TLS** → **Full (strict)**
4. Attendre propagation (5–30 min)

Test :

```
https://app-staging.rappelbeaute.ma/api/health/
https://app-staging.rappelbeaute.ma/login/?__host=app
https://app-staging.rappelbeaute.ma/login/?__host=admin
```

---

## Partie C — GitHub Environment `staging`

**Settings → Environments → staging**

| Secret | Valeur |
|--------|--------|
| `DATABASE_URL` | URL PostgreSQL **staging** (pour CI restore-test manuel si besoin) |
| `REDIS_URL` | Redis staging |
| `SESSION_SECRET` | = Railway staging |
| `ENCRYPTION_KEY` | = Railway staging |
| `ALERT_WEBHOOK_URL` | webhook test |

| Variable | Valeur |
|----------|--------|
| `HEALTH_BASE_URL` | `https://app-staging.rappelbeaute.ma` |

---

## Partie D — Validation staging

Checklist avant production :

- [ ] `GET /api/health/` → 200
- [ ] Login OWNER seed : `nadia@institutroyal.ma` / `demo1234`
- [ ] Login Super Admin : `admin@rappelbeaute.ma` / `demo1234`
- [ ] Booking public : `/book/institut-royal/?__host=app`
- [ ] `npm run test:e2e` avec `PLAYWRIGHT_BASE_URL=https://app-staging.rappelbeaute.ma`
- [ ] Restore Test CI vert (GitHub Actions)
- [ ] Alerte webhook testée (`npm run ops:test-alert`)

---

## Partie E — Production (après staging validé)

Dupliquer le projet Railway :

| | Staging | Production |
|---|---------|------------|
| Projet | `rappelbeaute-staging` | `rappelbeaute-production` |
| PostgreSQL | instance dédiée | **autre** instance |
| Redis | instance dédiée | **autre** instance |
| Secrets | uniques | **nouveaux** secrets |
| Domaine | `app-staging…` | `app.rappelbeaute.ma` |

---

## Dépannage Railway

| Problème | Action |
|----------|--------|
| Build échoue Prisma | Vérifier `DATABASE_URL` + `releaseCommand` logs |
| 503 health redis | Vérifier `REDIS_URL` référencé |
| Login OK local, KO staging | Re-seed : `railway run npm run db:seed` |
| Domaine SSL | Cloudflare **Full (strict)** + cert Railway actif |

---

## Fichiers repo liés

- `railway.toml` — build / release / start
- `.env.staging.example` — liste variables (sans valeurs)
- `infra/cloudflare/README.md` — DNS production
- `.github/ENVIRONMENTS.md` — secrets GitHub
