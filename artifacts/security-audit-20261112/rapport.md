# Audit de sécurité multi-tenant — Rappel Beauty

Date : 12 novembre 2026. Référence initiale : `e9cf3bbf86d5daf22a3f65ea6d751feee8ff09aa`, avec les modifications locales présentes au début de l'audit.

## Conclusion

**L'isolation n'est pas suffisante en l'état. Des consultations et modifications inter-instituts ont été reproduites sur une base locale.** Certaines associations inter-instituts et une mutation comptable publique restent possibles avec `rappel_app` et `RLS_ENFORCE=all`.

Les 673 tests du premier lancement réussis ne prouvent donc pas l'absence de BOLA/IDOR. **Une suite API supplémentaire, contrôlée ensuite sur une seconde base propre, échoue sur les références croisées.** La possession d'un identifiant n'est pas une autorisation ; c'est aussi le principe du contrôle par objet décrit par [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/).

Classement : **0 CRITIQUE démontré ; 6 ÉLEVÉS démontrés, dont un conditionnel à l'absence de secret Meta ; 3 MOYENS de défense/configuration ; 0 FAIBLE retenu.** Ce classement évalue le code et les reproductions locales, pas une exploitation constatée en production.

## Périmètre et méthode

- Inventaire complet de `src/app/api` : **208 fichiers de routes, 304 exports HTTP** ; chaque fichier déclare une portée tenant/public/platform/job.
- Inventaire complet de `src/lib/db` : **52 fichiers, 400 fonctions exportées déclarées**.
- Inventaire de **124 fichiers page/layout**, identification des composants clients et des imports directs des modules de données ; suivi manuel des parcours serveur sensibles.
- Extraction de **984 chaînes/fragments SQL** dans `src/lib` et `src/app`, y compris des fragments assemblés et des requêtes hors de `src/lib/db`.
- Analyse transversale : origine de l'institut, guards et wrappers, branches sans modification, relations enfants, jointures/agrégats, exports, fichiers, sessions publiques, WhatsApp, notifications, tâches, migrations et rôle PostgreSQL.
- Revue manuelle ciblée des parcours sensibles et des motifs SQL suspects, complétée par les tests existants et des reproductions adversariales A/B.

**Limite de couverture :** l'inventaire couvre tous les fichiers demandés, mais chaque combinaison méthode × rôle × format × état métier n'a pas reçu un test HTTP de bout en bout. Un inventaire ou la présence textuelle d'un guard ne constitue pas une validation de chaque flux. Ce rapport ne certifie pas une couverture comportementale exhaustive.

### Environnement de test et respect des contraintes

PostgreSQL **18.6**, cluster créé pour cet audit dans `.audit-security-db/pgdata`, écoute **127.0.0.1:55447 uniquement**, base **rappel_security_audit**. Identité vérifiée par `inet_server_addr()`, `inet_server_port()` et `current_database()` avant les reproductions.

Les **73 migrations** et le seed existant ont été exécutés uniquement sur cette base. Les URL de connexion et de migration ont été remplacées explicitement par l'URL locale. Deux instituts fictifs supplémentaires A et B, leurs utilisateurs, clientes, employés, services et ressources ont servi aux preuves.

Une seconde base **rappel_security_api_clean**, dans le même cluster local, a ensuite reçu les migrations et le seed pour exécuter séparément la suite API supplémentaire. Elle ne contenait aucune des références volontairement corrompues des premières reproductions.

Aucun déploiement, aucune migration/seed Railway, aucune modification de donnée de production et aucun correctif dans `src`, les migrations ou les tests existants n'ont été effectués pour cet audit. Les fichiers ajoutés sont les livrables dans ce dossier. Les requêtes de reproduction utilisent les vrais handlers/fonctions ; les tests des handlers les invoquent directement avec `NextRequest`, sans serveur HTTP. Le transport `fetch` est bloqué dans les processus des reproductions adversariales.

L'initialisation via `embedded-postgres` a échoué sur `os.userInfo()` dans le bac à sable Windows. Le cluster a ensuite été initialisé et démarré directement avec les binaires PostgreSQL locaux fournis par le projet. Le seed a été exécuté avec transpilation TypeScript en mémoire ; le code source n'a pas été modifié.

## Failles démontrées

### F01 — ÉLEVÉ — Associations d'employés et de ressources modifiées avant contrôle de propriété

