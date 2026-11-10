# Audit final RLS multi-tenant : Rappel Beauty

Date : 2026-11-10. Base de test : PostgreSQL 17.11 local jetable (port 54329), hors Railway, sans clé réelle. Aucun commit, aucun push, aucune migration appliquée à une base réelle.

## 1. Résumé exécutif

- **L'isolation PostgreSQL tient.** Sur 99 tables, avec le rôle réel `rappel_app` : aucune lecture, modification, suppression ou insertion d'un institut vers l'autre, aucune ligne visible sans contexte ou avec un identifiant invalide ou piégé. 600 requêtes HTTP simultanées A/B entrelacées : 0 fuite.
- **Deux défauts réels trouvés et corrigés dans le code** (non commités) : références inter-instituts acceptées sur les rendez-vous (R4), et sessions qui survivaient à la désactivation d'un administrateur ou à la suspension d'un institut.
- **Le risque R4 reste ouvert en base** : la protection de fond (contraintes composites) est écrite et testée sur copie jetable, mais non appliquée. 35 clés de tables enfants ne sont pas couvertes.
- **Le coût de performance est le vrai frein.** RLS multiplie par 4 le nombre d'instructions SQL par requête (BEGIN, contexte, requête, COMMIT). Médiane +10 % à +120 % selon la route, débit en charge mixte −32 %, p95 +48 %. Ce coût s'applique dès que l'application utilise `rappel_app`, même avec `RLS_ENFORCE` vide (étape 2 de la procédure).
- **Verdict** : voir section 11. Déploiement du code sans activation : GO conditionnel. Activation sur la démo : GO conditionnel. Instituts volontaires et `RLS_ENFORCE=all` : NO-GO aujourd'hui.

Les résultats annoncés précédemment ont été rejoués, pas repris : voir section 5.

## 2. Architecture RLS analysée

- `tenant-context.ts` : portée par requête dans un `AsyncLocalStorage` (`tenant`, `public`, `platform`, `job`). `decideQuery` est une fonction pure : route métier sans institut = refus dès que l'isolation est active, `all` refuse tout accès sans portée.
- `route-scope.ts` : chaque handler est enveloppé (`tenantRoute`, `publicRoute`, `platformRoute`, `jobRoute`). Un test échoue si un handler est nu. Vérifié : 219 fichiers de route, 316 handlers, 0 handler nu (187 `tenantRoute`, 63 `publicRoute`, 60 `platformRoute`, 6 `jobRoute`).
- `api-guard.ts` : `requireAppSession` lie l'institut du jeton signé avant toute lecture (`bindOrganization`), puis relit l'utilisateur en base.
- `tenant-pool.ts` : couche posée sur les 42 pools. Contexte posé par `set_config(..., true)`, donc limité à la transaction. Requête isolée = `BEGIN; set_config; requête; COMMIT`. Transaction ouverte au retour au pool = `ROLLBACK`, ou destruction de la connexion en cas d'échec. Erreurs de connexion absorbées.
- Politiques : 99 tables (76 directes sur `organizationId`, 23 enfants via `EXISTS` sur le parent), `USING` et `WITH CHECK` identiques, refus par défaut. Rôle `rappel_app` : sans superuser, sans `BYPASSRLS`, sans création de table ni de rôle, sans `TRUNCATE`.
- 8 pages serveur en `scopedPage("public")`, 3 tâches de fond en `runAsJob`, 3 routes cron en `jobRoute` protégées par `CRON_SECRET` (comparaison à temps constant).

## 3. Fichiers

**Examinés** : `src/lib/db/{tenant-context,tenant-pool,pool,users,appointments,staff,services,resources,inventory,procurement}.ts`, `src/lib/http/route-scope.ts`, `src/lib/auth/{api-guard,session,crypto,types}.ts`, `src/lib/{rbac,cron/auth}.ts`, `src/lib/admin/api-helpers.ts`, `src/middleware.ts`, les 219 routes (classification automatique), la migration `20261110090000_tenant_row_level_security`, `scripts/ops/rls-{restore-grants,remove}.ts`, `.github/workflows/restore-test.yml`, `docs/rls-activation.md`, `tests/security/tenant-isolation{,.pg}.test.ts`.

**Modifiés** (tous non commités) :

