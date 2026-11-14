# Activer l'isolation par institut (Row-Level Security)

Pour qui : la personne qui gère le déploiement Railway.

Chaque étape se valide avant de passer à la suivante. Tant que l'étape 2 n'est pas faite, le fonctionnement de l'application ne change pas.

## Principe

- Une route métier fixe son institut dès la lecture du jeton de session. Postgres masque alors les lignes des autres instituts et refuse d'y écrire, même si une requête oublie son filtre `organizationId`.
- Le contexte est posé dans la transaction (`set_config(..., true)`). Il disparaît avec elle, aucune connexion réutilisée ne le conserve.
- Les règles refusent tout par défaut. Le rôle `rappel_app`, celui des routes métier, ne voit que l'institut de la session. Il ne peut pas ouvrir les autres en modifiant une variable de session, ni prendre le rôle du back-office, d'une route publique ou d'une tâche.
- Ces trois accès transversaux ont chacun un rôle PostgreSQL distinct : `rappel_platform`, `rappel_public`, `rappel_job`.

| `RLS_ENFORCE` | Effet sur l'application |
|---|---|
| vide | une route sans portée reste exécutée ; le rôle institut continue de ne voir que son institut |
| liste d'instituts | une route métier sans institut est refusée si l'institut est listé |
| `all` | toute route métier sans institut, et tout accès sans portée, sont refusés |

Le filtrage de la base s'applique dès que la connexion n'est plus `postgres`. `postgres` est superutilisateur et ignore ces règles. L'application journalise cette erreur de configuration.

## Étapes

1. **Déployer.** La migration crée les règles et le rôle `rappel_app`, qui ne peut pas encore se connecter. Vérifier ensuite, avec l'URL `postgres` :

   ```bash
   DATABASE_URL=<url postgres> npm run ops:rls-grants -- --verify
   ```

   Le script doit afficher `RLS_OK`.

2. **Préparer les quatre rôles, sans basculer le trafic.** Générer quatre mots de passe distincts, d'au moins 24 caractères, et une clé `RLS_CONTEXT_KEY` d'au moins 32 caractères. Le mot de passe de `rappel_app` doit être nouveau : un ancien vérificateur est dans l'historique public. Enregistrer la clé dans `app_private.context_key` (ligne `id = 1`) sans l'écrire dans les journaux. Puis :

   ```bash
   DATABASE_URL=<url postgres> RAPPEL_APP_PASSWORD=<mot de passe> npm run ops:rls-grants
   ```

   Les rôles restent sans connexion tant que leur mot de passe n'est pas posé. Ne pas mettre seulement `rappel_app` dans `DATABASE_URL` : les routes publiques, le back-office et les tâches ont besoin de `RAPPEL_PUBLIC_DATABASE_URL`, `RAPPEL_PLATFORM_DATABASE_URL` et `RAPPEL_JOB_DATABASE_URL`. Les trois se posent ensemble. Si une seule manque, la requête est refusée au lieu de revenir sur `DATABASE_URL`. Tant que les trois sont absentes, tout le trafic reste sur `postgres`.

