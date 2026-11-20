-- Refonte de l'authentification, lot 1 (base de données) : connexion Google (OIDC) et inscription
-- e-mail / mot de passe vérifiée. Migration ADDITIVE (phase "expand") : aucune colonne ni table
-- existante n'est supprimée ou réécrite, "User"."loginPhone" n'est pas touché, et AUCUN index unique
-- global sur LOWER("User".email) n'est créé (il exigera un dédoublonnage préalable de la production).
--
-- Contenu :
--  1. "User"."emailVerifiedAt" TIMESTAMPTZ NULL (aucune valeur rétroactive : NULL = e-mail non vérifié).
--  2. "UserIdentity" : identité externe (provider 'google') d'un compte. UNIQUE (provider, providerSubject)
--     = une identité Google ne désigne qu'un seul User donc qu'un seul institut ; UNIQUE (userId, provider).
--     Enfant de "User" : RLS par EXISTS sur le parent (modèle de "ActivationToken").
--     rappel_public n'a AUCUN accès direct en lecture/modification : le callback de connexion passe par
--     app_public_identity_login(provider, subject) et app_public_identity_touch(provider, subject)
--     (SECURITY DEFINER, search_path figé, une seule identité par appel, jamais de liste). Il n'a AUCUN droit
--     direct sur la table, pas même INSERT : l'identité d'une inscription Google est créée par
--     app_public_identity_create_for_signup(id, pendingId, userId, organizationId), qui exige un pending Google
--     ouvert et un propriétaire OWNER sans mot de passe, créé à l'instant, seul de son institut, dont l'e-mail
--     est celui du pending ; sujet et e-mail viennent du pending, jamais de l'appelant. La liaison d'un
--     compte connecté passe par rappel_app (RLS de l'institut de la session, INSERT limité à des colonnes).
--  3. "AuthOAuthState" : état d'un aller-retour OAuth (state et nonce hachés, verrou PKCE chiffré par
--     l'application). Table d'authentification hors institut : rappel_public et rappel_platform seulement.
--     Consommation atomique : UPDATE ... SET "consumedAt" = NOW() WHERE "stateHash" = $1
--     AND "consumedAt" IS NULL AND "expiresAt" > NOW() RETURNING ...
--  4. "AuthPendingSignup" : inscription en attente (Google ou e-mail). Aucun User n'est créé par cette table ;
--     "organizationId" (SET NULL) mémorise l'institut créé pour rendre la finalisation idempotente.
--     "passwordHash" ne contient jamais de mot de passe en clair.
--  5. "EmailVerificationToken" : jeton haché de vérification d'e-mail, pour un User existant (changement
--     d'e-mail) OU une inscription en attente (exactement l'un des deux).
--  6. app_purge_expired_auth_state(retention) : purge DOCUMENTÉE, NON PLANIFIÉE, des états expirés.
--
-- Sûreté du déploiement :
--  * ADD COLUMN nullable sans défaut : instantané, verrou ACCESS EXCLUSIVE bref sur "User" ; lock_timeout
--    fait échouer la migration plutôt que de bloquer le trafic.
--  * Quatre nouvelles tables vides, aucune clé étrangère entrante : aucun effet sur le code existant.
--    Ordre de déploiement : migration d'abord, code ensuite. L'ancien code ignore colonne et tables.
--  * Idempotente : IF NOT EXISTS, DROP POLICY IF EXISTS avant CREATE, CREATE OR REPLACE FUNCTION,
--    REVOKE / GRANT répétables.
--  * Limite connue : l'index unique partiel de "AuthPendingSignup" ne peut pas tester l'expiration (NOW()
--    n'est pas IMMUTABLE). Une inscription Google expirée mais non consommée bloque donc une nouvelle ligne
--    pour la même identité tant qu'elle n'est pas purgée : l'application doit la rafraîchir par
--    INSERT ... ON CONFLICT (provider, "providerSubject") WHERE "consumedAt" IS NULL AND "providerSubject" IS NOT NULL
--    DO UPDATE, ou appeler la purge.
--
-- Contrôles après migration :
--   SELECT count(*) FROM "User" WHERE "emailVerifiedAt" IS NOT NULL;                         -- 0
--   SELECT count(*) FROM "UserIdentity", "AuthOAuthState", "AuthPendingSignup", "EmailVerificationToken";
--
-- Retour arrière (retirer d'abord le code d'authentification Google / e-mail vérifié) :
--   -- Les tables sont neuves : les supprimer ne perd que des identités liées, des états transitoires et des
--   -- inscriptions en attente (les utilisateurs retombent sur leur mot de passe actuel). Si les identités
--   -- Google liées doivent être conservées pour un redéploiement ultérieur :
--   --   CREATE TABLE "UserIdentity_backup" AS SELECT * FROM "UserIdentity";
--   DROP FUNCTION IF EXISTS app_purge_expired_auth_state(interval);
--   DROP FUNCTION IF EXISTS app_public_identity_create_for_signup(text, text, text, text);
--   DROP FUNCTION IF EXISTS app_public_identity_touch(text, text);
--   DROP FUNCTION IF EXISTS app_public_identity_login(text, text);
--   DROP TABLE IF EXISTS "EmailVerificationToken";
--   DROP TABLE IF EXISTS "AuthPendingSignup";
--   DROP TABLE IF EXISTS "AuthOAuthState";
--   DROP TABLE IF EXISTS "UserIdentity";
--   ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerifiedAt";   -- perd la date de vérification des e-mails
-- Restauration : une sauvegarde antérieure à cette migration n'a ni colonne ni tables : la restaurer avec le
-- nouveau code échoue (colonne absente). Rejouer `prisma migrate deploy` après restauration, ou déployer
-- l'ancien code. Une sauvegarde postérieure restaure colonne, identités et inscriptions en attente ; les états
-- OAuth restaurés sont de toute façon expirés (quelques minutes).

SET lock_timeout = '10s';

-- 1. Date de vérification de l'e-mail (aucune valeur rétroactive)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMPTZ;

-- 2. Identités externes d'un compte
CREATE TABLE IF NOT EXISTS "UserIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSubject" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMPTZ,
  CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserIdentity_provider_check" CHECK ("provider" IN ('google')),
  CONSTRAINT "UserIdentity_providerSubject_check" CHECK (char_length("providerSubject") BETWEEN 1 AND 255),
  CONSTRAINT "UserIdentity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserIdentity_provider_providerSubject_key"
  ON "UserIdentity" ("provider", "providerSubject");
CREATE UNIQUE INDEX IF NOT EXISTS "UserIdentity_userId_provider_key"
  ON "UserIdentity" ("userId", "provider");

-- 3. États OAuth (aller-retour Google)
CREATE TABLE IF NOT EXISTS "AuthOAuthState" (
  "id" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "nonceHash" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "userId" TEXT,
  "codeVerifierEnc" TEXT NOT NULL,
  "redirectAfter" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  CONSTRAINT "AuthOAuthState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthOAuthState_intent_check" CHECK ("intent" IN ('login', 'signup', 'link')),
  CONSTRAINT "AuthOAuthState_link_requires_user_check" CHECK ("intent" <> 'link' OR "userId" IS NOT NULL),
  CONSTRAINT "AuthOAuthState_codeVerifierEnc_check" CHECK (char_length("codeVerifierEnc") BETWEEN 1 AND 2048),
  -- Chemin relatif interne uniquement : pas de "//", pas d'antislash, borné (évite la redirection ouverte).
  CONSTRAINT "AuthOAuthState_redirectAfter_check" CHECK (
    "redirectAfter" IS NULL
    OR (char_length("redirectAfter") <= 512
        AND "redirectAfter" LIKE '/%'
        AND "redirectAfter" NOT LIKE '//%'
        AND position(E'\\' IN "redirectAfter") = 0)
  ),
  CONSTRAINT "AuthOAuthState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthOAuthState_stateHash_key" ON "AuthOAuthState" ("stateHash");
CREATE INDEX IF NOT EXISTS "AuthOAuthState_expiresAt_idx" ON "AuthOAuthState" ("expiresAt");
CREATE INDEX IF NOT EXISTS "AuthOAuthState_userId_idx" ON "AuthOAuthState" ("userId") WHERE "userId" IS NOT NULL;

-- 4. Inscriptions en attente (aucun User créé ici)
CREATE TABLE IF NOT EXISTS "AuthPendingSignup" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSubject" TEXT,
  "email" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "organizationId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthPendingSignup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthPendingSignup_provider_check" CHECK ("provider" IN ('google', 'email')),
  CONSTRAINT "AuthPendingSignup_provider_shape_check" CHECK (
    ("provider" = 'google' AND "providerSubject" IS NOT NULL AND "passwordHash" IS NULL)
    OR ("provider" = 'email' AND "providerSubject" IS NULL)
  ),
  CONSTRAINT "AuthPendingSignup_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthPendingSignup_tokenHash_key" ON "AuthPendingSignup" ("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "AuthPendingSignup_provider_providerSubject_open_key"
  ON "AuthPendingSignup" ("provider", "providerSubject")
  WHERE "consumedAt" IS NULL AND "providerSubject" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "AuthPendingSignup_email_lower_idx" ON "AuthPendingSignup" (LOWER("email"));
CREATE INDEX IF NOT EXISTS "AuthPendingSignup_expiresAt_idx" ON "AuthPendingSignup" ("expiresAt");
CREATE INDEX IF NOT EXISTS "AuthPendingSignup_organizationId_idx"
  ON "AuthPendingSignup" ("organizationId") WHERE "organizationId" IS NOT NULL;

-- 5. Jetons de vérification d'e-mail
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "pendingSignupId" TEXT,
  "newEmail" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailVerificationToken_target_check" CHECK (num_nonnulls("userId", "pendingSignupId") = 1),
  CONSTRAINT "EmailVerificationToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailVerificationToken_pendingSignupId_fkey"
    FOREIGN KEY ("pendingSignupId") REFERENCES "AuthPendingSignup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken" ("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken" ("userId") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_pendingSignupId_idx"
  ON "EmailVerificationToken" ("pendingSignupId") WHERE "pendingSignupId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken" ("expiresAt");

-- 6. RLS, politiques et droits par rôle
ALTER TABLE "UserIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthOAuthState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthPendingSignup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationToken" ENABLE ROW LEVEL SECURITY;

-- Enfant de "User" : visible si le compte parent l'est (la RLS de "User" s'applique dans la sous-requête).
DROP POLICY IF EXISTS tenant_isolation ON "UserIdentity";
CREATE POLICY tenant_isolation ON "UserIdentity"
  USING (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "User" parent WHERE parent.id = "UserIdentity"."userId"))
  WITH CHECK (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "User" parent WHERE parent.id = "UserIdentity"."userId"));

-- Tables d'authentification sans institut : rôles public et plateforme seulement.
DROP POLICY IF EXISTS auth_scope ON "AuthOAuthState";
CREATE POLICY auth_scope ON "AuthOAuthState"
  USING (current_user IN ('rappel_platform', 'rappel_public'))
  WITH CHECK (current_user IN ('rappel_platform', 'rappel_public'));

DROP POLICY IF EXISTS auth_scope ON "AuthPendingSignup";
CREATE POLICY auth_scope ON "AuthPendingSignup"
  USING (current_user IN ('rappel_platform', 'rappel_public'))
  WITH CHECK (current_user IN ('rappel_platform', 'rappel_public'));

-- Jeton lié à un compte : visible par son institut ; jeton d'inscription en attente : public / plateforme.
DROP POLICY IF EXISTS tenant_isolation ON "EmailVerificationToken";
CREATE POLICY tenant_isolation ON "EmailVerificationToken"
  USING (
    current_user IN ('rappel_platform', 'rappel_public')
    OR ("userId" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" parent WHERE parent.id = "EmailVerificationToken"."userId"))
  )
  WITH CHECK (
    current_user IN ('rappel_platform', 'rappel_public')
    OR ("userId" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" parent WHERE parent.id = "EmailVerificationToken"."userId"))
  );

REVOKE ALL ON TABLE "UserIdentity", "AuthOAuthState", "AuthPendingSignup", "EmailVerificationToken"
  FROM PUBLIC, rappel_app, rappel_platform, rappel_public, rappel_job;

-- "UserIdentity" : rappel_public n'a AUCUN droit (recherche, mise à jour et création d'inscription par fonctions
-- SECURITY DEFINER) ; rappel_app (liaison / déliaison, RLS de l'institut) n'insère que des colonnes précises.
GRANT SELECT, DELETE, INSERT ("id", "userId", "provider", "providerSubject", "email", "emailVerified", "lastLoginAt"),
  UPDATE ("email", "emailVerified", "lastLoginAt") ON "UserIdentity" TO rappel_app;
GRANT SELECT, DELETE ON "UserIdentity" TO rappel_platform;

-- "AuthOAuthState" : création puis consommation atomique ; jamais de suppression hors purge.
GRANT SELECT, INSERT ("id", "stateHash", "nonceHash", "intent", "userId", "codeVerifierEnc", "redirectAfter", "expiresAt"),
  UPDATE ("consumedAt") ON "AuthOAuthState" TO rappel_public;
GRANT SELECT ON "AuthOAuthState" TO rappel_platform;

-- "AuthPendingSignup" : e-mail, fournisseur, sujet et mot de passe haché ne changent plus après création.
GRANT SELECT, INSERT ("id", "tokenHash", "provider", "providerSubject", "email", "emailVerified", "name", "passwordHash", "expiresAt"),
  UPDATE ("tokenHash", "emailVerified", "name", "expiresAt", "consumedAt", "organizationId") ON "AuthPendingSignup" TO rappel_public;
GRANT SELECT ON "AuthPendingSignup" TO rappel_platform;

-- "EmailVerificationToken" : le compte connecté (changement d'e-mail) et la route publique (lien du courriel).
GRANT SELECT, INSERT ("id", "userId", "pendingSignupId", "newEmail", "tokenHash", "expiresAt"), UPDATE ("usedAt")
  ON "EmailVerificationToken" TO rappel_app;
GRANT SELECT, INSERT ("id", "userId", "pendingSignupId", "newEmail", "tokenHash", "expiresAt"), UPDATE ("usedAt")
  ON "EmailVerificationToken" TO rappel_public;
GRANT SELECT ON "EmailVerificationToken" TO rappel_platform;

-- 7. Callback de connexion : une identité exacte, sans accès inter-organisations large
CREATE OR REPLACE FUNCTION app_public_identity_login(p_provider text, p_subject text)
RETURNS TABLE ("userId" text, "organizationId" text, "userStatus" text, "organizationStatus" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT u.id, u."organizationId", u.status::text, o.status::text
  FROM public."UserIdentity" i
  JOIN public."User" u ON u.id = i."userId"
  JOIN public."Organization" o ON o.id = u."organizationId"
  WHERE i.provider = p_provider AND i."providerSubject" = p_subject
$$;
REVOKE ALL ON FUNCTION app_public_identity_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_identity_login(text, text) TO rappel_public;

CREATE OR REPLACE FUNCTION app_public_identity_touch(p_provider text, p_subject text)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH touched AS (
    UPDATE public."UserIdentity"
    SET "lastLoginAt" = pg_catalog.now()
    WHERE provider = p_provider AND "providerSubject" = p_subject
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM touched)
$$;
REVOKE ALL ON FUNCTION app_public_identity_touch(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_identity_touch(text, text) TO rappel_public;

-- Création de l'identité d'une inscription Google (seul point d'écriture de rappel_public sur UserIdentity).
-- Sujet et e-mail sont lus dans le pending Google OUVERT (non consommé, sans institut, non expiré) : l'appelant
-- ne peut pas choisir une identité. Le User doit être l'OWNER créé à l'instant (moins de 10 minutes), sans mot
-- de passe, e-mail vérifié identique à celui du pending, et le seul utilisateur de son institut. Appelée dans la
-- transaction de finalisation, avant que le pending soit marqué consommé. Les violations d'unicité de
-- UserIdentity remontent telles quelles (23505).
CREATE OR REPLACE FUNCTION app_public_identity_create_for_signup(
  p_id text, p_pending_id text, p_user_id text, p_organization_id text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_subject text;
  v_email text;
BEGIN
  SELECT s."providerSubject", s.email INTO v_subject, v_email
  FROM public."AuthPendingSignup" s
  WHERE s.id = p_pending_id
    AND s.provider = 'google'
    AND s."providerSubject" IS NOT NULL
    AND s."consumedAt" IS NULL
    AND s."organizationId" IS NULL
    AND s."expiresAt" > pg_catalog.now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'identity signup refused' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM public."User" u
       WHERE u.id = p_user_id
         AND u."organizationId" = p_organization_id
         AND u.role::text = 'OWNER'
         AND u."passwordHash" IS NULL
         AND u."emailVerifiedAt" IS NOT NULL
         AND pg_catalog.lower(u.email) = pg_catalog.lower(v_email)
         AND u."createdAt" > pg_catalog.now() - interval '10 minutes'
     )
     OR (SELECT pg_catalog.count(*) FROM public."User" o WHERE o."organizationId" = p_organization_id) <> 1 THEN
    RAISE EXCEPTION 'identity signup refused' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public."UserIdentity" (id, "userId", provider, "providerSubject", email, "emailVerified", "lastLoginAt")
  VALUES (p_id, p_user_id, 'google', v_subject, v_email, true, pg_catalog.now());
END;
$$;
REVOKE ALL ON FUNCTION app_public_identity_create_for_signup(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_identity_create_for_signup(text, text, text, text) TO rappel_public;

-- 8. Purge des états expirés (NON PLANIFIÉE : à appeler à la main ou par une tâche à créer ensuite).
--    Supprime, après `retention` (1 jour par défaut) :
--      * les états OAuth expirés ou consommés ;
--      * les inscriptions en attente expirées (les jetons de vérification liés partent en cascade) ;
--      * les jetons de vérification expirés ou utilisés.
--    Une inscription consommée dont l'institut existe garde sa trace jusqu'à expiration (idempotence).
--    Usage : SELECT * FROM app_purge_expired_auth_state();   -- ou app_purge_expired_auth_state('7 days')
CREATE OR REPLACE FUNCTION app_purge_expired_auth_state(retention interval DEFAULT interval '1 day')
RETURNS TABLE ("oauthStates" bigint, "pendingSignups" bigint, "verificationTokens" bigint)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cutoff timestamptz;
  n_state bigint;
  n_pending bigint;
  n_token bigint;
BEGIN
  IF retention IS NULL OR retention < interval '0' THEN
    RAISE EXCEPTION 'retention must be a non-negative interval' USING ERRCODE = '22023';
  END IF;
  cutoff := pg_catalog.now() - retention;

  DELETE FROM public."AuthOAuthState" WHERE "expiresAt" < cutoff OR "consumedAt" < cutoff;
  GET DIAGNOSTICS n_state = ROW_COUNT;

  DELETE FROM public."AuthPendingSignup" WHERE "expiresAt" < cutoff;
  GET DIAGNOSTICS n_pending = ROW_COUNT;

  DELETE FROM public."EmailVerificationToken" WHERE "expiresAt" < cutoff OR "usedAt" < cutoff;
  GET DIAGNOSTICS n_token = ROW_COUNT;

  RETURN QUERY SELECT n_state, n_pending, n_token;
END;
$$;
REVOKE ALL ON FUNCTION app_purge_expired_auth_state(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_purge_expired_auth_state(interval) TO rappel_job, rappel_platform;

RESET lock_timeout;
