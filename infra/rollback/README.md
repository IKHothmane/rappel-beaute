# Rollback — application & migrations

## Rollback application (recommandé)

```
Version N (stable)
     ↓ deploy
Version N+1
     ↓ problème détecté
Redéployer artifact / image Version N
```

- Pas de `migrate reset` en production
- Les migrations déjà appliquées restent en place si rétro-compatibles

## Test avant go-live

1. Appliquer migration N+1 sur staging
2. Déployer app N+1 → tests E2E
3. Redéployer app N (sans rollback migration) → vérifier que l'app N ne crash pas immédiatement
4. Si migration destructive → préparer script SQL de rollback **avant** production

## Restore catastrophe (DB perdue)

Voir `scripts/ops/dr-test.ts` et workflow `.github/workflows/restore-test.yml` :

```
backup .dump → DB vierge → pg_restore → migrate deploy → verify-restore → tests
```

## Checklist

- [ ] `restore-test.yml` vert en CI
- [ ] DR test manuel staging (`npm run ops:dr-test`)
- [ ] Rollback app testé sur staging
- [ ] Runbook incident documenté pour l'équipe
