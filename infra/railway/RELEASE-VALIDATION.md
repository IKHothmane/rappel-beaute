# Vérification et bascule Railpack

## Validation Linux avant publication

Le workflow `Validation Railpack Linux` construit le candidat sur GitHub Actions lors d’un push sur `release/railway-stabilisation` et de sa PR vers `main`. Le runner utilise Railpack 0.44.0 et BuildKit. Pour reproduire avec un moteur Docker/BuildKit Linux, utiliser une copie du dépôt sans fichiers d’environnement du poste et exécuter les commandes suivantes.

```sh
railpack prepare --config-file infra/railway/railpack.candidate.json --env RAILPACK_NODE_VERSION=22.13.1 --plan-out /tmp/rb-railpack-plan.json .
railpack build --config-file infra/railway/railpack.candidate.json --env RAILPACK_NODE_VERSION=22.13.1 --platform linux/amd64 --name rappel-beaute-railpack:ci .
bash infra/railway/smoke-railpack.sh rappel-beaute-railpack:ci
```

Définir `RAILPACK_NODE_VERSION=22.13.1` également dans la configuration du builder Railway lors de la bascule approuvée. Le premier build a affiché le pin dans son plan, mais a installé la version issue du champ `engines`. Contrôler `node --version` avant `npm ci --include=dev` puis `npm run build` (génération Prisma, Next.js et CSS). Le build ne doit contenir aucune commande de migration. Dans l’image vérifier Node 22, les binaires OpenSSL et jemalloc, les dépendances Prisma, la disponibilité de `scripts/start-prod.sh` et le chargement effectif de Sharp. La vérification Sharp peut lire `require('sharp/package.json').version`, afficher `require('sharp').versions` et produire un WebP en mémoire. Reproduire la résolution de Next si `NEXT_SHARP_PATH` est défini.

1. Démarrer PostgreSQL et Redis jetables sur un réseau de validation sans références de production. Exécuter `npm run db:migrate:deploy` une fois dans un conteneur dédié au pré-déploiement. Comparer l’historique Prisma avant et après les démarrages et redémarrages.
2. Démarrer l’image avec un volume nommé jetable monté sur `/app/uploads`. Écrire un fichier témoin dans ce volume, détruire uniquement le conteneur de test et vérifier la présence du fichier dans un nouveau conteneur. Confirmer qu’aucune migration n’apparaît dans le journal de démarrage.
3. Vérifier dans le processus Next le chargement de jemalloc, les variables malloc/VIPS/libuv et l’argument old-space de 512 Mio. Confirmer `SELECT 1`, Redis `PING` et HTTP 200 sur `/api/health/`. Vérifier le refus de l’accès direct protégé et le succès via un proxy de test qui injecte un secret d’origine jetable. Avec un secret fictif, le garde actuel a refusé `healthcheck.railway.app` sans en-tête, et a accepté une requête avec l’en-tête correct. Maintenir la sonde externe Cloudflare pendant la transition. L’activation de la sonde native nécessite une solution et une validation séparées.
4. Envoyer SIGTERM au conteneur local et vérifier sa sortie dans le délai normal, sa fermeture sans SIGKILL et l’absence de processus enfant orphelin. La politique `ON_FAILURE` doit être évaluée avec le réglage de service validé en lecture seule, ou sur un service de test autorisé.

[Railpack CLI](https://railpack.com/reference/cli) · [Sondes Railway](https://docs.railway.com/deployments/healthchecks)

## Déploiement après autorisation

Railway annonce la fin de lecture des fichiers historiques `railway.toml` et `railway.json` au 1er décembre 2026 pour les services existants. `railpack.json` configure le builder Railpack séparément. `nixpacks.toml` concerne Nixpacks. Utiliser les réglages du service ou Infrastructure as Code pour le pré-déploiement, la sonde et la politique de redémarrage. [Référence Config as Code](https://docs.railway.com/config-as-code/reference)

1. Confirmer le SHA exact, un passage vert de la CI, le candidat Linux et l’identité de la base cible. Réconcilier les migrations en attente et prendre ou vérifier les sauvegardes PostgreSQL et volume. Conserver l’image et la configuration du dernier déploiement sain.
2. Faire approuver la désactivation de l’autodéploiement direct de `main` ou, si cette voie doit être conservée, faire approuver `Wait for CI` et les règles GitHub nécessaires. Au moment de ce contrôle, `checkSuites` est faux côté Railway et GitHub retourne `protected: false` pour `main`. Le workflow explicite attend désormais la CI. Une voie automatique parallèle peut contourner ce workflow.
3. Appliquer ensemble le nouveau builder, le pré-déploiement Prisma, le démarrage par Bash et la politique de redémarrage approuvée. Confirmer que le workflow GitHub publié ne fait aucune migration de la base déployée. Garder la configuration historique jusqu’à validation de cette bascule. Préserver les références PostgreSQL/Redis, le volume et sa région, ainsi que les variables et les domaines existants.
4. Lancer le déploiement du SHA approuvé via le workflow manuel. Vérifier dans les journaux une seule phase de migration, le démarrage du processus Node, puis les sondes, le volume, la mémoire et les parcours essentiels. Une nouvelle tentative peut rejouer la commande Prisma, qui ignore normalement les migrations appliquées.

[Déploiements automatiques](https://docs.railway.com/deployments/github-autodeploys) · [Pré-déploiement](https://docs.railway.com/deployments/pre-deploy-command)

## Retour arrière

Si le pré-déploiement échoue, laisser l’image active servir le trafic et examiner l’historique Prisma. Après bascule, revenir à la dernière image saine dont la compatibilité avec le schéma courant a été vérifiée. Vérifier la disponibilité de l’image dans la fenêtre de rétention et comparer le démarrage et les variables qui seront restaurées automatiquement par le rollback Railway. Conserver l’attachement du volume et les références de base. Éviter un rollback automatique du schéma. Une restauration indispensable de PostgreSQL ou du volume est une opération distincte à approuver, avec vérification du point de restauration. Contrôler les sondes, les données d’uploads et la santé PostgreSQL/Redis après retour arrière. [Actions de déploiement Railway](https://docs.railway.com/deployments/deployment-actions)
