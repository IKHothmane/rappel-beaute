import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/logger";

/**
 * Révocation de sessions et jetons à usage unique ("SessionRevocation", migration 20261120100000).
 *
 * - kind 'session' : le `jti` d'une session déconnectée ; contrôlé par requireAppSession / requirePlatformSession.
 * - kind 'oauth_state' : le `jti` d'un state OAuth consommé (flux Google Calendar) : une insertion réussie = premier usage.
 * Les anciens jetons sans `jti` ne sont jamais concernés (ils expirent naturellement).
 */

const CACHE_TTL_MS = 10_000;
const CACHE_MAX = 5_000;
const cache = new Map<string, { revoked: boolean; until: number }>();

function remember(jti: string, revoked: boolean, until: number): void {
  if (cache.size >= CACHE_MAX) {
    const now = Date.now();
    for (const [key, entry] of cache) if (entry.until <= now) cache.delete(key);
    if (cache.size >= CACHE_MAX) cache.clear();
  }
  cache.set(jti, { revoked, until });
}

/** Utilisé par les tests. */
export function clearSessionRevocationCache(): void {
  cache.clear();
}

let missingTableWarned = false;
function isUndefinedTable(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "42P01";
}

/**
 * true si la session a été déconnectée. Résultat « non révoquée » mis en cache 10 s ; « révoquée » est définitif.
 * Table absente (migration non appliquée) : tolérée, journalisée une fois — le déploiement ne verrouille personne.
 */
export async function isSessionRevoked(jti: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(jti);
  if (hit && hit.until > now) return hit.revoked;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM "SessionRevocation" WHERE jti = $1 AND kind = 'session' LIMIT 1`,
      [jti],
    );
    const revoked = Array.isArray(rows) && rows.length > 0;
    remember(jti, revoked, revoked ? Number.MAX_SAFE_INTEGER : now + CACHE_TTL_MS);
    return revoked;
  } catch (error) {
    if (isUndefinedTable(error)) {
      if (!missingTableWarned) {
        missingTableWarned = true;
        logger.warn("SessionRevocation absente : révocation de session inactive", { route: "db/session-revocation" });
      }
      return false;
    }
    throw error;
  }
}

/** Inscrit la session comme révoquée. Idempotent (un second appel ne change rien). */
export async function revokeSession(input: {
  jti: string;
  userId: string;
  organizationId: string | null;
  scope: "app" | "platform";
  expiresAt: Date;
}): Promise<void> {
  // Immédiat sur cette instance, même si l'écriture échoue ensuite.
  remember(input.jti, true, Number.MAX_SAFE_INTEGER);
  await pool.query(
    `INSERT INTO "SessionRevocation" (jti, kind, scope, "userId", "organizationId", "expiresAt")
     VALUES ($1, 'session', $2, $3, $4, $5)
     ON CONFLICT (jti) DO NOTHING`,
    [input.jti, input.scope, input.userId, input.organizationId, input.expiresAt],
  );
}

/**
 * Consomme un jeton à usage unique : true seulement pour le premier appelant. Atomique (clé primaire) :
 * deux retours simultanés avec le même state ne passent jamais tous les deux. Table absente => refus.
 */
export async function consumeOneTimeToken(input: {
  jti: string;
  userId: string;
  organizationId: string;
  expiresAt: Date;
}): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO "SessionRevocation" (jti, kind, scope, "userId", "organizationId", "expiresAt")
     VALUES ($1, 'oauth_state', 'app', $2, $3, $4)
     ON CONFLICT (jti) DO NOTHING`,
    [input.jti, input.userId, input.organizationId, input.expiresAt],
  );
  return result.rowCount === 1;
}
