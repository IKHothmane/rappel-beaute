# Correction de l'échec speed1 #185

## Reproduction et causes démontrées

Le fichier original `tests/security/tenant-isolation.api.test.ts` a été exécuté avant toute correction sur une nouvelle base locale, migrée et initialisée avec le seed du projet. Résultat : **8 tests réussis, 1 échec**, avec les mêmes trois références croisées signalées et deux divulgations API. La trace est conservée dans `reproduction.log`.

| Gravité | Entrée responsable | Cause SQL | Preuve avant correction |
| --- | --- | --- | --- |
| ÉLEVÉ | `POST /api/expenses` → `createExpense` | INSERT avec `supplierId` fourni par le client, sans vérification de son institut | Réponse 201, une dépense de B référence un fournisseur de A ; GET de B révèle « Beauty Pro ». |
| ÉLEVÉ | `POST /api/gift-cards` → `issueGiftCard` | INSERT avec `buyerCustomerId` et `beneficiaryCustomerId` sans vérification de leur institut | Réponse 201, les deux références relient B à une cliente de A ; GET de B révèle « El Amrani ». |
| ÉLEVÉ | `PATCH /api/expenses/[id]` → `updateExpense` | L'identifiant de la dépense était limité à B, mais son nouveau fournisseur n'était pas contrôlé | Nouveau test ciblé : refus 404 et empreinte de B inchangée. |

Les handlers utilisent déjà `auth.session.organizationId` et retirent l'`organizationId` du corps client. Le défaut porte sur les **références**, et non sur l'institut de la ligne principale. Les anciennes clés étrangères vérifient seulement l'existence de l'identifiant ; la RLS sur la ligne principale ne garantit pas l'égalité des instituts entre deux lignes. Les jointures fondées sur `id` seul exposaient ensuite les données liées.

## Fichiers corrigés

- `src/lib/db/tenant-reference.ts:4` : contrôle paramétré `id + organizationId`, sur la connexion de la transaction, avec verrou `FOR SHARE`. Même erreur pour une référence étrangère et une référence inexistante.
- `src/lib/db/expenses.ts:48` : jointures fournisseur/auteur limitées au même institut, identifiants liés pris dans ces jointures ; contrôle du fournisseur et de l'auteur avant INSERT et UPDATE. Un PATCH qui omet `supplierId` conserve la valeur stockée, y compris une ancienne incohérence, sans détachement silencieux.
- `src/lib/db/gift-cards.ts:34` : jointures acheteuse/bénéficiaire limitées au même institut dans les listes, recherches, lectures par identifiant et par code ; contrôle des deux clientes et de l'auteur avant émission. Historique filtré par institut ; journal limité à une carte et un auteur du même institut.
- `src/app/api/expenses/route.ts:60`, `src/app/api/expenses/[id]/route.ts:70`, `src/app/api/gift-cards/route.ts:121` : réponse générique 404 pour une référence refusée, sans indiquer si elle existe ailleurs.
- `prisma/migrations/20261113001000_tenant_reference_integrity/migration.sql` : trois clés étrangères composites associant l'identifiant lié et l'institut. Elles protègent aussi les écritures SQL directes et les changements de clés, indépendamment du rôle applicatif. Les contraintes sont ajoutées `NOT VALID` pour conserver les lignes anciennes, tout en imposant les nouvelles références. La migration n'exécute aucun DELETE ni UPDATE de données. Les suppressions futures conservent le comportement existant de remise à NULL de l'identifiant facultatif uniquement.
- `prisma/schema.prisma` : index uniques `id + organizationId` de Customer et Supplier. Les contraintes supplémentaires avec remise à NULL d'une seule colonne restent gérées par la migration SQL.
- `tests/security/tenant-isolation.api.test.ts:801` : huit cas supplémentaires ; aucune assertion d'origine supprimée ou assouplie.
- `tests/security/tenant-isolation.pg.test.ts:262` : synchronisation du test de coupure réseau sur la requête réellement active dans `pg_stat_activity`. Le délai fixe pouvait terminer avant la connexion et laisser réussir `pg_sleep`. L'assertion exigeant le rejet de la requête reste inchangée.

## Régressions couvertes

Les 17 scénarios API couvrent notamment : chaque référence étrangère séparément, identifiants inexistants, absence d'écriture et d'audit lors d'un refus, modification du fournisseur d'une dépense, liens valides et nuls, lecture par identifiant et code dans les deux sens, anciennes lignes incohérentes sans divulgation des noms/téléphones/identifiants de A, conservation de ces liens stockés lors d'une modification indépendante, refus SQL des trois références, douze créations concurrentes et deux cents lectures concurrentes.