| Fichier | Changement |
|---|---|
| `src/lib/db/appointments.ts` | `assertAppointmentReferences` : vérifie cliente, service, employée, ressource avant création et modification d'un rendez-vous |
| `src/app/api/appointments/route.ts`, `[id]/route.ts` | Erreur `REFERENCE_NOT_FOUND` renvoyée en 400 |
| `src/lib/auth/api-guard.ts` | `requirePlatformSession` devient asynchrone et relit l'administrateur en base (rôle pris en base) ; `requireAppSession` refuse un institut non `ACTIVE` (403) |
| `src/lib/db/users.ts` | `getUserSessionState` renvoie aussi le statut de l'institut |
| `src/lib/admin/api-helpers.ts` | `requireAdmin` et `requireSuperAdmin` asynchrones |
| `src/app/api/admin/**/route.ts` | `await` sur les appels de garde (60 sites) ; `POST /api/admin/plans` exige maintenant une session |
| `docs/rls-activation.md` | Deux lignes : R4 et sessions |

**Créés** : `tests/security/session-guards.test.ts` (7 tests), `docs/rls-r4/` (README, détection, migration proposée, retour arrière), ce rapport.

**Changement de comportement à valider côté produit** : un institut suspendu ou archivé perd l'accès avec ses jetons existants (403). Le login le refusait déjà ; seule la session déjà ouverte survivait.

## 4. Vulnérabilités

**Critiques** : aucune trouvée sur l'isolation RLS.

**Élevées**

1. **Références inter-instituts (R4), côté code. Corrigé.** Avec RLS active et le rôle `rappel_app`, `Appointment.customerId`, `staffId`, `ServiceStaff`, `ServiceResource` et `InventoryMovement.productId` acceptaient l'identifiant d'un autre institut (PostgreSQL contrôle les clés étrangères sans appliquer RLS). Par l'API, un rendez-vous de A vers une cliente, une employée ou un service de B était accepté avant correction. Après correction : 400 dans les trois cas. Les tables de jonction filtraient déjà par institut dans le code.
2. **Sessions non relues. Corrigé.** `requirePlatformSession` ne lisait que le jeton (valable 30 jours) : un administrateur désactivé gardait l'accès. `requireAppSession` ne contrôlait pas l'état de l'institut. Après correction, mesuré : institut suspendu 403, utilisateur désactivé 401, administrateur désactivé 401. Le comportement avant correction est déduit du code, il n'a pas été rejoué.
3. **R4 en base, non appliqué. Ouvert.** Voir section 8.

**Moyennes**

4. **Tables sans RLS accessibles au rôle applicatif** : `Organization`, `PlatformUser` (avec `passwordHash`), `PlatformConfig`, `Plan`, `AdsAgentConfig`, `AdsAgentDecision`, `AdsCampaignSnapshot`, `AppleWalletDevice`, `PlatformAuditLog`, catalogues. Depuis un contexte institut A, `UPDATE "Organization"` sur B a réussi (annulé). Un bug applicatif ou une injection exposerait ces tables. Piste : droits par colonne, ou politique sur `Organization` (`id = app_current_org() OR bypass`), et séparer les tables plateforme du rôle institut.
5. **Contournement par injection SQL** (connu, documenté) : le rôle peut positionner `app.rls_bypass = on` lui-même. Confirmé : 40 lignes visibles. 46 sites construisent du SQL avec des fragments interpolés (`sets.join`, `where`, constantes `SELECT`). Je les ai listés, **je n'ai pas relu chacun** pour confirmer que les noms de colonnes viennent d'une liste fixe. À faire avant activation large.
6. **Routes publiques et administratives** : aucun contournement trouvé. Les 494 appels sans session ou avec jeton falsifié sont refusés ; session plateforme sur route institut et session institut sur back-office : 100 % refusés. Réserve : les routes publiques ne sont pas filtrées par RLS (`bypass`), elles dépendent de leur code.

**Basses**

7. `POST /api/admin/plans` répondait 501 sans authentification (stub). Corrigé.
8. `POST /api/appointments` sans `price` renvoie 500 au lieu de 400 (existant, hors RLS).
9. Deux routes renvoient 200 avec une liste vide pour un identifiant de B (`campaigns/:id/recipients`, `customers/:id/loyalty`) : aucune donnée de B, mais 404 serait plus net.
10. Même e-mail dans deux instituts : le login renvoie 401 dans les deux modes (observé avec mon jeu de test, cause non analysée dans le code). À vérifier sur les données réelles.

## 5. Résultats

