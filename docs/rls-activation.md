# Activer l'isolation par institut (Row-Level Security)

Pour qui : la personne qui gère le déploiement Railway.

Chaque étape se valide avant de passer à la suivante. Tant que l'étape 2 n'est pas faite, le fonctionnement de l'application ne change pas.

## Principe

- Une route métier fixe son institut dès la lecture du jeton de session. Postgres masque alors les lignes des autres instituts et refuse d'y écrire, même si une requête oublie son filtre `organizationId`.
- Le contexte est posé dans la transaction (`set_config(..., true)`). Il disparaît avec elle, aucune connexion réutilisée ne le conserve.
- Les règles refusent tout par défaut. Le rôle `rappel_app` doit annoncer un institut, ou un accès explicitement autorisé.
- Les routes publiques, le back-office et les tâches de fond déclarent leur portée avec `publicRoute`, `platformRoute`, `jobRoute` ou `runAsJob`. Ils ne sont pas filtrés : ils restent protégés par le code de l'application.

| `RLS_ENFORCE` | Route métier | Accès sans portée déclarée |
|---|---|---|
| vide | non filtrée | autorisé |
| liste d'instituts | filtrée si l'institut est listé, refusée si aucun institut | autorisé et journalisé |
| `all` | filtrée, refusée si aucun institut | refusé |

Le filtrage exige le rôle `rappel_app` : `postgres` est superutilisateur et ignore ces règles. L'application journalise cette erreur de configuration.

## Étapes

1. **Déployer.** La migration crée les règles et le rôle `rappel_app`, qui ne peut pas encore se connecter. Vérifier ensuite, avec l'URL `postgres` :

   ```bash
   DATABASE_URL=<url postgres> npm run ops:rls-grants -- --verify
   ```

   Le script doit afficher `RLS_OK`.

2. **Passer au rôle limité, isolation vide.** Générer un mot de passe aléatoire d'au moins 24 caractères, puis :

   ```bash
   DATABASE_URL=<url postgres> RAPPEL_APP_PASSWORD=<mot de passe> npm run ops:rls-grants
   ```

   Sur Railway : `DIRECT_DATABASE_URL` reçoit l'URL `postgres` actuelle, `DATABASE_URL` reçoit l'URL avec `rappel_app`, et `RLS_ENFORCE` reste vide. Surveiller 24 h : aucune erreur 42501, pas de hausse des erreurs 500.

3. **Institut de démonstration :** `RLS_ENFORCE=org_institut_royal`. Parcourir l'agenda, la caisse, les clientes, les factures et les rapports. Surveiller aussi les journaux `Accès base sans portée déclarée` : chaque occurrence doit être corrigée avant l'étape 5.

4. **Instituts volontaires :** ajouter un ou deux identifiants à la liste, puis observer 48 h.

5. **Tous :** `RLS_ENFORCE=all`, seulement quand les journaux ne signalent plus aucun accès sans portée et qu'un exercice de restauration a réussi.

## Retour arrière

| Niveau | Action | Effet |
|---|---|---|
| 1 | Vider `RLS_ENFORCE` et redéployer | Plus aucun filtre, le rôle limité continue de fonctionner |
| 2 | Remettre l'URL `postgres` dans `DATABASE_URL` | Retour au rôle d'origine |
| 3 | Niveau 2, puis `CONFIRM=yes DATABASE_URL=<url postgres> npx tsx scripts/ops/rls-remove.ts` | Retour à l'état d'avant la migration, sans toucher aux données |

Le niveau 3 n'est nécessaire que pour retirer définitivement la fonctionnalité. Le prochain déploiement rejoue la migration, sauf si son dossier est retiré du dépôt.

## Sauvegardes et restaurations

- Les sauvegardes et les scripts `scripts/ops` utilisent l'URL `postgres`. `pg_dump` échoue avec un rôle soumis à ces règles.
- `pg_dump --no-acl` conserve les règles mais pas les droits. **Après chaque restauration**, lancer `npm run ops:rls-grants` avec l'URL `postgres`. Sur un serveur neuf, ajouter `RAPPEL_APP_PASSWORD` pour autoriser la connexion.
- Le workflow `restore-test.yml` exécute ce contrôle et les tests d'isolation sur la base restaurée.

## À savoir

- **Nouvelle route :** l'exporter avec `tenantRoute`, `publicRoute`, `platformRoute` ou `jobRoute`. Un test échoue sinon.
- **Nouvelle table avec `organizationId` :** ajouter sa politique dans la migration. Un test échoue sinon.
- **Accès volontairement inter-instituts depuis une route métier :** l'encadrer avec `runAsJob("motif", ...)`, et le faire relire.
- **Limites connues :** l'isolation ne protège pas d'une injection SQL (le rôle peut changer son propre contexte). Elle n'empêche pas non plus une ligne de référencer une ligne d'un autre institut (risque R4) : le code vérifie l'institut des références d'un rendez-vous (`assertAppointmentReferences`), et la protection de fond par contraintes composites est proposée, non appliquée, dans `docs/rls-r4/`.
- **Sessions :** une session institut est refusée (403) dès que l'institut n'est plus `ACTIVE`, et une session back-office est relue en base à chaque appel (administrateur désactivé = accès coupé, rôle pris en base).
- **Pooler externe :** en mode « transaction », le contexte reste correct puisqu'il est lié à la transaction.
