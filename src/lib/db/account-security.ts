import { createHash, randomBytes } from "node:crypto";
import { hashPasswordAsync } from "@/lib/auth/crypto";
import { pool } from "@/lib/db/pool";
import { bindPublicInstitute, runInScope } from "@/lib/db/tenant-context";
import { writeAuditLog } from "@/lib/db/audit";
import {
  EMAIL_VERIFICATION_TTL_MS,
  emailOwner,
  isUserEmailUniqueViolation,
  lockEmailKey,
  normalizeEmail,
} from "@/lib/db/email-uniqueness";
import { maskEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import type { AppSessionUser } from "@/lib/auth/types";
import type { AppRole } from "@/lib/rbac";

/**
 * « Sécuriser mon compte » : état de sécurité, ajout / vérification d'une adresse e-mail, premier mot de passe d'un
 * compte sans mot de passe (utilisateur Google). Les lectures et le mot de passe tournent dans la portée de la
 * route (tenant, rôle rappel_app) ; les contrôles d'unicité de l'adresse et le lien du courriel passent par une
 * portée publique dédiée (la RLS d'un institut masquerait les comptes des autres instituts et PlatformUser).
 */

const inPublicScope = <T>(reason: string, fn: () => Promise<T>) => runInScope({ kind: "public", reason }, fn);
const newToken = () => randomBytes(32).toString("base64url");
/** Même haché que hashToken (auth-identities) : SHA-256 hexadécimal du jeton ; module léger, sans cette dépendance. */
const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

/**
 * Vrai seulement quand le compte n'a AUCUNE adresse e-mail (ancien compte identifié par téléphone) : c'est le seul
 * cas qui redirige vers « Sécuriser mon compte » et affiche la bannière. Un compte avec e-mail non vérifié garde
 * son parcours habituel (la vérification reste possible depuis /security/). Requête séparée et tolérante : une panne
 * (colonne absente avant migration, base indisponible) renvoie undefined et le champ est simplement omis.
 */
export async function getEmailSetupRequired(userId: string): Promise<boolean | undefined> {
  try {
    const { rows } = await pool.query<{ email: string | null; emailVerifiedAt: Date | null }>(
      `SELECT email, "emailVerifiedAt" FROM "User" WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return undefined;
    return !(row.email && row.email.trim());
  } catch (error) {
    logger.warn("emailSetupRequired indisponible", { error: error instanceof Error ? error.name : "unknown" });
    return undefined;
  }
}

export type AccountSecurity = {
  email: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  emailSetupRequired: boolean;
};

/** Portée tenant : le compte et son identité Google sont lus sous la RLS de l'institut de la session. */
export async function getAccountSecurity(userId: string, organizationId: string): Promise<AccountSecurity | null> {
  const { rows } = await pool.query<{ email: string | null; emailVerifiedAt: Date | null; hasPassword: boolean; googleLinked: boolean }>(
    `SELECT u.email, u."emailVerifiedAt", (u."passwordHash" IS NOT NULL) AS "hasPassword",
            EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id AND i.provider = 'google') AS "googleLinked"
       FROM "User" u WHERE u.id = $1 AND u."organizationId" = $2 AND u.status = 'ACTIVE'`,
    [userId, organizationId],
  );
  const row = rows[0];
  if (!row) return null;
  const email = row.email && row.email.trim() ? row.email : null;
  const emailVerified = Boolean(email && row.emailVerifiedAt);
  return { email, emailVerified, hasPassword: row.hasPassword, googleLinked: row.googleLinked, emailSetupRequired: !emailVerified };
}

export type EmailChangeRequestResult =
  | { kind: "created"; token: string; firstName: string; sameAddress: boolean }
  /** Adresse prise (compte institut ou plateforme), compte inactif : aucun indice, l'appelant n'envoie rien. */
  | { kind: "unavailable" }
  /** Adresse déjà vérifiée et identique à l'actuelle : rien à faire. */
  | { kind: "noop" };

/**
 * Demande d'adresse e-mail pour le compte connecté : contrôle d'unicité globale (insensible à la casse, comptes
 * institut ET plateforme) sous le verrou de l'adresse, invalidation des liens précédents du compte, puis jeton
 * haché (24 h, usage unique) lié à la NOUVELLE adresse. Une adresse non vérifiée déjà portée par le compte peut
 * être confirmée telle quelle (sameAddress). Une seule transaction, audit inclus.
 */
export function requestEmailChange(opts: { userId: string; organizationId: string; email: string }): Promise<EmailChangeRequestResult> {
  const email = normalizeEmail(opts.email);
  return inPublicScope("demande d'e-mail", async () => {
    bindPublicInstitute(opts.organizationId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await lockEmailKey(client, email);
      const { rows } = await client.query<{ email: string | null; emailVerifiedAt: Date | null; status: string; firstName: string; lastName: string }>(
        `SELECT email, "emailVerifiedAt", status::text AS status, "firstName", "lastName"
           FROM "User" WHERE id = $1 AND "organizationId" = $2 FOR UPDATE`,
        [opts.userId, opts.organizationId],
      );
      const user = rows[0];
      if (!user || user.status !== "ACTIVE") {
        await client.query("ROLLBACK");
        return { kind: "unavailable" };
      }
      const sameAddress = Boolean(user.email) && normalizeEmail(user.email as string) === email;
      if (sameAddress && user.emailVerifiedAt) {
        await client.query("ROLLBACK");
        return { kind: "noop" };
      }
      if (!sameAddress && (await emailOwner(client, email, opts.userId)) !== "free") {
        await client.query("ROLLBACK");
        return { kind: "unavailable" };
      }
      await client.query(`UPDATE "EmailVerificationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL`, [opts.userId]);
      const token = newToken();
      await client.query(
        `INSERT INTO "EmailVerificationToken" (id, "userId", "newEmail", "tokenHash", "expiresAt")
         VALUES ($1, $2, $3, $4, NOW() + ($5::bigint * INTERVAL '1 millisecond'))`,
        [`evt_${randomBytes(10).toString("hex")}`, opts.userId, email, hashToken(token), EMAIL_VERIFICATION_TTL_MS],
      );
      await writeAuditLog({
        organizationId: opts.organizationId,
        actorId: opts.userId,
        actorName: `${user.firstName} ${user.lastName}`.trim(),
        entityType: "User",
        entityId: opts.userId,
        action: "EMAIL_VERIFICATION_REQUESTED",
        after: { email: maskEmail(email), sameAddress },
        client,
      });
      await client.query("COMMIT");
      return { kind: "created", token, firstName: user.firstName, sameAddress };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  });
}