3. **Pilote d'un seul institut.** Ne pas poser `RAPPEL_PLATFORM_DATABASE_URL`, `RAPPEL_PUBLIC_DATABASE_URL` ni `RAPPEL_JOB_DATABASE_URL` : ces trois variables changeraient les connexions de toute l'application. Ne pas modifier `DATABASE_URL`. Ne pas poser `RLS_ENFORCE`.

   Préparer d'abord une sauvegarde exploitable et sa restauration. L'institut pilote et un second institut de contrôle utilisent des données fictives. Le mot de passe de `rappel_app` est neuf, d'au moins 24 caractères, passé à `npm run ops:rls-grants` sans être écrit dans les journaux. La clé `RLS_CONTEXT_KEY` est la même dans l'application et dans `app_private.context_key`.

   Puis, seulement pour ce pilote :

   ```text
   RLS_PILOT=on
   RLS_PILOT_ORG=<organizationId de la session DEMO>
   RLS_PILOT_DATABASE_URL=<url rappel_app de la même base>
   ```

   `RLS_PILOT_ORG` est l'identifiant déjà présent dans le jeton de session. Un paramètre du navigateur ne le choisit pas. Les autres instituts, les routes publiques, les tâches et le back-office restent sur `postgres`.

   **Arrêt immédiat :** mettre `RLS_PILOT=off` et redéployer. Le chemin précédent revient sans restauration de la base. Au moindre refus `42501`, erreur 500 ou lenteur imprévue, couper le pilote. Les écritures de test restent sur les données fictives.

   La sonde `/api/health/db` reste sur la connexion de base. Elle indique le rôle de cette connexion et la présence de la fonction d'isolation. Le journal « pilote RLS vérifié » n'est écrit qu'après un contrôle du rôle réel : la première requête du pilote lit `current_user` et refuse la suite si ce n'est pas `rappel_app`, ou si cette connexion ignore les règles. Une URL pilote identique à la connexion de base est refusée. Ce contrôle ne remplace pas les parcours ci-dessous.

   Parcours à valider avec l'institut fictif, avant d'élargir :

   - Connexion et déconnexion.
   - Clientes limitées à cet institut.
   - Accès à l'autre institut fictif refusé.
   - Variable `app.rls_bypass` sans effet.
   - Connexion sans contexte refusé.
   - Agenda : créer et déplacer un rendez-vous fictif.
   - Clientes : créer et modifier une fiche fictive.
   - Caisse : ouvrir, encaisser et fermer une caisse fictive.
   - Stock : ajouter un produit et un mouvement fictifs.
   - Réservation en ligne : réserver et annuler, sur la connexion publique actuelle.
   - Fidélité : créer et consulter une carte de test.
   - WhatsApp : recherche d'un numéro fictif, sans envoi réel.
   - Tâche : relance sur des données fictives, sans envoi réel, toujours sur `postgres` pendant le pilote.
   - Back-office : un `SUPER_ADMIN` lit le pilote, toujours sur `postgres` pendant le pilote.
   - Les autres instituts gardent le comportement actuel.

4. **Instituts volontaires :** seulement après le pilote, ajouter un ou deux identifiants, puis observer 48 h. Ce n'est pas le pilote.

5. **Tous :** `RLS_ENFORCE=all`, seulement quand les parcours critiques, les tâches de fond et un exercice de restauration ont réussi. Ce n'est pas l'étape du pilote.

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
- **Nouvelle table sans institut :** elle n'est accordée à aucun des quatre rôles. La migration qui la crée doit ouvrir explicitement les droits nécessaires. `PlatformUser` est lisible par la connexion publique, pour la connexion et l'inscription, et modifiable seulement par le back-office. `PlatformConfig` et les brouillons du blog ne sont pas lisibles par une route publique.
- **Accès volontairement inter-instituts depuis une route métier :** l'encadrer avec `runAsJob("motif", ...)`, et le faire relire.
- **Limites connues :** une route publique sans institut annoncé ne lit aucune ligne métier. Une fois l'institut de la page annoncé, elle lit le catalogue et les clientes de cet institut, ce qui sert la réservation, et reçoit un refus sur la caisse, les factures, les achats et les notes. Une tâche lit les données nécessaires aux relances, pas la caisse. Le back-office reste transversal. L'authentification publique lit la table des comptes. Une injection ne permet pas à une route métier de prendre un autre rôle. Elle n'empêche pas non plus une ligne de référencer une ligne d'un autre institut (risque R4) : le code vérifie l'institut des références d'un rendez-vous (`assertAppointmentReferences`), et la protection de fond par contraintes composites est proposée, non appliquée, dans `docs/rls-r4/`.
- **Sessions :** une session institut est refusée (403) dès que l'institut n'est plus `ACTIVE`, et une session back-office est relue en base à chaque appel (administrateur désactivé = accès coupé, rôle pris en base).
- **Pooler externe :** en mode « transaction », le contexte reste correct puisqu'il est lié à la transaction.
