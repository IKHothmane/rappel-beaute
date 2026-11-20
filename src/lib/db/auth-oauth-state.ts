import { randomBytes } from "node:crypto";
import { pool } from "@/lib/db/pool";
import { runInScope } from "@/lib/db/tenant-context";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { sanitizeRedirectAfter } from "@/lib/auth/redirect-after";
import { sha256Hex, type PkceMaterial } from "@/lib/auth/google-oidc";

export const OAUTH_STATE_TTL_MS = 10 * 60_000;

export type OAuthIntent = "login" | "signup" | "link";

export type ConsumedOAuthState = {
  id: string;
  intent: OAuthIntent;
  userId: string | null;
  nonceHash: string;
  codeVerifier: string;
  redirectAfter: string | null;
};

/**
 * AuthOAuthState est une table d'authentification hors institut : seuls rappel_public et rappel_platform
 * y accèdent. Une route institut (liaison) écrit donc dans une portée publique dédiée, limitée à cette table.
 */
function inPublicScope<T>(fn: () => Promise<T>): Promise<T> {
  return runInScope({ kind: "public", reason: "état OAuth" }, fn);
}

/**
 * Crée l'état d'un aller-retour : seuls les hachés du state et du nonce sont stockés, le code_verifier PKCE
 * est chiffré (AES-GCM). Un `redirectAfter` refusé par la liste blanche est ignoré.
 */
export async function createOAuthState(input: {
  material: PkceMaterial;
  intent: OAuthIntent;
  userId?: string | null;
  redirectAfter?: string | null;
}): Promise<void> {
  if (input.intent === "link" && !input.userId) throw new Error("OAUTH_STATE_LINK_REQUIRES_USER");
  const redirectAfter = sanitizeRedirectAfter(input.redirectAfter);
  await inPublicScope(() =>
    pool.query(
      `INSERT INTO "AuthOAuthState" (id, "stateHash", "nonceHash", intent, "userId", "codeVerifierEnc", "redirectAfter", "expiresAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + ($8::int * INTERVAL '1 millisecond'))`,
      [
        `oas_${randomBytes(12).toString("hex")}`,
        sha256Hex(input.material.state),
        sha256Hex(input.material.nonce),
        input.intent,
        input.intent === "link" ? input.userId : null,
        encryptSecret(input.material.codeVerifier),
        redirectAfter,
        OAUTH_STATE_TTL_MS,
      ],
    ),
  );
}

/**
 * Consommation atomique et à usage unique : un rejeu, un état expiré ou inconnu renvoie null.
 * Aucune distinction n'est faite entre ces trois cas.
 */
export async function consumeOAuthState(state: string): Promise<ConsumedOAuthState | null> {
  if (typeof state !== "string" || state.length < 16 || state.length > 256) return null;
  const { rows } = await inPublicScope(() =>
    pool.query<{
      id: string;
      intent: OAuthIntent;
      userId: string | null;
      nonceHash: string;
      codeVerifierEnc: string;
      redirectAfter: string | null;
    }>(
      `UPDATE "AuthOAuthState"
          SET "consumedAt" = NOW()
        WHERE "stateHash" = $1 AND "consumedAt" IS NULL AND "expiresAt" > NOW()
        RETURNING id, intent, "userId", "nonceHash", "codeVerifierEnc", "redirectAfter"`,
      [sha256Hex(state)],
    ),
  );
  const row = rows[0];
  if (!row) return null;
  let codeVerifier: string;
  try {
    codeVerifier = decryptSecret(row.codeVerifierEnc);
  } catch {
    return null;
  }
  return {
    id: row.id,
    intent: row.intent,
    userId: row.userId,
    nonceHash: row.nonceHash,
    codeVerifier,
    redirectAfter: sanitizeRedirectAfter(row.redirectAfter),
  };
}

/**
 * Lecture SEULE (rien n'est consommé) de l'intention et de la page de retour d'un état encore valide, pour
 * qu'un échec ou une annulation de liaison ramène l'utilisateur connecté sur sa page de sécurité. Un état
 * rejoué, expiré ou inconnu donne null, sans distinction.
 */
export async function peekOAuthState(
  state: string,
): Promise<{ intent: OAuthIntent; redirectAfter: string | null } | null> {
  if (typeof state !== "string" || state.length < 16 || state.length > 256) return null;
  const { rows } = await inPublicScope(() =>
    pool.query<{ intent: OAuthIntent; redirectAfter: string | null }>(
      `SELECT intent, "redirectAfter" FROM "AuthOAuthState"
        WHERE "stateHash" = $1 AND "consumedAt" IS NULL AND "expiresAt" > NOW()`,
      [sha256Hex(state)],
    ),
  );
  const row = rows[0];
  return row ? { intent: row.intent, redirectAfter: sanitizeRedirectAfter(row.redirectAfter) } : null;
}