export type VerifyEmailChangeResult = { kind: "verified"; email: string; changed: boolean } | { kind: "invalid" };

/**
 * Lien du courriel (public : il doit marcher depuis un autre appareil, sans session). Une transaction verrouille
 * l'adresse, le compte puis le jeton (FOR UPDATE), contrôle usage unique / expiration / compte actif, REVÉRIFIE
 * l'unicité globale, pose User.email + emailVerifiedAt et écrit l'audit. sessionVersion n'est PAS modifiée : les
 * sessions en cours restent ouvertes. Inconnu, expiré, déjà utilisé, adresse reprise entre-temps : "invalid".
 */
export async function verifyEmailChange(token: string): Promise<VerifyEmailChangeResult> {
  if (!token || token.length > 256) return { kind: "invalid" };
  const tokenHash = hashToken(token);
  const { rows: lookup } = await pool.query<{ userId: string; newEmail: string; organizationId: string }>(
    `SELECT t."userId", t."newEmail", u."organizationId"
       FROM "EmailVerificationToken" t JOIN "User" u ON u.id = t."userId"
      WHERE t."tokenHash" = $1 AND t."userId" IS NOT NULL`,
    [tokenHash],
  );
  const found = lookup[0];
  if (!found) return { kind: "invalid" };
  const email = normalizeEmail(found.newEmail);

  return inPublicScope("vérification d'e-mail", async () => {
    bindPublicInstitute(found.organizationId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await lockEmailKey(client, email);
      const { rows: userRows } = await client.query<{ email: string | null; status: string; firstName: string; lastName: string }>(
        `SELECT email, status::text AS status, "firstName", "lastName" FROM "User" WHERE id = $1 FOR UPDATE`,
        [found.userId],
      );
      const { rows: tokenRows } = await client.query<{ id: string; usedAt: Date | null; expired: boolean }>(
        `SELECT id, "usedAt", "expiresAt" <= NOW() AS expired FROM "EmailVerificationToken"
          WHERE "tokenHash" = $1 AND "userId" = $2 FOR UPDATE`,
        [tokenHash, found.userId],
      );
      const user = userRows[0];
      const row = tokenRows[0];
      if (!user || !row || row.usedAt || row.expired || user.status !== "ACTIVE") {
        await client.query("ROLLBACK");
        return { kind: "invalid" } as const;
      }
      const changed = !user.email || normalizeEmail(user.email) !== email;
      if (changed && (await emailOwner(client, email, found.userId)) !== "free") {
        // Adresse reprise depuis la demande : le jeton est clos, sans rien révéler.
        await client.query(`UPDATE "EmailVerificationToken" SET "usedAt" = NOW() WHERE id = $1`, [row.id]);
        await client.query("COMMIT");
        return { kind: "invalid" } as const;
      }
      await client.query(`UPDATE "User" SET email = $2, "emailVerifiedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`, [found.userId, email]);
      await client.query(`UPDATE "EmailVerificationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL`, [found.userId]);
      await writeAuditLog({
        organizationId: found.organizationId,
        actorId: found.userId,
        actorName: `${user.firstName} ${user.lastName}`.trim(),
        entityType: "User",
        entityId: found.userId,
        action: changed ? "EMAIL_CHANGED" : "EMAIL_VERIFIED",
        before: { email: user.email ? maskEmail(user.email) : null },
        after: { email: maskEmail(email), sessionsKept: true },
        client,
      });
      await client.query("COMMIT");
      return { kind: "verified", email, changed } as const;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (isUserEmailUniqueViolation(error)) return { kind: "invalid" } as const;
      throw error;
    } finally {
      client.release();
    }
  });
}