| Contrôle | Résultat |
|---|---|
| TypeScript | **PASS** (avant et après corrections) |
| ESLint | **PASS** |
| Suite complète | **PASS** : 645 tests avant corrections (642 réussis, 3 ignorés), 652 après (649 réussis, 3 ignorés, 0 échec). Les 3 ignorés : 2 tests `ops` backup/restore, 1 test d'inscription par téléphone |
| Intégration PostgreSQL (18 tests) | **PASS** : contexte, réutilisation de connexion, transaction ouverte annulée, 3 coupures de connexion (emprunt, inactive, requête en cours), 400 requêtes concurrentes |
| Build production | **PASS** (avant et après corrections) |
| Lecture A→B, 99 tables | **PASS** |
| UPDATE, DELETE, INSERT A→B, déplacement de ligne A→B | **PASS** (0 ligne, 42501) |
| Sans contexte, institut inexistant, injection dans l'identifiant, espaces | **PASS** (0 ligne sur 99 tables) |
| Rôle ne peut ni changer de rôle, ni désactiver RLS, ni créer, ni lire un fichier | **PASS** (13 commandes refusées) |
| 600 requêtes HTTP concurrentes A/B | **PASS** (0 fuite, 0 erreur), avec et sans RLS |
| Jeton falsifié (institut B, utilisateur de A) | **PASS** : 401. Institut inexistant : 403 |
| 494 appels sans session ou jeton invalide | **PASS** (2 écarts : mon outil sur HEAD, et le stub plans, corrigé) |
| Lectures et écritures A→B via l'API (60 requêtes sur les routes dynamiques `[id]` de l'espace institut, corps hostile) | **PASS** : 0 fuite, 0 modification de B (empreinte de 99 tables inchangée), 0 erreur 5xx |
| Injection de `organizationId` dans le corps | **PASS** : ignoré, ligne créée dans l'institut du jeton |
| Parcours métier (58 étapes : connexion, clientes, rendez-vous, employées, services, ressources, produits, stock, fournisseurs, achats, caisse, paiements, dépenses, fidélité, promotions, réservation publique, notifications, IA, back-office) | **PASS** 58/58 sans RLS et 58/58 avec RLS, résultats identiques |
| Pages : 121 fichiers `page.tsx` | **PASS** : 105 visités (98 en 200, 7 redirections), 0 erreur ; **NON TESTÉ** : 16 pages dynamiques |
| GET par rôle (OWNER, MANAGER, STAFF, CASHIER, ACCOUNTANT), 97 routes | Observé, 0 erreur 5xx, 0 fuite. **NON TESTÉ** : comparaison exhaustive à la matrice `FEATURE_ACCESS` et écritures par rôle |
| Cron : sans secret 404, avec secret en simulation 200 | **PASS** (3 routes) |
| Suspension d'institut, utilisateur désactivé, administrateur désactivé | **PASS** après correction |
| `rls-remove.ts` (refus sans `CONFIRM`, 99 politiques retirées, données intactes, migration rejouable) | **PASS** |
| Sauvegarde sans droits → restauration → `rls-restore-grants` (échec attendu, puis `RLS_OK`, puis idempotent) | **PASS** |
| Migration R4 proposée : détection, application, refus d'une référence croisée, retour arrière | **PASS** sur copie jetable |
| Google Calendar (statut), géolocalisation, assistant IA avec fournisseurs réels, e-mail, WhatsApp | **NON TESTÉ** (aucune clé réelle, aucun appel externe) ; l'assistant IA sans clé répond 200 |
| Workflow GitHub `restore-test.yml` | **NON TESTÉ** (séquence rejouée à la main) |
| Tests Playwright (`e2e`) | **NON TESTÉ** |
| PostgreSQL 18.1, version Railway, copie de données réelles | **NON TESTÉ** (17.11 local, données de démonstration) |
| « 56 connexions coupées » | **Non reproduit tel quel** ; les 3 scénarios de coupure sont couverts et passent |

Précision sur les chiffres historiques : « 642 tests, 3 ignorés » est confirmé. « 149 routes GET et 102 pages » n'est pas reproduit à l'identique (mes comptes : 97 GET institut, 121 pages dont 105 visitées) ; la méthode diffère.

## 6. Performances

Même serveur, même base, mêmes données ; seule la connexion change (propriétaire sans RLS contre `rappel_app` avec `RLS_ENFORCE` listant les deux instituts). 300 requêtes par route, 10 en parallèle, boucle locale, pool de 5, Windows. Valeurs en ms, sans RLS → avec RLS.

