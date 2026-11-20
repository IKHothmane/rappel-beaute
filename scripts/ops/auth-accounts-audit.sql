-- =============================================================================
-- Audit des comptes d'authentification (User / PlatformUser) -- LECTURE SEULE
-- =============================================================================
-- Préparation de la transition vers un e-mail unique global (voir
-- prisma/pending-migrations/20261120090000_user_email_global_unique/).
--
-- Garanties :
--   * transaction READ ONLY, terminée par ROLLBACK : aucune écriture possible ;
--   * aucune donnée personnelle brute : e-mails et téléphones sont masqués
--     (1er caractère + domaine ; 2 derniers chiffres) ; les groupes sont repérés
--     par une empreinte md5 tronquée (clé de rapprochement, pas un secret) ;
--   * aucun mot de passe, hash, jeton ni identifiant externe n'est sélectionné.
--
-- Exécution (voir docs/auth-accounts-audit.md), sur une COPIE restaurée ou avec un
-- rôle en lecture seule disposant de BYPASSRLS (sinon la RLS filtre les lignes) :
--   psql "$AUDIT_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/ops/auth-accounts-audit.sql
--
-- Normalisation d'e-mail utilisée partout (identique à l'index d'unicité futur) :
--   LOWER(BTRIM(email)), en ignorant NULL et chaîne vide/espaces.
-- =============================================================================

BEGIN READ ONLY;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '2s';

-- -----------------------------------------------------------------------------
-- 00. Contexte : le rôle voit-il toutes les lignes ? (sinon résultats partiels)
-- -----------------------------------------------------------------------------
SELECT '00_contexte' AS requete,
       current_setting('transaction_read_only') AS lecture_seule,
       r.rolsuper AS superuser,
       r.rolbypassrls AS bypass_rls,
       (SELECT pg_get_userbyid(c.relowner) = current_user FROM pg_class c WHERE c.oid = 'public."User"'::regclass) AS proprietaire_table_user,
       (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."User"'::regclass) AS rls_activee_sur_user,
       (SELECT COUNT(*) FROM "User") AS utilisateurs_visibles,
       (SELECT COUNT(*) FROM "Organization") AS instituts_visibles,
       (SELECT COUNT(*) FROM "PlatformUser") AS comptes_plateforme_visibles
  FROM pg_roles r WHERE r.rolname = current_user;
-- Lecture : si ni superuser, ni bypass_rls, ni proprietaire_table_user, et rls_activee_sur_user = true,
-- les comptes ci-dessous sont filtrés et l'audit n'est PAS fiable.

-- -----------------------------------------------------------------------------
-- 01. Utilisateurs par rôle et par statut
-- -----------------------------------------------------------------------------
SELECT '01_par_role_statut' AS requete, role, status, COUNT(*) AS nb
  FROM "User"
 GROUP BY role, status
 ORDER BY role, status;

-- -----------------------------------------------------------------------------
-- 02. Utilisateurs sans e-mail (NULL ou vide/espaces), par institut
-- -----------------------------------------------------------------------------
SELECT '02_sans_email_par_institut' AS requete,
       o.id AS organisation_id, o.slug, o.status AS statut_institut,
       COUNT(*) AS nb_sans_email,
       COUNT(*) FILTER (WHERE u.email IS NULL) AS nb_null,
       COUNT(*) FILTER (WHERE u.email IS NOT NULL) AS nb_vide,
       COUNT(*) FILTER (WHERE u.role = 'OWNER') AS dont_owner,
       COUNT(*) FILTER (WHERE u.status = 'ACTIVE') AS dont_actifs
  FROM "User" u
  JOIN "Organization" o ON o.id = u."organizationId"
 WHERE u.email IS NULL OR BTRIM(u.email) = ''
 GROUP BY o.id, o.slug, o.status
 ORDER BY nb_sans_email DESC, o.slug;

-- -----------------------------------------------------------------------------
-- 03a. Synthèse des doublons d'e-mail (insensible à la casse et aux espaces)
--      Cette valeur est celle que contrôle la migration d'unicité (doit valoir 0).
-- -----------------------------------------------------------------------------
WITH k AS (
  SELECT LOWER(BTRIM(email)) AS cle, "organizationId" AS org
    FROM "User"
   WHERE email IS NOT NULL AND BTRIM(email) <> ''
), g AS (
  SELECT cle, COUNT(*) AS nb, COUNT(DISTINCT org) AS nb_instituts FROM k GROUP BY cle HAVING COUNT(*) > 1
)
SELECT '03a_synthese_doublons' AS requete,
       COUNT(*) AS groupes_en_double,
       COALESCE(SUM(nb), 0) AS comptes_concernes,
       COUNT(*) FILTER (WHERE nb_instituts > 1) AS groupes_entre_instituts,
       COUNT(*) FILTER (WHERE nb_instituts = 1) AS groupes_dans_un_institut
  FROM g;

-- -----------------------------------------------------------------------------
-- 03b. Détail des groupes en double (GLOBAL), e-mail masqué
-- -----------------------------------------------------------------------------
SELECT '03b_doublons_global' AS requete,
       LEFT(md5(LOWER(BTRIM(u.email))), 10) AS empreinte,
       LEFT(LOWER(BTRIM(MIN(u.email))), 1) || '***@' || SPLIT_PART(LOWER(BTRIM(MIN(u.email))), '@', 2) AS email_masque,
       COUNT(*) AS nb_comptes,
       COUNT(DISTINCT u."organizationId") AS nb_instituts,
       STRING_AGG(DISTINCT u.role::text, ',' ORDER BY u.role::text) AS roles,
       STRING_AGG(DISTINCT u.status::text, ',' ORDER BY u.status::text) AS statuts,
       COUNT(*) FILTER (WHERE u.status = 'ACTIVE') AS nb_actifs,
       COUNT(*) FILTER (WHERE u."passwordHash" IS NOT NULL) AS nb_avec_mot_de_passe,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id)) AS nb_avec_google
  FROM "User" u
 WHERE u.email IS NOT NULL AND BTRIM(u.email) <> ''
 GROUP BY LOWER(BTRIM(u.email))