export type SetInitialPasswordError = "USER_NOT_FOUND" | "PASSWORD_ALREADY_SET" | "EMAIL_NOT_VERIFIED";

/**
 * Premier mot de passe d'un compte qui n'en a pas (utilisateur Google). Dans la transaction, sous le verrou du
 * compte : aucun mot de passe existant (une définition concurrente est refusée), adresse présente ET vérifiée.
 * sessionVersion + 1 révoque les AUTRES sessions ; la session renvoyée porte la nouvelle version et l'appelant
 * ré-émet le cookie courant (comme changeOwnPassword). L'authentification récente est contrôlée par l'appelant.
 */
export async function setInitialPassword(opts: { userId: string; organizationId: string; newPassword: string }): Promise<AppSessionUser> {
  // Avant la transaction : le verrou de ligne n'est pas tenu pendant le hachage.
  const passwordHash = await hashPasswordAsync(opts.newPassword);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      email: string | null;
      loginPhone: string | null;
      firstName: string;
      lastName: string;
      role: AppRole;
      passwordHash: string | null;
      emailVerifiedAt: Date | null;
      organizationId: string;
      orgName: string;
      orgSlug: string;
    }>(
      `SELECT u.id, u.email, u."loginPhone", u."firstName", u."lastName", u.role, u."passwordHash", u."emailVerifiedAt",
              u."organizationId", o.name AS "orgName", o.slug AS "orgSlug"
         FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
        WHERE u.id = $1 AND u."organizationId" = $2 AND u.status = 'ACTIVE'
        FOR UPDATE OF u`,
      [opts.userId, opts.organizationId],
    );
    const user = rows[0];
    if (!user) throw new Error("USER_NOT_FOUND" satisfies SetInitialPasswordError);
    if (user.passwordHash) throw new Error("PASSWORD_ALREADY_SET" satisfies SetInitialPasswordError);
    if (!user.email || !user.emailVerifiedAt) throw new Error("EMAIL_NOT_VERIFIED" satisfies SetInitialPasswordError);

    const { rows: updated } = await client.query<{ sessionVersion: number }>(
      `UPDATE "User"
          SET "passwordHash" = $2, "mustChangePassword" = false, "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW()
        WHERE id = $1 AND "passwordHash" IS NULL
        RETURNING "sessionVersion"`,
      [opts.userId, passwordHash],
    );
    if (!updated[0]) throw new Error("PASSWORD_ALREADY_SET" satisfies SetInitialPasswordError);
    await writeAuditLog({
      organizationId: opts.organizationId,
      actorId: opts.userId,
      actorName: `${user.firstName} ${user.lastName}`.trim(),
      entityType: "User",
      entityId: opts.userId,
      action: "PASSWORD_SET",
      after: { method: "account-security", otherSessionsRevoked: true },
      client,
    });
    await client.query("COMMIT");
    return {
      id: user.id,
      email: user.email,
      loginPhone: user.loginPhone ?? undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      orgName: user.orgName,
      orgSlug: user.orgSlug,
      orgLogoUrl: null,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: false,
      sessionVersion: Number(updated[0].sessionVersion) || 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
