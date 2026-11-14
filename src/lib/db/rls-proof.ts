import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Preuve du cadre annoncé à Postgres.
 * Le rôle rappel_app peut écrire les variables de session, mais pas fabriquer cette preuve :
 * la clé reste dans le processus et dans une table que ce rôle ne peut pas lire.
 */
export function rlsContextProof(scope: string, organizationId: string, bypass: "on" | "off"): string {
  const key = process.env.RLS_CONTEXT_KEY ?? "";
  if (!key) return "";
  return createHmac("sha256", key).update(`${scope}|${organizationId}|${bypass}`, "utf8").digest("hex");
}

export function rlsContextProofMatches(
  proof: string,
  scope: string,
  organizationId: string,
  bypass: "on" | "off",
): boolean {
  const expected = rlsContextProof(scope, organizationId, bypass);
  if (!expected || expected.length !== proof.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(proof));
}