Les anciennes incohérences sont simulées par une connexion de fixture privilégiée, uniquement sur la base locale, avec `SET LOCAL session_replication_role = replica`. Le réglage est rétabli par la fin de transaction ; les fixtures sont retirées dans un bloc `finally`. Le code applicatif n'utilise pas ce contournement.

## Relations similaires examinées

- Rendez-vous : `assertAppointmentReferences` vérifie cliente, prestation, employée et ressource dans l'institut. Le scénario hostile original les exerce.
- Fournisseurs/produits et achats : `upsertProductSupplier`, `createPurchase`, `updatePurchase` vérifient les ressources dans l'institut. Le test hostile couvre la création d'un achat ; cela ne prouve pas chaque variante de réception ou de modification.
- Liste d'attente : cliente, prestation et employée sont contrôlées avec `organizationId` avant création.
- Caisse/POS : cliente et produits sont cherchés dans l'institut avant création de la vente.
- Paiements/factures : le rendez-vous source est cherché dans l'institut. Les relations dérivées reposent également sur l'intégrité de ce rendez-vous.
- Cartes cadeaux : le débit cherche la carte par identifiant ou code avec l'institut ; l'historique et le journal ont été renforcés dans ce correctif.
- Le test d'origine parcourt les routes dynamiques, listes et exports protégés, contrôle les empreintes des instituts et recherche les références croisées sur les clés étrangères simples et tables de jonction.

Ces vérifications ne constituent pas une preuve exhaustive de toutes les relations et de toutes les branches du projet. Aucune base Railway ou de production n'a été inspectée : la présence éventuelle d'anciennes références incorrectes en production reste non vérifiée. Leur rapprochement et la validation ultérieure des contraintes nécessitent un travail distinct ; aucun nettoyage automatique n'est inclus.

## Environnement et commandes

PostgreSQL embarqué local uniquement : reproduction sur `127.0.0.1:55448/rappel_security185`, correction sur une seconde base neuve `127.0.0.1:55449/rappel_security185_fixed`. Migrations et seed exécutés uniquement sur ces bases. PostgreSQL local 18, service GitHub Actions configuré en 17 : le test et les assertions sont reproduits, pas l'image système complète de GitHub Actions. Redis distant exclu ; repli mémoire des tests utilisé.

```powershell
$env:DATABASE_TEST_URL = 'postgresql://postgres:postgres@127.0.0.1:55449/rappel_security185_fixed'
$env:DATABASE_URL = $env:DATABASE_TEST_URL
$env:DIRECT_DATABASE_URL = $env:DATABASE_TEST_URL
$env:TEST_DB_DIR = '.tmp/security185-fixed/pgdata'
$env:RLS_TEST_DATABASE_URL = $env:DATABASE_TEST_URL
$env:RUN_PHONE_SIGNUP_DB_TEST = '1'
$env:SESSION_SECRET = 'local-security185-session-secret-32-characters'
$env:APP_ENV = 'test'
$env:REDIS_TEST_URL = ''
$env:REDIS_URL = ''
npm.cmd test -- tests/security/tenant-isolation.api.test.ts
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
```

Build local dans `.tmp/next-security185`, avec URL PostgreSQL factice locale sur le port 1 et envois Sentry désactivés. Aucun commit, push, déploiement ou accès à Railway.

## Résultats

| Vérification | Résultat final |
| --- | --- |
| Test initial reproduit avant correction | 8 réussis, 1 échec avec les trois références et les deux divulgations attendues |
| Isolation API après correction | 17/17 réussis, dont huit nouveaux scénarios |
| Toute la suite Vitest, options de sécurité activées | 84 fichiers réussis ; 691 tests réussis, 0 échec, 2 ignorés |
| Tous les tests sous `tests/security` | 135/135 réussis, aucun ignoré |
| PostgreSQL réel / RLS / rôle `rappel_app` | 18/18 réussis, inclus dans les 135 |
| TypeScript (`npm.cmd run typecheck`) | Code de sortie 0 |
| ESLint (`npm.cmd run lint`) | Code de sortie 0, avertissements préexistants dans des composants non modifiés |
| Build (`npm.cmd run build`) | Code de sortie 0, 226 pages générées |
| `git diff --check` | Réussi |

Les deux tests encore ignorés appartiennent à `tests/ops/backup-restore.test.ts` : vérification des tables et cycle backup/restauration optionnels. Aucun test de sécurité n'est ignoré dans l'exécution finale. Aucune assertion n'a été supprimée ou affaiblie.

Un passage complémentaire a exposé l'instabilité de synchronisation du test de coupure RLS décrite plus haut ; la suite complète finale a été réexécutée après sa correction. Les résultats structurés figurent dans `resultats.json` ; les sorties sont conservées dans `vitest-final.log`, `typecheck.log`, `eslint.log` et `build.log`.
