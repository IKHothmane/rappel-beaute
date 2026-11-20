import { pool } from "@/lib/db/pool";
import { runAsJob } from "@/lib/db/tenant-context";

export type AuthPurgeResult = {
  oauthStates: number;
  pendingSignups: number;
  verificationTokens: number;
  sessionRevocations: number;
  activationTokensDeleted: number;
  activationTokensHashed: number;
};

/** Délai de grâce après expiration avant suppression (jours). */
export const AUTH_PURGE_RETENTION_DAYS = 7;

/**
 * Purge planifiée de l'état d'authentification périmé : états OAuth, inscriptions en attente, jetons de
 * vérification (app_purge_expired_auth_state), révocations de session expirées, jetons d'activation expirés ;
 * les jetons d'activation encore en clair sont remplacés sur place par leur haché. Ne supprime jamais un compte
 * ni un institut. Tâche de fond : portée `job`.
 */
export function purgeExpiredAuthState(retentionDays = AUTH_PURGE_RETENTION_DAYS): Promise<AuthPurgeResult> {
  return runAsJob("purge de l'état d'authentification", async () => {
    const days = Number.isInteger(retentionDays) && retentionDays >= 0 && retentionDays <= 365 ? retentionDays : AUTH_PURGE_RETENTION_DAYS;
    const { rows } = await pool.query<Record<keyof AuthPurgeResult, string | number>>(
      `SELECT * FROM app_purge_expired_auth_data(make_interval(days => $1::int))`,
      [days],
    );
    const row = rows[0];
    const n = (value: string | number | undefined) => Number(value ?? 0);
    return {
      oauthStates: n(row?.oauthStates),
      pendingSignups: n(row?.pendingSignups),
      verificationTokens: n(row?.verificationTokens),
      sessionRevocations: n(row?.sessionRevocations),
      activationTokensDeleted: n(row?.activationTokensDeleted),
      activationTokensHashed: n(row?.activationTokensHashed),
    };
  });
}