| Route | p50 | p95 | p99 | Débit (req/s) | SQL par requête |
|---|---|---|---|---|---|
| `/api/auth/session` | 53 → 59 | 69 → 67 | 79 → 81 | 187 → 170 | 2,1 → 8,1 |
| `/api/customers` | 70 → 92 | 101 → 110 | 146 → 125 | 136 → 107 | 6,1 → 24,1 |
| `/api/appointments` | 81 → 146 | 130 → 206 | 170 → 270 | 116 → 65 | 12,1 → 48,2 |
| `/api/analytics/overview` | 57 → 106 | 69 → 138 | 75 → 161 | 173 → 92 | 8,1 → 32,1 |
| `/api/invoices` | 109 → 244 | 193 → 393 | 474 → 730 | 79 → 37 | 27,1 → 108,3 |
| `/api/staff` | 68 → 102 | 91 → 266 | 108 → 1510 | 143 → 63 | 7,1 → 28,2 |

Charge mixte (20 clients, 20 s) : 142 → 97 req/s, p50 112 → 162, p95 304 → 450, p99 417 → 555, 0 erreur. Mémoire du processus : 174 → 199 Mo sans RLS, 174 → 198 Mo avec RLS (pas de différence). Pic de connexions observé : 55 dans les deux modes.

Lecture :

- Le nombre d'instructions SQL est exactement ×4 sur toutes les routes. Le temps d'exécution côté base progresse peu (par exemple `/api/customers` 1,37 → 1,56 ms par requête) : **le coût vient des allers-retours, pas des politiques.** Je n'ai pas lancé `EXPLAIN` sur les politiques.
- La boucle locale minimise le coût d'un aller-retour. Sur le réseau privé Railway, chaque aller-retour coûte davantage : le surcoût réel sera plus élevé. Une mesure sur un environnement équivalent à Railway est nécessaire.
- Le p99 de `/api/staff` (1510 ms) est une valeur isolée, à confirmer par une seconde mesure.
- Le pic de 55 connexions pour une seule instance vient des 42 pools du code (existant, identique avec et sans RLS). À surveiller contre `max_connections` sur Railway.
- Avec `rappel_app` et `RLS_ENFORCE` vide, la décision est `bypass` : chaque requête est quand même enveloppée. D'après le code et le test unitaire, le surcoût s'applique donc **dès l'étape 2 de la procédure, à tous les instituts**. Cas non mesuré séparément.

**Optimisations sans affaiblir l'isolation** (non implémentées, la couche est critique et ses tests unitaires figent la séquence d'appels) :

1. Envoyer `BEGIN` et `set_config` dans un seul aller-retour (protocole simple, valeurs échappées par `escapeLiteral`) : 4 → 3 instructions, soit −25 % d'allers-retours, isolation inchangée (contexte toujours limité à la transaction).
2. Une transaction par requête HTTP au lieu d'une par instruction : environ N+3 instructions au lieu de 4N. Plus efficace, mais change la durée de détention des connexions : à valider avec la saturation du pool de 5.
3. Ramener les 42 pools à un seul pool dimensionné, avant d'allonger la durée de détention des connexions.
4. Mesurer avec `EXPLAIN (ANALYZE)` les routes où le temps SQL double (`/api/staff` : 2,0 → 4,0 ms, politiques `EXISTS` des tables enfants), et envelopper les appels de la politique dans `(SELECT ...)`.

## 7. Risques restants