HAVING COUNT(*) > 1
 ORDER BY nb_comptes DESC, empreinte;

-- -----------------------------------------------------------------------------
-- 03c. Doublons ENTRE instituts (même e-mail dans plusieurs instituts)
-- -----------------------------------------------------------------------------
SELECT '03c_doublons_entre_instituts' AS requete,
       LEFT(md5(LOWER(BTRIM(u.email))), 10) AS empreinte,
       LEFT(LOWER(BTRIM(MIN(u.email))), 1) || '***@' || SPLIT_PART(LOWER(BTRIM(MIN(u.email))), '@', 2) AS email_masque,
       COUNT(*) AS nb_comptes,
       COUNT(DISTINCT u."organizationId") AS nb_instituts,
       STRING_AGG(DISTINCT o.slug, ',' ORDER BY o.slug) AS instituts,
       STRING_AGG(u.role::text || '/' || u.status::text, ',' ORDER BY u."organizationId", u.role::text) AS roles_statuts
  FROM "User" u
  JOIN "Organization" o ON o.id = u."organizationId"
 WHERE u.email IS NOT NULL AND BTRIM(u.email) <> ''
 GROUP BY LOWER(BTRIM(u.email))
HAVING COUNT(DISTINCT u."organizationId") > 1
 ORDER BY nb_instituts DESC, empreinte;

-- -----------------------------------------------------------------------------
-- 03d. Doublons DANS un même institut (casse/espaces différents ; la contrainte
--      (organizationId, email) actuelle ne les détecte pas)
-- -----------------------------------------------------------------------------
SELECT '03d_doublons_dans_institut' AS requete,
       o.id AS organisation_id, o.slug,
       LEFT(md5(LOWER(BTRIM(u.email))), 10) AS empreinte,
       LEFT(LOWER(BTRIM(MIN(u.email))), 1) || '***@' || SPLIT_PART(LOWER(BTRIM(MIN(u.email))), '@', 2) AS email_masque,
       COUNT(*) AS nb_comptes,
       STRING_AGG(u.role::text || '/' || u.status::text, ',' ORDER BY u.role::text, u.status::text) AS roles_statuts
  FROM "User" u
  JOIN "Organization" o ON o.id = u."organizationId"
 WHERE u.email IS NOT NULL AND BTRIM(u.email) <> ''
 GROUP BY o.id, o.slug, LOWER(BTRIM(u.email))
