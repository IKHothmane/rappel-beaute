-- Inscription e-mail vérifiée (lot 3) : filet de sécurité de la base. Migration ADDITIVE : un seul index, sur la
-- table neuve "AuthPendingSignup" (créée par 20261118100000, vide tant que l'inscription e-mail n'est pas
-- déployée). Aucune colonne, table, politique RLS ni droit n'est modifié : les droits de rappel_public sur
-- "AuthPendingSignup" (UPDATE tokenHash, emailVerified, expiresAt, consumedAt, organizationId) et sur
-- "EmailVerificationToken" (UPDATE usedAt) suffisent au parcours.
--
-- "AuthPendingSignup_email_open_key" : au plus UNE inscription e-mail ouverte (non consommée) par adresse,
-- insensible à la casse. L'application la ferme d'abord (consumedAt) sous un verrou consultatif puis insère ; cet
-- index arbitre les courses qui échapperaient au verrou (une des deux transactions échoue en 23505 et l'application
-- rejoue une fois). Limite connue (voir 20261118100000) : l'expiration ne peut pas figurer dans un prédicat
-- d'index ; l'application ferme aussi les inscriptions expirées avant d'insérer, la purge les supprime ensuite.
--
-- Sûreté : table vide -> création instantanée ; IF NOT EXISTS (idempotente) ; lock_timeout.
-- Retour arrière : DROP INDEX IF EXISTS "AuthPendingSignup_email_open_key";  (aucune donnée perdue)

SET lock_timeout = '10s';

CREATE UNIQUE INDEX IF NOT EXISTS "AuthPendingSignup_email_open_key"
  ON "AuthPendingSignup" (LOWER("email"))
  WHERE "provider" = 'email' AND "consumedAt" IS NULL;

RESET lock_timeout;
