-- Version de session des comptes plateforme : un compteur à incrémenter pour invalider les
-- sessions déjà émises (changement de mot de passe, désactivation). La lecture et l'incrément
-- sont à la charge du code qui s'en servira ensuite ; la colonne seule ne change aucun comportement.
--
-- Sûreté : ADD COLUMN avec une valeur par défaut constante est instantané (pas de réécriture de
-- table), idempotent. Les comptes existants prennent 0.
--
-- Retour arrière : ALTER TABLE "PlatformUser" DROP COLUMN IF EXISTS "sessionVersion";
-- (sans autre effet : l'ancien code ignore la colonne). Le code qui la lit doit être retiré avant.

SET lock_timeout = '10s';

ALTER TABLE "PlatformUser" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

RESET lock_timeout;