HAVING COUNT(*) > 1
 ORDER BY nb_comptes DESC, o.slug;

-- -----------------------------------------------------------------------------
-- 04. Utilisateurs identifiés uniquement par loginPhone (pas d'e-mail exploitable)
-- -----------------------------------------------------------------------------
SELECT '04_loginphone_seul' AS requete,
       u.role, u.status,
       COUNT(*) AS nb,
       COUNT(*) FILTER (WHERE u."passwordHash" IS NOT NULL) AS avec_mot_de_passe,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id)) AS avec_google,
       -- exemple masqué du format de numéro (jamais le numéro complet)
       '***' || RIGHT(MIN(u."loginPhone"), 2) AS exemple_telephone_masque
  FROM "User" u
 WHERE u."loginPhone" IS NOT NULL AND BTRIM(u."loginPhone") <> ''
   AND (u.email IS NULL OR BTRIM(u.email) = '')
 GROUP BY u.role, u.status
 ORDER BY u.role, u.status;

-- -----------------------------------------------------------------------------
-- 05. Doublons potentiels User <-> PlatformUser (même e-mail normalisé)
-- -----------------------------------------------------------------------------
SELECT '05_user_vs_platformuser' AS requete,
       LEFT(md5(LOWER(BTRIM(u.email))), 10) AS empreinte,
       LEFT(LOWER(BTRIM(u.email)), 1) || '***@' || SPLIT_PART(LOWER(BTRIM(u.email)), '@', 2) AS email_masque,
       u.role AS role_institut, u.status AS statut_institut_user,
       p.role AS role_plateforme, p.status AS statut_plateforme
  FROM "User" u
  JOIN "PlatformUser" p ON LOWER(BTRIM(p.email)) = LOWER(BTRIM(u.email))
 WHERE u.email IS NOT NULL AND BTRIM(u.email) <> ''
 ORDER BY empreinte;

-- -----------------------------------------------------------------------------
-- 06. Comptes avec passwordHash NULL (User puis PlatformUser)
--     Google = identité externe liée dans UserIdentity ; sinon connexion impossible.
-- -----------------------------------------------------------------------------
SELECT '06_user_sans_mot_de_passe' AS requete,
       u.role, u.status,
       COUNT(*) AS nb,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id)) AS avec_google,
       COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id)) AS sans_aucune_methode,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ActivationToken" t
                                       WHERE t."userId" = u.id AND t."usedAt" IS NULL AND t."expiresAt" > NOW())) AS avec_activation_en_cours
  FROM "User" u
 WHERE u."passwordHash" IS NULL
 GROUP BY u.role, u.status
 ORDER BY u.role, u.status;

SELECT '06b_platformuser_sans_mot_de_passe' AS requete, role, status, COUNT(*) AS nb
  FROM "PlatformUser"
 WHERE "passwordHash" IS NULL
 GROUP BY role, status
 ORDER BY role, status;

-- -----------------------------------------------------------------------------
-- 07. Comptes actifs avec mustChangePassword (mot de passe provisoire à changer)
-- -----------------------------------------------------------------------------
SELECT '07_must_change_password_actifs' AS requete,
       role, COUNT(*) AS nb,
       MIN("createdAt")::date AS plus_ancien_creation,
       COUNT(*) FILTER (WHERE "createdAt" < NOW() - INTERVAL '30 days') AS crees_depuis_plus_de_30j
  FROM "User"
 WHERE status = 'ACTIVE' AND "mustChangePassword" = TRUE
 GROUP BY role
 ORDER BY role;

