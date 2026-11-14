# GitHub Environments — étape 41

Les workflows `staging.yml`, `production.yml`, `monitor-health.yml` et `restore-test.yml` s'appuient sur des **GitHub Environments** avec secrets distincts.

> ⚠️ **Staging et production doivent avoir des bases PostgreSQL différentes.** Jamais la même `DATABASE_URL`.

## Création (interface GitHub)

```
GitHub → Settings → Environments → New environment
```

Créer deux environnements :

| Environment | Usage |
|-------------|--------|
| `staging` | Pré-production, tests DR, E2E réels |
| `production` | Go-live |

## Secrets — `staging`

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | PostgreSQL staging (pooler OK) |
| `DIRECT_DATABASE_URL` | Connexion directe (migrations Prisma) |
| `REDIS_URL` | Redis staging |
| `SESSION_SECRET` | Min. 32 car. — `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Min. 32 car. — **différent** de production |
| `ALERT_WEBHOOK_URL` | Slack / Discord / n8n pour alertes |
| `S3_ENDPOINT` | R2 ou S3 (optionnel staging) |
| `S3_ACCESS_KEY` | |
| `S3_SECRET_KEY` | |
| `S3_BUCKET` | |

## Secrets — `production`

Même liste, **valeurs totalement différentes** :

- Autre instance PostgreSQL
- Autre Redis
- Autres secrets cryptographiques
- Bucket S3 dédié production

Déploiement réel (`production.yml`) :

| Secret / variable | Rôle |
|-------------------|------|
| `RAILWAY_TOKEN` | Jeton de **projet** Railway, limité à l’environnement de production. Ne pas définir `RAILWAY_API_TOKEN` dans le même job. |
| `RAILWAY_SERVICE` | **Variable** : nom du service Next.js. Jamais PostgreSQL ni Redis. |
| `ORIGIN_SECRET` | Optionnel. Envoyé en `x-rappel-origin` si l’origine l’exige. |
| `HEALTH_BASE_URL` | **Variable** déjà listée plus bas. La sonde appelle `${HEALTH_BASE_URL}/api/health/` et exige `database: ok`. |

## Variables (non secrètes)

Dans chaque environment, onglet **Variables** :

| Variable | staging | production |
|----------|---------|------------|
| `HEALTH_BASE_URL` | `https://app-staging.rappelbeaute.ma` | `https://app.rappelbeaute.ma` |

## Protection production

Sur l'environment `production` :

- ✅ Required reviewers (1–2 personnes)
- ✅ Deployment branch : `main` uniquement
- ✅ Wait timer optionnel (5 min)

## Vérification

1. `restore-test.yml` → **Run workflow** → doit passer (backup → restore → tests)
2. Déployer staging → `monitor-health.yml` → probes OK
3. `production.yml` → nécessite confirmation `DEPLOY` + reviewers

## Rollback

1. Re-déployer l'artifact / image de la version N précédente
2. **Ne pas** exécuter `prisma migrate reset` en production
3. Si migration N+1 incompatible : préparer migration de rollback SQL avant deploy

Voir aussi : `infra/cloudflare/README.md`, `.env.staging.example`, `.env.production.example`.
