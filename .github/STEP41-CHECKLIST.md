# Étape 41 — Checklist de clôture

> Pas de fonctionnalités métier. Valider l'exploitation réelle.

## 🔴 Priorité 1 — Restore Test (CI)

```
GitHub → Actions → « Backup → Restore Test » → Run workflow
```

Résultat attendu : **SUCCESS** (seed → backup → DB vierge → restore → migrate → verify → tests)

**Si le repo n'est pas encore sur GitHub :**
```powershell
git init
git add .
git commit -m "feat: étape 41 — CI restore, monitoring, storage"
git remote add origin https://github.com/IKHothmane/rappel-beaute.git
git push -u origin main
```
Puis lancer le workflow.

**Alternative locale** (Docker Desktop requis) :
```powershell
docker compose up -d postgres
.\scripts\ops\run-restore-test-local.ps1
```

---

## 🔴 Priorité 2 — GitHub Environments

`Settings → Environments → New environment`

### staging
| Secret / Variable | Notes |
|-------------------|-------|
| `DATABASE_URL` | DB staging dédiée |
| `DIRECT_DATABASE_URL` | Connexion directe migrations |
| `REDIS_URL` | Redis staging |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Différent de production |
| `ALERT_WEBHOOK_URL` | Discord ou Slack |
| `HEALTH_BASE_URL` | **Variable** (pas secret) ex. `https://app-staging.rappelbeaute.ma` |

### production
Mêmes clés, **valeurs totalement différentes**. DB production ≠ DB staging.

Protection production : required reviewers + branche `main` uniquement.

---

## 🔴 Priorité 3 — Monitoring + alerte reçue

### Discord
1. Serveur → Paramètres → Intégrations → Webhooks → Nouveau
2. Copier l'URL → secret `ALERT_WEBHOOK_URL` (staging)

### Test alerte
```powershell
$env:ALERT_WEBHOOK_URL="https://discord.com/api/webhooks/..."
npx tsx scripts/ops/test-alert.ts
```

### Test dégradation (staging déployé)
```powershell
# Arrêter PostgreSQL staging temporairement, puis :
npm run ops:monitor
# → notification 🔴 attendue
```

Workflow planifié : `monitor-health.yml` (toutes les 15 min).

---

## 🟠 Priorité 4 — Staging réel + E2E

```
main → CI → staging.yml → deploy → https://app-staging...
```

```powershell
$env:PLAYWRIGHT_BASE_URL="https://app-staging.rappelbeaute.ma"
npm run test:e2e
```

Parcours : Super Admin → Institut → OWNER → services → booking → COMPLETED → facture → paiement → stock → fidélité → WhatsApp → avis → analytics.

Spec : `e2e/commercial-flow.spec.ts`

---

## 🟢 Priorité 5 — Cloudflare + HTTPS

Voir `infra/cloudflare/README.md`

Hosts : `www`, `app`, `admin`, apex `rappelbeaute.ma`

Vérifier : HTTPS, cookies Secure, CSP, booking public, rate limiting.

---

## 🔴 Priorité 6 — Rollback testé

Voir `infra/rollback/README.md`

```
Version A → Deploy B → problème simulé → Rollback A → health → E2E ✅
```

---

## Critères de clôture 41

| Élément | Cible |
|---------|-------|
| Restore réellement exécuté | ✅ run CI vert |
| Alerte réellement reçue | ✅ test-alert + monitor |
| Staging E2E | ✅ commercial-flow |
| Rollback | ✅ testé staging |
| Cloudflare/HTTPS | ✅ domaines live |

**Quand les 5 sont verts → 41 TERMINÉE → alors seulement 43 IA.**