-- -----------------------------------------------------------------------------
-- 08. Comptes jamais connectés / PIN provisoire encore actif (HEURISTIQUE)
--     User n'a pas de lastLoginAt : seul UserIdentity.lastLoginAt (Google) existe.
--     Heuristique : mot de passe posé, mustChangePassword = true, sessionVersion = 0
--     (sessionVersion s'incrémente à chaque reset/changement de mot de passe) et
--     aucune connexion Google => le code PIN d'inscription n'a vraisemblablement
--     jamais été remplacé. Ce n'est PAS une preuve de non-connexion.
-- -----------------------------------------------------------------------------
SELECT '08_pin_provisoire_probable' AS requete,
       u.role, u.status,
       COUNT(*) AS nb,
       COUNT(*) FILTER (WHERE u."createdAt" < NOW() - INTERVAL '7 days') AS crees_depuis_plus_de_7j,
       COUNT(*) FILTER (WHERE u."emailVerifiedAt" IS NULL) AS email_non_verifie
  FROM "User" u
 WHERE u."passwordHash" IS NOT NULL
   AND u."mustChangePassword" = TRUE
   AND u."sessionVersion" = 0
   AND NOT EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id AND i."lastLoginAt" IS NOT NULL)
 GROUP BY u.role, u.status
 ORDER BY u.role, u.status;

-- Comptes Google liés mais jamais utilisés pour se connecter
SELECT '08b_google_lie_jamais_utilise' AS requete, COUNT(*) AS nb
  FROM "UserIdentity"
 WHERE "lastLoginAt" IS NULL;

-- -----------------------------------------------------------------------------
-- 09. Utilisateurs avec e-mail non vérifié (User.emailVerifiedAt NULL)
--     Sans valeur rétroactive : les comptes existants sont tous NULL au départ.
-- -----------------------------------------------------------------------------
SELECT '09_email_non_verifie' AS requete,
       u.role, u.status,
       COUNT(*) AS nb_total_non_verifies,
       COUNT(*) FILTER (WHERE u.email IS NOT NULL AND BTRIM(u.email) <> '') AS dont_avec_email,
       COUNT(*) FILTER (WHERE u.email IS NULL OR BTRIM(u.email) = '') AS dont_sans_email
  FROM "User" u
 WHERE u."emailVerifiedAt" IS NULL
 GROUP BY u.role, u.status
 ORDER BY u.role, u.status;

-- -----------------------------------------------------------------------------
-- 10. Compte de démonstration éventuel (app@beauty.ma ; adresse publique, non masquée)
-- -----------------------------------------------------------------------------
SELECT '10_compte_demo' AS requete,
       o.slug, o.status AS statut_institut, u.role, u.status,
       (u."passwordHash" IS NOT NULL) AS a_un_mot_de_passe,
       u."mustChangePassword" AS must_change_password,
       (u."emailVerifiedAt" IS NOT NULL) AS email_verifie,
       u."createdAt"::date AS cree_le
  FROM "User" u
  JOIN "Organization" o ON o.id = u."organizationId"
 WHERE LOWER(BTRIM(u.email)) = 'app@beauty.ma'
 ORDER BY o.slug;

-- -----------------------------------------------------------------------------
-- 11. Instituts ACTIVE dont aucun OWNER n'a d'e-mail (risque d'orphelin)
--     Un OWNER « actif » = status ACTIVE. Colonnes de diagnostic sans donnée personnelle.
-- -----------------------------------------------------------------------------
SELECT '11_instituts_actifs_owner_sans_email' AS requete,
       o.id AS organisation_id, o.slug,
       COUNT(*) FILTER (WHERE u.role = 'OWNER') AS nb_owners,
       COUNT(*) FILTER (WHERE u.role = 'OWNER' AND u.status = 'ACTIVE') AS nb_owners_actifs,
       COUNT(*) FILTER (WHERE u.role = 'OWNER' AND u.email IS NOT NULL AND BTRIM(u.email) <> '') AS nb_owners_avec_email,
       COUNT(*) FILTER (WHERE u.role = 'OWNER' AND u."loginPhone" IS NOT NULL) AS nb_owners_avec_loginphone,
       COUNT(*) FILTER (WHERE u.role = 'OWNER' AND EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id)) AS nb_owners_avec_google,
       COUNT(*) FILTER (WHERE u.role IN ('MANAGER') AND u.email IS NOT NULL AND BTRIM(u.email) <> '') AS managers_avec_email
  FROM "Organization" o
  LEFT JOIN "User" u ON u."organizationId" = o.id
 WHERE o.status = 'ACTIVE'
 GROUP BY o.id, o.slug
HAVING COUNT(*) FILTER (WHERE u.role = 'OWNER' AND u.email IS NOT NULL AND BTRIM(u.email) <> '') = 0
 ORDER BY o.slug;

ROLLBACK;
