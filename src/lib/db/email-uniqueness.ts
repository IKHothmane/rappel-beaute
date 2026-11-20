import type { PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

/** Index d'unicité globale (migration en attente prisma/pending-migrations/20261120090000_user_email_global_unique). */
export const USER_EMAIL_LOWER_UNIQUE = "User_email_lower_unique";
/** Index historique par institut (Prisma @@unique([organizationId, email])). */
export const USER_ORG_EMAIL_UNIQUE = "User_organizationId_email_key";

/** Forme normalisée d'une adresse pour les comparaisons : espaces de bord retirés, minuscules. */
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

/**
 * Violation (23505) d'une unicité d'e-mail d'utilisateur. Reconnaît l'index global de la migration en attente
 * ET l'index historique par institut ; une autre contrainte (loginPhone, slug...) n'est jamais confondue avec elle.
 */
export function isUserEmailUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || !error) return false;
  const e = error as { code?: string; constraint?: string };
  return e.code === "23505" && (e.constraint === USER_EMAIL_LOWER_UNIQUE || e.constraint === USER_ORG_EMAIL_UNIQUE);
}

export type EmailOwner = "user" | "platform" | "free";

/**
 * Qui possède déjà cette adresse (insensible à la casse et aux espaces de bord, comme l'index d'unicité) ?
 * "user" : un compte institut (hors `excludeUserId`, utile au changement d'e-mail du compte lui-même) ;
 * "platform" : un administrateur de la plateforme ; "free" : personne.
 * À appeler avec une connexion qui voit tous les instituts (portée publique ou plateforme), jamais sous la RLS
 * d'un institut : elle masquerait les comptes des autres instituts.
 */
export async function emailOwner(db: Queryable, email: string, excludeUserId?: string): Promise<EmailOwner> {
  const normalized = normalizeEmail(email);
  const { rows: users } = await db.query(
    `SELECT 1 FROM "User" WHERE LOWER(BTRIM(email)) = $1 AND ($2::text IS NULL OR id <> $2) LIMIT 1`,
    [normalized, excludeUserId ?? null],
  );
  if (users.length > 0) return "user";
  const { rows: platform } = await db.query(`SELECT 1 FROM "PlatformUser" WHERE LOWER(BTRIM(email)) = $1 LIMIT 1`, [normalized]);
  return platform.length > 0 ? "platform" : "free";
}

/**
 * Verrou consultatif (durée de la transaction) qui sérialise toute opération qui RÉCLAME une adresse : inscription,
 * vérification, finalisation, changement d'adresse. Sans index d'unicité global appliqué, c'est lui qui empêche
 * deux transactions concurrentes de valider la même adresse. Toujours pris AVANT les verrous de ligne (ordre
 * constant : adresse, puis inscription / utilisateur, puis jeton).
 */
export async function lockEmailKey(db: Queryable, email: string): Promise<void> {
  await db.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`auth:email:${normalizeEmail(email)}`]);
}

/** Durée de vie d'un lien de vérification d'adresse (inscription ou changement) : 24 h, usage unique. */
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60_000;
