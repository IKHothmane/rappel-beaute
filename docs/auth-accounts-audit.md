# Audit des comptes d'authentification et unicité de l'e-mail

Objectif : préparer l'unicité globale de l'e-mail des `User` sans casser un déploiement.
Aucune étape ci-dessous n'est automatique ; rien n'est appliqué à une base réelle par le dépôt.

## 1. Exécuter l'audit (lecture seule)

Fichier : `scripts/ops/auth-accounts-audit.sql` (`BEGIN READ ONLY; ... ROLLBACK;`, aucune écriture possible).

Deux façons sûres :

- **Sur une copie** : restaurer une sauvegarde sur une base jetable (voir `scripts/ops/restore-postgres.sh` / `docs` de restauration), puis lancer l'audit sur cette copie.
- **Sur la base réelle avec un rôle en lecture seule** disposant de `BYPASSRLS` (la RLS est activée sur `User` ; sans cet attribut, ou sans être propriétaire des tables, les lignes sont filtrées et les chiffres faux). Un rôle `rappel_app` ne convient pas.

```bash
# L'URL reste dans une variable d'environnement : ne la collez jamais dans un ticket ni un rapport.
psql "$AUDIT_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/ops/auth-accounts-audit.sql > audit-comptes.txt
```

Vérifier d'abord la requête `00_contexte` : `lecture_seule = on`, et `superuser`, `bypass_rls` ou `proprietaire_table_user` à `true`.

## 2. Données personnelles

Le rapport par défaut ne contient aucun e-mail ni téléphone en clair : e-mails réduits à `x***@domaine`, téléphones à `***NN`, groupes repérés par une empreinte `md5` tronquée (clé de rapprochement entre requêtes, pas un secret : traiter le rapport comme interne). Aucun hash de mot de passe, jeton ni identifiant Google n'est sélectionné. Seule exception : `app@beauty.ma` (adresse de démonstration publique). Pour retrouver les comptes d'un groupe, relancer manuellement une requête ciblée sur la copie, pas sur le rapport.

## 3. Lire les résultats

| Requête | Lecture |
| --- | --- |
| `00_contexte` | Fiabilité de l'audit (droits, RLS, volumes visibles). |
| `01_par_role_statut` | Répartition `UserRole` x `OrgUserStatus`. |
| `02_sans_email_par_institut` | Comptes à e-mail NULL ou vide, par institut. |
| `03a_synthese_doublons` | **Bloquant** : `groupes_en_double` doit valoir 0 avant la migration. |
| `03b/03c/03d` | Détail des groupes : global, entre instituts, dans un institut (casse/espaces). Résoudre chaque groupe : un compte garde l'e-mail, les autres sont corrigés ou désactivés après décision métier. |
| `04_loginphone_seul` | Comptes connectables uniquement par WhatsApp (aucun e-mail) : hors périmètre de l'index, à ne pas forcer. |
| `05_user_vs_platformuser` | E-mail d'un `User` égal à celui d'un `PlatformUser` : confusion possible entre surfaces institut et admin. |
| `06`, `06b` | `passwordHash` NULL ; `sans_aucune_methode` = ni mot de passe ni Google (compte inutilisable). |
| `07` | Comptes actifs avec `mustChangePassword`. |
| `08` | **Heuristique** : `User` n'a pas de `lastLoginAt`. PIN provisoire probable = mot de passe posé + `mustChangePassword` + `sessionVersion = 0` + aucune connexion Google. Pas une preuve. |
| `09_email_non_verifie` | `emailVerifiedAt` NULL (aucune valeur rétroactive : attendu pour les comptes existants). |
| `10_compte_demo` | Présence d'`app@beauty.ma` ; à exclure ou isoler hors production. |
| `11_instituts_actifs_owner_sans_email` | Instituts ACTIVE sans OWNER ayant un e-mail : risque d'orphelin pour la récupération de compte ; vérifier `nb_owners_avec_loginphone` / `nb_owners_avec_google`. |

## 4. Migration d'unicité (en attente)

Fichier : `prisma/pending-migrations/20261120090000_user_email_global_unique/migration.sql`.

- Crée `CREATE UNIQUE INDEX "User_email_lower_unique" ON "User"(LOWER(BTRIM(email))) WHERE email IS NOT NULL AND BTRIM(email) <> ''`.
- Un bloc `DO $$` compte d'abord les doublons et fait `RAISE EXCEPTION` (message renvoyant vers l'audit) : transaction annulée, aucun index créé, aucune donnée modifiée, fusionnée ou supprimée.
- Elle est **hors de `prisma/migrations/`** volontairement : `railway.toml` exécute `prisma migrate deploy` en `releaseCommand`. Une migration en échec là-bas marque `_prisma_migrations` en `failed`, bloque le release et tous les déploiements suivants tant qu'on n'a pas fait `prisma migrate resolve --rolled-back <nom>`. Les doublons sont possibles en production aujourd'hui (la contrainte actuelle est `(organizationId, email)`, sensible à la casse), donc le risque est réel.
- `prisma/schema.prisma` ne porte qu'un commentaire : un index d'expression n'est pas modélisable et un `@@unique` Prisma forcerait un état.

### Procédure de mise en production

1. Exécuter l'audit (section 1), résoudre les doublons, relancer jusqu'à `groupes_en_double = 0`.
2. La gestion de l'erreur `23505` sur `User_email_lower_unique` est déjà faite dans le code (`isUserEmailUniqueViolation`, `src/lib/db/email-uniqueness.ts`) : rien à ajouter, seulement à vérifier après le déploiement de ce code.
3. Sauvegarde fraîche (`scripts/ops/backup-postgres.sh`), puis test sur une copie restaurée.
4. Déplacer le dossier : `git mv prisma/pending-migrations/20261120090000_user_email_global_unique prisma/migrations/` (l'horodatage doit être postérieur à la dernière migration déjà déployée : `20261121100000_auth_email_signup_hardening` est plus récent que `20261120090000`, donc RENOMMER le dossier avec un horodatage supérieur, par exemple `20261201090000_user_email_global_unique`).

**Ordre :** l'audit SQL des requêtes 06b et 09 lit `UserIdentity` et `User.emailVerifiedAt` : exécutez-le seulement APRÈS l'application de la migration `20261118100000_auth_identity_oauth_state` (sinon `ON_ERROR_STOP` l'interrompt).
5. Déployer ; le `releaseCommand` applique la migration. Le verrou `SHARE` sur `User` bloque brièvement les écritures pendant la création.

### Retour arrière / restauration

- `DROP INDEX IF EXISTS "User_email_lower_unique";` suffit : aucune donnée n'a été modifiée par la migration, rien à restaurer.
- Si Prisma l'a enregistrée comme appliquée, ne pas modifier le fichier : ajouter une migration de suppression d'index.
- En cas d'échec au déploiement : `prisma migrate resolve --rolled-back 20261120090000_user_email_global_unique`, corriger les doublons, relancer. La sauvegarde de l'étape 3 reste la référence si des comptes ont été modifiés manuellement par erreur.

## 5. Tests

`tests/db/user-email-global-unique.pg.test.ts` (ignoré hors base locale jetable) vérifie : échec propre avec doublons, succès sans doublon, insensibilité à la casse/espaces, tolérance des e-mails NULL/vides, absence de la migration dans `prisma/migrations`, et exécution du script d'audit (lecture seule, e-mails masqués). Tout se déroule dans des transactions annulées.