**Fichiers :** [staff.ts:531](../../src/lib/db/staff.ts#L531), appels à 603–604 et contrôle final à 616 ; [resources.ts:93](../../src/lib/db/resources.ts#L93), appel à 363–364 et contrôle final suivant. Routes PATCH `staff/[id]` et `resources/[id]`.

**Cause :** `syncStaffServices` supprime par `staffId` seul ; `syncServices` supprime par `resourceId` seul. Le contrôle du parent arrive après ces opérations. Les insertions vérifient le service A mais pas l'employé/ressource B.

**Preuve :** session OWNER de A, PATCH du parent B avec `{"serviceIds":[]}` : réponse **404**, mais ses associations passent de **1 à 0** en base sans RLS effective. La réponse 404 masque donc une modification déjà commise.

Avec **rappel_app + RLS=all**, PATCH du parent B avec `{"serviceIds":["service_A"]}` : réponse **404**, mais **une association service A → employé B**, puis **service A → ressource B**, est réellement créée. La politique enfant repose sur le service A visible, et les FK simples autorisent l'autre extrémité B.

**Impact :** altération du planning et des disponibilités de B ; création d'un graphe métier inter-instituts, susceptible de contaminer les jointures et traitements publics.

**Correction proposée :** vérifier et verrouiller le parent avec `id AND organizationId` **avant toute opération**, faire toutes les opérations dans une transaction, vérifier chaque extrémité, filtrer les DELETE par un JOIN du parent et l'institut. Ajouter des contraintes d'intégrité composites ou un contrôle équivalent pour empêcher les relations croisées même en SQL direct. Renforcer les politiques enfants sur les deux extrémités, pas uniquement le service.

### F02 — ÉLEVÉ — PATCH vide divulguant une maintenance étrangère

**Fichiers :** [resources.ts:420](../../src/lib/db/resources.ts#L420), branche `sets.length === 0` à **456–460**, chargeur à **76** ; [route PATCH:14](../../src/app/api/resources/[id]/maintenance/[maintenanceId]/route.ts#L14).

**Preuve :** session A, `PATCH /api/resources/resource_B/maintenance/maintenance_B` avec `{}` : **200**, renvoie le motif **« B maintenance confidential »**, les dates, le type et le statut. Test réalisé sans RLS effective. La branche avec des champs modifiés comporte un filtre propriétaire, la branche vide l'évite.

**Correction proposée :** contrôler le parent avant toute branche ; faire accepter `organizationId` à `loadMaintenances` et joindre `Resource` avec cet institut. Une requête vide ne doit jamais contourner le contrôle d'accès.

### F03 — ÉLEVÉ — Références croisées acceptées et divulgation par jointures

**Fichiers :** [gift-cards.ts:265](../../src/lib/db/gift-cards.ts#L265), référence cliente à **290–291**, jointures à **214–218**, projection nom/téléphone à **33–36** ; [expenses.ts:280](../../src/lib/db/expenses.ts#L280), `supplierId` à **307**, variante update à **351–393**, jointure à **49–60** ; [loyalty.ts:1029](../../src/lib/db/loyalty.ts#L1029) ; [campaigns.ts:480](../../src/lib/db/campaigns.ts#L480), variante update à **562–600**.

**Preuves locales sans RLS effective :**

| Parcours sous l'autorité de A | Référence injectée | Résultat |
|---|---|---|
| POST `/api/gift-cards` | acheteuse et bénéficiaire B | **201**, nom **B Secret**, téléphone **0600011102** renvoyés |
| POST `/api/expenses` | fournisseur B | **201**, nom confidentiel du fournisseur B renvoyé |
| `createPackage(A, …)` | cliente et service B | nom de cliente **B Secret**, service **S B** renvoyés |
| `createCampaign(A, …)` | promotion B | nom **B confidential promotion** et code **BPRIVATEAUDIT** renvoyés |

Dans le test des dépenses, le body contenait aussi `organizationId=B` : cet identifiant a bien été ignoré, la dépense appartient à **A**. **Le retrait d'organizationId protège l'objet principal mais ne protège pas les objets liés.**

La RLS peut masquer certaines lignes des jointures avec le rôle limité ; cela ne remplace pas la validation des relations à l'écriture. Le test SQL avec la RLS a confirmé l'acceptation d'une FK inter-instituts dans une table enfant (F01). PostgreSQL précise que les [contrôles d'intégrité référentielle contournent la RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) : une FK sur un ID seul ne garantit pas l'égalité des instituts.

**Correction proposée :** vérifier les clientes/fournisseurs/services/promotions dans le même institut, dans la transaction de création ou de modification ; refuser les IDs étrangers ; compléter les jointures par l'égalité des instituts ; ajouter les contraintes composites nécessaires. Étendre la revue aux récompenses et autres références secondaires similaires. La création de promotion accepte également des références secondaires sans validation propriétaire : motif statique repéré, non reproduit comme divulgation indépendante.

### F04 — ÉLEVÉ — Page publique déclenchant des mutations comptables chez un institut

**Fichiers :** [confirmation/page.tsx:15](../../src/app/domains/app/book/[slug]/confirmation/page.tsx#L15), appel à **28** ; [appointments.ts:357](../../src/lib/db/appointments.ts#L357), appel à **362** ; traitement à **164–200**.

**Cause :** une page de confirmation publique résout le slug puis appelle un helper de lecture qui termine tous les rendez-vous échus de cet institut et déclenche facturation/fidélité. Cela se produit avant même de vérifier que le rendez-vous demandé existe.

**Preuve :** invocation de la vraie fonction de page serveur, **sans session**, slug de B et `id=unknown-id`. Un rendez-vous fictif B de la journée est passé de **CONFIRMED à COMPLETED** et **une facture a été générée**. Reproduit aussi avec **rappel_app + RLS=all**, la page étant exécutée en portée publique avec bypass explicite.

**Impact :** un visiteur peut déclencher un changement métier et comptable chez un autre institut, sans connaître un identifiant valide. La mutation concerne les rendez-vous éligibles au traitement automatique, pas les rendez-vous futurs arbitraires.

**Autre observation liée :** la page affiche les détails d'un rendez-vous à partir du slug et de son ID sans preuve cliente dédiée. Les IDs des rendez-vous créés par le back-office utilisent `apt-${Date.now()}` à **appointments.ts:278**. Le risque d'énumération n'a pas fait l'objet d'un test HTTP systématique.

**Correction proposée :** rendre les helpers GET/page strictement sans effet métier ; déplacer la clôture automatique dans une tâche autorisée ; utiliser pour la confirmation un jeton aléatoire, limité au rendez-vous et distinct de son ID interne. Vérifier ce jeton avant toute lecture privée. Conserver les contrôles de référence et téléphone déjà présents dans les parcours publics de gestion de réservation.

### F05 — ÉLEVÉ — Messages WhatsApp rattachés à la première cliente trouvée, sans institut destinataire

**Fichiers :** [webhook.ts:120](../../src/lib/whatsapp/webhook.ts#L120), recherche téléphone globale ; sélection `customers[0]` à **189–190**, écriture du message dans l'audit à **207**. Le type inclut `metadata.phone_number_id` mais ce champ n'est pas utilisé pour sélectionner l'institut.

**Preuve :** clientes A et B avec le même téléphone ; événement portant un compte/numéro destinataire indiqué comme B. Le traitement a choisi **A** et enregistré le texte destiné à B dans le contexte A. Cette preuve teste le traitement local, sans appel au service Meta ni livraison d'un message réel.

**Correction proposée :** résoudre l'institut depuis un mapping serveur validé du compte WhatsApp et de `metadata.phone_number_id`, puis rechercher la cliente avec **cet institut + téléphone**. En cas de compte inconnu ou ambigu, ne rien rattacher. Si le numéro Meta est volontairement partagé par la plateforme, définir une stratégie de routage explicite ; un téléphone cliente seul ne permet pas d'identifier l'institut destinataire.

### F06 — ÉLEVÉ conditionnel — Webhook Meta accepté sans signature quand le secret est absent

**Fichier :** [whatsapp/webhook/route.ts:41](../../src/app/api/whatsapp/webhook/route.ts#L41), vérification seulement dans `if (appSecret)` à **42**.

**Preuve :** secret désactivé uniquement dans le processus local, POST non signé, faux compte Meta et téléphone d'une cliente B : **200** et nouvelle entrée **INCOMING_MESSAGE** dans l'audit de B. Aucun compte Meta réel n'est nécessaire à cette reproduction locale.

**Condition :** exploit HTTP possible si l'environnement cible n'a pas de `WHATSAPP_APP_SECRET`. Sa présence en production n'a pas été vérifiée. Le code vérifie correctement la signature lorsqu'un secret est configuré, mais l'absence de configuration ouvre le traitement.

**Correction proposée :** refuser le traitement quand le secret manque ; rendre la signature obligatoire ; vérifier également le compte/numéro destinataire (F05). Ajouter l'idempotence des IDs de messages entrants pour éviter les duplications d'audit à la remise d'un événement.

## Défense en profondeur et configuration

### F07 — MOYEN — Activation RLS permissive et rôle propriétaire insuffisamment détecté

**Fichiers :** [tenant-context.ts:68](../../src/lib/db/tenant-context.ts#L68), décision à **88–105** ; [tenant-pool.ts:22](../../src/lib/db/tenant-pool.ts#L22), détection du rôle.

`RLS_ENFORCE` vide autorise le bypass ; le mode liste laisse les autres instituts en bypass ; un rôle superutilisateur/BYPASSRLS continue en accès direct, avec un log. La détection vérifie `rolsuper/rolbypassrls` mais pas la propriété des tables. Les tables ne sont pas en `FORCE ROW LEVEL SECURITY` dans la migration inspectée.

**État :** comportement confirmé par lecture et par les tests existants sur PostgreSQL. **La configuration hébergée effective n'est pas connue.** Il ne s'agit pas d'une nouvelle entrée HTTP permettant à un client de changer l'environnement.

**Correction proposée :** en environnement final, exiger `all`, un rôle applicatif non propriétaire et non privilégié ; vérifier au démarrage les rôles/propriétés/politiques et échouer si la configuration attendue n'est pas respectée. Réserver les modes de transition à un contexte explicitement administré.

### F08 — MOYEN — Le bypass SQL est modifiable par le rôle applicatif lui-même

**Fichiers :** migration RLS, fonction `app_rls_bypass()` à **10–12**, politiques `USING/WITH CHECK` ; [tenant-pool.ts:21](../../src/lib/db/tenant-pool.ts#L21).

**Preuve SQL locale :** `SET LOCAL ROLE rappel_app`, contexte A et `app.rls_bypass=off` : lecture B = **0 ligne**. Puis `set_config('app.rls_bypass','on',true)` : lecture B = **1 ligne**.

**Portée :** nécessite la capacité d'exécuter du SQL dans la connexion applicative. **Aucune injection SQL distante permettant cela n'a été démontrée.** Ce n'est donc pas une BOLA HTTP autonome. Le modèle actuel utilise la RLS comme garde contre les oublis de filtres, pas comme séparation forte face à du SQL applicatif hostile.

**Correction proposée :** séparer les identités/connexions tenant, public, jobs et plateforme ; retirer au rôle tenant le mécanisme de bypass général ; exposer les opérations exceptionnelles par des fonctions et droits minimaux contrôlés. Si une fonction `SECURITY DEFINER` est introduite, auditer son propriétaire, son `search_path` et les droits EXECUTE.

### F09 — MOYEN — Droits applicatifs trop larges sur les tables de plateforme

**Fichier :** [migration.sql:22](../../prisma/migrations/20261110090000_tenant_row_level_security/migration.sql#L22), droits sur toutes les tables et privilèges par défaut.

**Preuve de schéma locale :** 111 tables, 99 politiques ; `PlatformUser`, `PlatformConfig`, `PlatformAuditLog`, `Organization` et d'autres tables globales n'ont pas de RLS. La migration accorde les opérations SELECT/INSERT/UPDATE/DELETE sur l'ensemble des tables à `rappel_app`, sauf `_prisma_migrations` révoquée ensuite. Le rôle a bien `NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB` localement.

**Portée :** ce constat de privilèges n'est pas une exploitation HTTP démontrée ni une preuve des droits réels hébergés. Des tables de référence publiques peuvent légitimement rester communes ; les tables d'administration sensibles ne devraient pas recevoir le même traitement.

**Correction proposée :** séparer les rôles plateforme/tenant/public/jobs, réduire les grants aux opérations nécessaires, exclure les tables plateforme sensibles des grants génériques et auditer les `ALTER DEFAULT PRIVILEGES` pour le propriétaire qui exécute réellement les migrations.

## Protections confirmées et limites par domaine

| Domaine | Protection observée / preuve | Limite |
|---|---|---|
| Sessions API | jeton signé, `requireAppSession`, institut lié avant lecture de l'état utilisateur, statut/version de session | ne valide pas les objets liés à lui seul |
| Identifiant client | retrait d'organizationId dans les bodies métier ; suppression du filtre client dans analytics ; contexte AI issu de la session | test dépense démontre que les références secondaires restent dangereuses |
| Clientes | A ne lit pas B, recherche B vide, modification et archivage B sans effet ; 100 lectures croisées concurrentes sans fuite | ne généralise pas aux maintenances ou autres objets |
| RLS réelle | rôle limité, refus sans contexte, lecture/écriture étrangère, isolation des connexions, retour au pool, transactions et concurrence testés | F01/F04 et bypass explicites restent possibles |
| Administrateur | une session institut A obtient **403** sur la route administrateur de B ; guards plateforme relisent l'utilisateur plateforme | tous les rôles plateforme et toutes les actions n'ont pas eu un test HTTP A/B dédié |
| Export | contexte organisationnel de session, RBAC rapports, réponse `no-store` ; CSV clientes A sans nom B dans la preuve supplémentaire | PDF/XLSX générés par les tests existants, pas extraction exhaustive A/B de chaque document final |
| Factures/paiements/POS | filtres organisationnels parents et références vérifiées sur plusieurs parcours ; tests existants passés | mutation publique F04 et effets indirects de relations corrompues |
| Notifications internes | listes et marquages scindés par institut + utilisateur ; tests existants passés | les helpers acceptant des destinataires fournis par leur appelant méritent des contraintes d'intégrité supplémentaires |
| Réservation/assistant publics | slug/widget résolu serveur, refus d'identifiants d'autorité client, IDs liés à l'institut, référence + téléphone pour les opérations de gestion | confirmation publique F04 ; CORS n'est pas une authentification |
| WhatsApp | tâches et clientes généralement filtrées, HMAC lorsqu'un secret est présent | F05/F06 ; pas d'envoi réel testé |
| Cron | secret Bearer d'au moins 16 caractères, comparaison constante ; portée job explicitement large | isolation de chaque traitement interne à vérifier ; certains timers se déclenchent hors route cron |
| Fichiers | écriture des images sous clés avec institut, restrictions des catégories/chemins du serveur local | logos/images de services/ressources sont publics par conception ; aucune preuve d'isolation S3/R2 hébergée |
| Cache Redis | usages repérés : rate-limit/idempotence/monitoring, pas de cache métier générique inter-instituts identifié ; clé de réservation inclut le slug pour l'idempotence | pas de Redis local exécuté ; compteurs téléphone/IP parfois globaux volontairement ; espace de noms hébergé non inspecté |
| Pages serveur | périmètre inventorié, parcours publics sensibles suivis et page de confirmation exécutée | pas de crawl HTTP authentifié complet de toutes les pages/layouts |

Les identifiants dérivés d'un parent déjà vérifié peuvent justifier une requête enfant par ID seul. Ce n'est pas équivalent aux cas F01/F02 où l'accès se produit avant le contrôle ou dans une branche qui l'évite. Ajouter un filtre partout aide la défense, mais ne remplace pas l'analyse de l'ordre des opérations.

## Tests exécutés

**Premier lancement de la suite existante : 83 fichiers, 676 tests, 673 réussis, 0 échec, 3 ignorés.** Rapport brut : [existing-tests.json](existing-tests.json).

Les 3 ignorés : deux tests de backup/restore dans `tests/ops/backup-restore.test.ts`, et le round-trip signup téléphone dans `tests/security/phone-signup-db.test.ts`.

Les tests `tenant-isolation.pg.test.ts` ont bien été activés avec une URL RLS locale : rôle réel, refus par défaut, accès publics/plateforme/jobs, modes d'activation, 400 opérations concurrentes, même connexion réutilisée A/B, transactions et retours de connexion. Ils modifient le rôle **local** `rappel_app` pour les tests ; les attributs de rôle du relevé sont donc ceux de la base de test, pas une photographie de production.

**Contrôle supplémentaire : `tests/security/tenant-isolation.api.test.ts`, 9 tests, 8 réussis, 1 échec.** Ce fichier est apparu dans le workspace pendant l'audit ; il n'a pas été créé ni modifié par cet audit et n'était pas présent dans le premier lancement. Après un premier passage sur la base des reproductions, il a été relancé sur **rappel_security_api_clean**, fraîchement migrée et seedée. Le résultat indépendant confirme : une dépense B peut référencer un fournisseur A, une carte cadeau B peut référencer une cliente A, et les GET exposent le nom du fournisseur/de la cliente A. Rapport déterminant : [api-isolation-clean-tests.json](api-isolation-clean-tests.json). Le premier passage complémentaire est conservé dans [api-isolation-tests.json](api-isolation-tests.json), mais ses comptages de relations incluent les reproductions précédentes et ne doivent pas être pris comme une preuve indépendante.

**Bilan : les tests d'isolation complémentaires ne sont pas tous verts.** Les scénarios serviceIds vide, PATCH maintenance vide et lecture publique avec effets comptables restent à intégrer en non-régression permanente, même si une suite découvre automatiquement les routes dynamiques.

**Reproductions complémentaires :** [adversarial-evidence.json](adversarial-evidence.json). Elles incluent des lectures/recherches/refus, créations, mutations et suppressions de relations, export CSV, 100 lectures croisées concurrentes, vrai rôle RLS, webhook et fonction de page serveur publique. Certaines observations démontrent volontairement un échec de sécurité ; ce fichier n'est pas un rapport « tous les tests passent ».

## Points non vérifiés

1. `DATABASE_URL`, rôle, memberships, propriétaires, RLS_ENFORCE, politiques réellement appliquées et migration effective en production.
2. Contenu ou droits de stockage hébergé, CDN, backups, réplication et snapshots ; aucune connexion de contrôle aux services de production.
3. Livraison effective Meta, Google Calendar, Apple/Google Wallet, email et push ; les preuves adversariales bloquent le transport externe.
4. Signature et mapping Meta réellement configurés ; F06 est conditionnel à l'absence du secret.
5. Toutes les combinaisons de rôles, méthodes, états, PDF/XLSX et concurrence métier ; 673 tests ne représentent pas 673 assertions d'isolation.
6. Déploiement des correctifs : **aucun correctif n'a été appliqué ni déployé**.
7. Ajout permanent des nouveaux tests : **validation demandée et non reçue au moment de la rédaction** ; le plan de non-régression est fourni dans [tests-proposes.md](tests-proposes.md).

Deux observations supplémentaires à examiner, sans les présenter comme des exploits confirmés : le preview public réactive/crée `pub_preview` sur l'institut codé en dur `institut-royal` (`assistant-session.ts:187–221`) ; les abonnements push sont uniques par endpoint et leur UPSERT peut réassigner cet endpoint à un autre couple institut/cliente (`customer-push.ts:168–183`). Les conséquences et le comportement souhaité doivent être validés avec des tests dédiés.

## Ordre de correction proposé — sans application automatique

1. Corriger F01/F02 et ajouter des tests qui vérifient **l'état de B après une réponse 404**, pas uniquement le statut HTTP.
2. Corriger les références secondaires F03 sur créations et mises à jour ; renforcer l'intégrité SQL et les jointures.
3. Supprimer les effets métier des lectures publiques F04 et protéger les confirmations privées par capacité.
4. Rendre le webhook fermé sans secret et résoudre l'institut destinataire avant tout rattachement (F05/F06).
5. Durcir le modèle des rôles/portées/grants RLS ; vérifier la configuration effective via une procédure distincte, autorisée et sans mutation de production.
6. Rejouer les tests A/B des failles corrigées, les 673 tests existants et les scénarios complémentaires sur une base locale propre ; autoriser la mise en production dans une étape séparée.

**Décision recommandée : ne pas considérer l'objectif d'isolation comme atteint tant que les failles démontrées ne sont pas corrigées et retestées.**

## Livrables techniques

- [inventory.json](inventory.json) : inventaire par route/méthode/guard/portée, pages et fonctions DB, fragments SQL avec fichier et ligne.
- [routes.csv](routes.csv) et [modules-db.md](modules-db.md) : vues lisibles de l'inventaire.
- [local-schema.json](local-schema.json) : identité locale, rôles, tables, FK et politiques réellement introspectés après migrations.
- [existing-tests.json](existing-tests.json) : résultat Vitest brut.
- [api-isolation-clean-tests.json](api-isolation-clean-tests.json) : échec indépendant de la suite API supplémentaire sur une seconde base locale propre.
- [adversarial-evidence.json](adversarial-evidence.json) : résultats observés sur les fixtures fictives A/B.
- [tests-proposes.md](tests-proposes.md) : ajouts de non-régression proposés, non appliqués.