- Coût des allers-retours non validé sur Railway.
- R4 non protégé en base (section 8).
- Tables plateforme lisibles et modifiables par le rôle institut (point 4).
- Fragments SQL interpolés non relus un par un (point 5).
- Migration non testée sur une copie de la production : 99 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` demandent un verrou exclusif bref par table, sans `lock_timeout` dans la migration. Elle s'exécute dans `releaseCommand`, donc à chaque déploiement qui la contient.
- Routes publiques non filtrées par RLS : la sécurité de la réservation publique, des webhooks et du wallet repose uniquement sur le code.
- Retour arrière niveau 3 : le prochain déploiement rejoue la migration si son dossier reste dans le dépôt.
- Tests externes (Google Calendar, géolocalisation, e-mail, WhatsApp) et Playwright non exécutés.

## 8. Plan de correction R4

Détail dans `docs/rls-r4/README.md`. En bref :

1. **Fait** : garde applicative sur les rendez-vous ; tables de jonction déjà filtrées.
2. **Écrit et testé sur copie jetable** : `proposed-migration.sql` (29 index uniques `(id, "organizationId")`, 85 clés composites en `NOT VALID` puis `VALIDATE`, anciennes clés retirées en dernier), `rollback-migration.sql`, `detect-cross-org.sql` (85 contrôles directs et 12 contrôles de tables enfants). Hors de `prisma/migrations` volontairement.
3. **Avant toute application** : détection sur une copie de la production ; correction des lignes incompatibles sans suppression (mise à `NULL` si nullable, copie de la ligne référencée dans le bon institut sinon, archivage réversible pour les tables enfants) ; essai complet et retour arrière sur la copie ; vérifier PostgreSQL ≥ 15 (`ON DELETE SET NULL (colonne)`) ; mettre à jour `schema.prisma` dans le même changement.
4. **Seconde étape** : 35 clés de tables enfants sans `organizationId` (`ServiceStaff`, `ServiceResource`, `ServiceProduct`, `ServiceCommission`, `ProductSupplier`, `PurchaseItem`, `InvoiceItem`, `PackageItem`, `CampaignRecipient`, `ReviewStaffRating`…) : ajouter la colonne et des clés composites, ou un déclencheur de contrôle.

## 9. Procédure de déploiement Railway

À exécuter par la personne qui gère Railway ; je n'ai rien touché. S'appuie sur `docs/rls-activation.md`.

1. **Avant** : sauvegarde de la base. Restaurer la sauvegarde dans une base jetable, y rejouer la migration, `ops:rls-grants`, la détection R4 et les tests. Prévoir une fenêtre creuse.
2. **Déployer le code sans activer** : `DATABASE_URL` reste sur `postgres`, `RLS_ENFORCE` vide. La migration crée politiques, fonctions et le rôle `rappel_app` (sans connexion). Aucun effet fonctionnel attendu. Vérifier : `DATABASE_URL=<url postgres> npm run ops:rls-grants -- --verify` doit afficher `RLS_OK`.
3. **Étape 2 (rôle limité, isolation vide)** : mot de passe aléatoire d'au moins 24 caractères, `ops:rls-grants` avec `RAPPEL_APP_PASSWORD`, `DIRECT_DATABASE_URL` = URL `postgres`, `DATABASE_URL` = URL `rappel_app`. **Le surcoût de performance commence ici, pour tous les instituts.** Surveiller 24 h : erreurs 42501, taux de 5xx, latence p95, connexions actives.
4. **Démo** : `RLS_ENFORCE=org_institut_royal`. Parcourir agenda, caisse, clientes, factures, rapports. Chaque journal « Accès base sans portée déclarée » doit être corrigé.
5. **Volontaires** puis **tous** : seulement après les conditions du verdict.

## 10. Procédure de rollback

| Niveau | Action | Testé |
|---|---|---|
| 1 | Vider `RLS_ENFORCE`, redéployer | Équivalent couvert par le test d'intégration « isolation vide » |
| 2 | `DATABASE_URL` de nouveau sur l'URL `postgres` | Non rejoué ici (changement de variable) |
| 3 | Niveau 2, puis `CONFIRM=yes DATABASE_URL=<url postgres> npx tsx scripts/ops/rls-remove.ts` | **Rejoué** : 99 politiques et 2 fonctions retirées, données intactes (40 clientes, 66 rendez-vous), ligne de migration retirée, migration rejouable. Le rôle est conservé s'il possède des droits dans une autre base du serveur ; sur une base unique il est supprimé |
| R4 | `rollback-migration.sql` | **Rejoué** : retour à 203 clés étrangères, identique à l'état initial |

Après toute restauration : `npm run ops:rls-grants` avec l'URL `postgres`. Sans lui, `rappel_app` n'a plus aucun droit (vérifié : « permission denied for table Customer »).

## 11. Verdict

| Périmètre | Verdict | Conditions |
|---|---|---|
| **Déploiement du code sans activation RLS** | **GO conditionnel** | Sauvegarde ; migration rejouée sur une copie de la production ; fenêtre creuse (verrous brefs sur 99 tables) ; `RLS_OK` après déploiement ; valider le changement « institut suspendu = session refusée » |
| **Activation sur l'institut démo** | **GO conditionnel** | Étape 2 comprise (surcoût pour tous) ; mesure de latence sur un environnement équivalent à Railway ; surveillance 24 h ; retour arrière niveau 1 prêt. Fortement recommandé : implémenter l'optimisation 1 avant |
| **Quelques instituts volontaires** | **NO-GO aujourd'hui** | 24 à 48 h sans « accès sans portée » sur la démo ; optimisations 1 et 3 mesurées ; relecture des 46 fragments SQL interpolés ; décision sur les tables plateforme (point 4) ; détection R4 à 0 sur la copie de production |
| **`RLS_ENFORCE=all`** | **NO-GO** | Tout ce qui précède, plus : migration R4 appliquée (y compris tables enfants), exercice de restauration réussi sur la production, tests externes et Playwright exécutés, p95 sous charge acceptable sur Railway |
