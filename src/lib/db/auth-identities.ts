import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db/pool";
import { bindPublicInstitute, runInScope } from "@/lib/db/tenant-context";
import { writeAuditLog } from "@/lib/db/audit";
import { logger } from "@/lib/logger";
import {
  PublicSignupError,
  createInstituteWithOwner,
  newId,
  resolveSignupPlan,
  splitPersonName,
} from "@/lib/db/institute-create";
import { normalizeLoginPhone } from "@/lib/auth/login-identifier";
import { phoneLoginEnabled } from "@/lib/auth/env";
import { emailOwner, isUserEmailUniqueViolation, lockEmailKey } from "@/lib/db/email-uniqueness";
import { isAppRole, type AppRole } from "@/lib/rbac";
import type { AppSessionUser } from "@/lib/auth/types";
import type { GoogleIdentityClaims } from "@/lib/auth/google-oidc";

export const GOOGLE_PROVIDER = "google";
export const PENDING_SIGNUP_TTL_MS = 30 * 60_000;
/** Un rejeu idempotent de /signup (pending déjà consommé) n'est accepté que peu de temps après la création. */
export const PENDING_REPLAY_WINDOW_MS = 10 * 60_000;

export const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

const inPublicScope = <T>(reason: string, fn: () => Promise<T>) => runInScope({ kind: "public", reason }, fn);

// ---------------------------------------------------------------------------
// Recherche par identité et connexion
// ---------------------------------------------------------------------------

export type IdentityRow = {
  userId: string;
  organizationId: string;
  userStatus: string;
  organizationStatus: string;
};

/** Recherche exacte (google, sub) par la fonction SECURITY DEFINER : aucune lecture directe de UserIdentity. */
export async function findGoogleIdentity(sub: string): Promise<IdentityRow | null> {
  const { rows } = await pool.query<IdentityRow>(
    `SELECT "userId", "organizationId", "userStatus", "organizationStatus" FROM app_public_identity_login($1, $2)`,
    [GOOGLE_PROVIDER, sub],
  );
  return rows[0] ?? null;
}

/** Un e-mail déjà présent chez un User ou un PlatformUser n'ouvre jamais d'inscription ni de fusion. */
export async function emailBelongsToAnyAccount(email: string, client?: Pick<PoolClient, "query">): Promise<boolean> {
  return (await emailOwner(client ?? pool, email)) !== "free";
}

type SessionRow = {
  id: string;
  email: string | null;
  loginPhone: string | null;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  mustChangePassword: boolean;
  sessionVersion: number;
  userStatus: string;
  orgStatus: string;
  orgName: string;
  orgSlug: string;
};

/**
 * Session institut d'un utilisateur ACTIVE d'un institut ACTIVE ; le rôle est celui de la base et ne peut
 * être qu'un rôle d'institut (jamais SUPER_ADMIN : les administrateurs sont dans PlatformUser).
 * Portée publique dédiée annoncée sur l'institut : peut être appelée après une autre portée de la requête.
 */
export function loadAppSessionForUser(userId: string, organizationId: string): Promise<AppSessionUser | null> {
  return inPublicScope("session Google", async () => {
    bindPublicInstitute(organizationId);
    const { rows } = await pool.query<SessionRow>(
      `SELECT u.id, u.email, u."loginPhone", u."firstName", u."lastName", u.role::text AS role,
              u."organizationId", u."mustChangePassword", u."sessionVersion", u.status::text AS "userStatus",
              o.status::text AS "orgStatus", o.name AS "orgName", o.slug AS "orgSlug"
         FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
        WHERE u.id = $1 AND u."organizationId" = $2`,
      [userId, organizationId],
    );
    const row = rows[0];
    if (!row || row.userStatus !== "ACTIVE" || row.orgStatus !== "ACTIVE" || !isAppRole(row.role)) return null;
    return {
      id: row.id,
      email: row.email ?? "",
      loginPhone: row.loginPhone ?? undefined,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as AppRole,
      organizationId: row.organizationId,
      orgName: row.orgName,
      orgSlug: row.orgSlug,
      orgLogoUrl: null,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: Boolean(row.mustChangePassword),
      sessionVersion: Number(row.sessionVersion) || 0,
    };
  });
}

/**
 * Connexion par identité connue. Renvoie null (sans distinguer les causes) si l'identité est inconnue,
 * l'utilisateur ou l'institut n'est pas ACTIVE. Écrit l'audit LOGIN et la date de dernière connexion.
 */
export async function loginWithGoogleIdentity(
  sub: string,
  expectedOrganizationId?: string,
): Promise<AppSessionUser | null> {
  const identity = await findGoogleIdentity(sub);
  if (!identity) return null;
  if (identity.userStatus !== "ACTIVE" || identity.organizationStatus !== "ACTIVE") return null;
  if (expectedOrganizationId && identity.organizationId !== expectedOrganizationId) return null;
  const session = await loadAppSessionForUser(identity.userId, identity.organizationId);
  if (!session) return null;
  await inPublicScope("connexion Google", async () => {
    bindPublicInstitute(session.organizationId);
    await pool.query(`SELECT app_public_identity_touch($1, $2)`, [GOOGLE_PROVIDER, sub]).catch(() => undefined);
    await writeAuditLog({
      organizationId: session.organizationId,
      actorId: session.id,
      actorName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "User",
      entityId: session.id,
      action: "LOGIN",
      after: { method: "google" },
    }).catch((error: unknown) => {
      // Le nom de l'erreur seulement : le message peut contenir des valeurs SQL.
      logger.warn("audit LOGIN (google) failed", { userId: session.id, error: error instanceof Error ? error.name : "unknown" });
    });
  });
  return session;
}

// ---------------------------------------------------------------------------
// Inscription en attente
// ---------------------------------------------------------------------------

function isUniqueViolation(error: unknown, constraintPart?: string): boolean {
  if (typeof error !== "object" || !error) return false;
  const e = error as { code?: string; constraint?: string };
  return e.code === "23505" && (!constraintPart || (e.constraint ?? "").includes(constraintPart));
}

/**
 * Crée (ou remplace) l'inscription Google en attente : aucun User n'est créé. L'éventuelle inscription
 * ouverte du même sub est close d'abord (consumedAt), puis la nouvelle insérée, dans une transaction.
 * Renvoie le jeton en clair (cookie) ; seul son haché est conservé.
 */
export async function createGooglePendingSignup(claims: GoogleIdentityClaims): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = randomBytes(32).toString("base64url");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE "AuthPendingSignup" SET "consumedAt" = NOW()
          WHERE provider = $1 AND "providerSubject" = $2 AND "consumedAt" IS NULL`,
        [GOOGLE_PROVIDER, claims.sub],
      );
      await client.query(
        `INSERT INTO "AuthPendingSignup" (id, "tokenHash", provider, "providerSubject", email, "emailVerified", name, "expiresAt")
         VALUES ($1, $2, $3, $4, $5, true, $6, NOW() + ($7::int * INTERVAL '1 millisecond'))`,
        [`aps_${randomBytes(10).toString("hex")}`, hashToken(token), GOOGLE_PROVIDER, claims.sub, claims.email, claims.name, PENDING_SIGNUP_TTL_MS],
      );
      await client.query("COMMIT");
      return token;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (attempt === 0 && isUniqueViolation(error)) continue;
      throw error;
    } finally {
      client.release();
    }
  }
  throw new Error("PENDING_SIGNUP_CONFLICT");
}

export type PendingView = { name: string; email: string };

/** Lecture du pending ouvert (non consommé, non expiré) : uniquement nom et e-mail pour préremplir. */
export async function getOpenGooglePending(token: string): Promise<PendingView | null> {
  if (!token || token.length > 256) return null;
  const { rows } = await pool.query<PendingView>(
    `SELECT name, email FROM "AuthPendingSignup"
      WHERE "tokenHash" = $1 AND provider = $2 AND "consumedAt" IS NULL AND "expiresAt" > NOW()`,
    [hashToken(token), GOOGLE_PROVIDER],
  );
  return rows[0] ?? null;
}

/**
 * État du pending pour un rejeu : consommé avec institut ET dans la fenêtre de rejeu = idempotence ;
 * sinon (expiré, inconnu, consommé depuis trop longtemps) la finalisation est refusée.
 */
export async function getGooglePendingState(
  token: string,
): Promise<{ sub: string; consumed: boolean; organizationId: string | null; expired: boolean; replayable: boolean } | null> {
  if (!token || token.length > 256) return null;
  const { rows } = await pool.query<{
    providerSubject: string;
    consumedAt: Date | null;
    organizationId: string | null;
    expired: boolean;
    replayable: boolean;
  }>(
    `SELECT "providerSubject", "consumedAt", "organizationId", "expiresAt" <= NOW() AS expired,
            ("consumedAt" IS NOT NULL AND "organizationId" IS NOT NULL
              AND "consumedAt" > NOW() - ($3::int * INTERVAL '1 millisecond')) AS replayable
       FROM "AuthPendingSignup" WHERE "tokenHash" = $1 AND provider = $2`,
    [hashToken(token), GOOGLE_PROVIDER, PENDING_REPLAY_WINDOW_MS],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    sub: row.providerSubject,
    consumed: row.consumedAt !== null,
    organizationId: row.organizationId,
    expired: row.expired,
    replayable: Boolean(row.replayable),
  };
}

export type CompleteGoogleSignupInput = {
  token: string;
  institut: string;
  city: string;
  address: string;
  website: string | null;
  /** Téléphone de contact (chiffres) ; sert d'identifiant WhatsApp. */
  phone: string;
  personName?: string;
};

export type CompleteGoogleSignupResult =
  | { kind: "created"; organizationId: string; userId: string; email: string; firstName: string; institut: string; sub: string }
  | { kind: "replay"; organizationId: string; sub: string }
  | { kind: "invalid" };

/**
 * Finalisation unique : une seule transaction verrouille le pending (FOR UPDATE), contrôle l'e-mail et le
 * téléphone, crée l'institut, le propriétaire OWNER (sans mot de passe, e-mail vérifié), l'essai, les
 * réglages et l'identité Google, marque le pending consommé et écrit l'audit. Un rejeu (pending déjà
 * consommé avec institut) ne crée rien et renvoie « replay ». UNIQUE (provider, sub) reste le dernier rempart.
 */
export async function completeGoogleSignup(input: CompleteGoogleSignupInput): Promise<CompleteGoogleSignupResult> {
  const phone = normalizeLoginPhone(input.phone);
  if (!phone) throw new PublicSignupError("INVALID", "Indiquez un numéro de téléphone valide.");
  const tokenHash = hashToken(input.token);
  const plan = await resolveSignupPlan();
  const orgId = newId("org");
  const ownerId = newId("u");

  // Avant l'emprunt de la connexion : sans institut annoncé, rappel_public échoue sur Organization et réglages.
  bindPublicInstitute(orgId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      providerSubject: string;
      email: string;
      name: string;
      consumedAt: Date | null;
      organizationId: string | null;
      expired: boolean;
      replayable: boolean;
    }>(
      `SELECT id, "providerSubject", email, name, "consumedAt", "organizationId", "expiresAt" <= NOW() AS expired,
              ("consumedAt" IS NOT NULL AND "organizationId" IS NOT NULL
                AND "consumedAt" > NOW() - ($3::int * INTERVAL '1 millisecond')) AS replayable
         FROM "AuthPendingSignup" WHERE "tokenHash" = $1 AND provider = $2 FOR UPDATE`,
      [tokenHash, GOOGLE_PROVIDER, PENDING_REPLAY_WINDOW_MS],
    );
    const pending = rows[0];
    if (!pending) {
      await client.query("ROLLBACK");
      return { kind: "invalid" };
    }
    if (pending.consumedAt) {
      await client.query("ROLLBACK");
      // Rejeu accepté seulement peu après la création ; au-delà, le jeton est refusé comme expiré.
      return pending.organizationId && pending.replayable
        ? { kind: "replay", organizationId: pending.organizationId, sub: pending.providerSubject }
        : { kind: "invalid" };
    }
    if (pending.expired) {
      await client.query("ROLLBACK");
      return { kind: "invalid" };
    }

    // Contrôles globaux dans la transaction (pas seulement au callback), sous le verrou de l'adresse.
    await lockEmailKey(client, pending.email);
    if (await emailBelongsToAnyAccount(pending.email, client)) {
      throw new PublicSignupError("EMAIL_TAKEN", "Impossible de créer ce compte avec cette adresse.");
    }
    const { rows: identityRows } = await client.query(
      `SELECT 1 FROM app_public_identity_login($1, $2)`,
      [GOOGLE_PROVIDER, pending.providerSubject],
    );
    if (identityRows.length > 0) throw new PublicSignupError("EMAIL_TAKEN", "Impossible de créer ce compte avec cette adresse.");
    const phoneEnabled = phoneLoginEnabled();
    if (phoneEnabled) {
      const phoneCheck = await client.query(`SELECT 1 FROM "User" WHERE "loginPhone" = $1 LIMIT 1`, [phone]);
      if (phoneCheck.rows.length) {
        throw new PublicSignupError("PHONE_TAKEN", "Ce numéro de téléphone possède déjà un compte.");
      }
    }

    const { firstName, lastName } = splitPersonName(input.personName?.trim() || pending.name);
    const institut = input.institut.trim();
    const now = new Date();
    await createInstituteWithOwner(client, {
      orgId,
      ownerId,
      institut,
      address: input.address.trim() || null,
      city: input.city.trim() || null,
      phone,
      email: pending.email,
      website: input.website,
      owner: {
        firstName,
        lastName,
        email: pending.email,
        phone,
        loginPhone: phoneEnabled ? phone : null,
        passwordHash: null,
        mustChangePassword: false,
        emailVerifiedAt: now,
      },
      plan,
      now,
    });
    // rappel_public n'a aucun INSERT direct sur UserIdentity : la fonction SECURITY DEFINER vérifie que ce
    // propriétaire vient d'être créé pour CE pending (sujet et e-mail lus dans le pending, pas fournis ici).
    await client.query(`SELECT app_public_identity_create_for_signup($1, $2, $3, $4)`, [
      newId("uid"),
      pending.id,
      ownerId,
      orgId,
    ]);
    await client.query(
      `UPDATE "AuthPendingSignup" SET "consumedAt" = NOW(), "organizationId" = $2 WHERE id = $1`,
      [pending.id, orgId],
    );
    await writeAuditLog({
      organizationId: orgId,
      actorId: ownerId,
      actorName: `${firstName} ${lastName}`.trim(),
      entityType: "User",
      entityId: ownerId,
      action: "SIGNUP_GOOGLE",
      after: { provider: GOOGLE_PROVIDER, emailVerified: true },
      client,
    });
    await client.query("COMMIT");
    return { kind: "created", organizationId: orgId, userId: ownerId, email: pending.email, firstName, institut, sub: pending.providerSubject };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (isUniqueViolation(error, "User_loginPhone")) {
      throw new PublicSignupError("PHONE_TAKEN", "Ce numéro de téléphone possède déjà un compte.");
    }
    // Index d'unicité globale de l'e-mail (migration en attente) : erreur métier générique.
    if (isUserEmailUniqueViolation(error)) {
      throw new PublicSignupError("EMAIL_TAKEN", "Impossible de créer ce compte avec cette adresse.");
    }
    if (isUniqueViolation(error, "UserIdentity_provider_providerSubject")) {
      // Course : une autre requête a créé l'identité entre-temps. Ré-essai en lecture seule côté appelant.
      const state = await getGooglePendingState(input.token).catch(() => null);
      if (state?.organizationId && state.replayable) return { kind: "replay", organizationId: state.organizationId, sub: state.sub };
      return { kind: "invalid" };
    }
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Liaison / déliaison explicites (utilisateur connecté)
// ---------------------------------------------------------------------------

export type LinkResult = "linked" | "already_linked" | "in_use" | "inactive";

/**
 * Lie l'identité Google à l'utilisateur de la session, sans jamais fusionner par e-mail. L'écriture se fait
 * en portée TENANT (rôle rappel_app, RLS de l'institut de la session) : la politique de UserIdentity refuse
 * tout userId hors de cet institut. Refus si le sub appartient à un autre User ; les index uniques
 * (provider, sub) et (userId, provider) arbitrent les courses (ON CONFLICT DO NOTHING, puis lecture du compte).
 * L'appelant a déjà vérifié que la session est celle qui a demandé l'état OAuth.
 */
export async function linkGoogleIdentity(opts: {
  userId: string;
  organizationId: string;
  sessionVersion: number;
  claims: GoogleIdentityClaims;
}): Promise<LinkResult> {
  return runInScope({ kind: "tenant", organizationId: opts.organizationId }, async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ status: string; orgStatus: string; sessionVersion: number; firstName: string; lastName: string }>(
        `SELECT u.status::text AS status, o.status::text AS "orgStatus", u."sessionVersion", u."firstName", u."lastName"
           FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
          WHERE u.id = $1 AND u."organizationId" = $2 FOR UPDATE OF u`,
        [opts.userId, opts.organizationId],
      );
      const user = rows[0];
      if (!user || user.status !== "ACTIVE" || user.orgStatus !== "ACTIVE" || Number(user.sessionVersion) !== opts.sessionVersion) {
        await client.query("ROLLBACK");
        return "inactive";
      }
      const inserted = await client.query(
        `INSERT INTO "UserIdentity" (id, "userId", provider, "providerSubject", email, "emailVerified", "lastLoginAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         ON CONFLICT (provider, "providerSubject") DO NOTHING`,
        [newId("uid"), opts.userId, GOOGLE_PROVIDER, opts.claims.sub, opts.claims.email],
      );
      if (!inserted.rowCount) {
        // Conflit sur (provider, sub) : si ce compte porte déjà CE sub = already_linked ; sinon le sub appartient à
        // un autre compte (invisible sous la RLS de cet institut) = in_use. Un conflit sur (userId, provider)
        // seul (autre compte Google déjà lié, sub libre) n'est pas absorbé ici : il lève 23505, géré ci-dessous.
        const { rows: own } = await client.query(
          `SELECT 1 FROM "UserIdentity" WHERE "userId" = $1 AND provider = $2 AND "providerSubject" = $3`,
          [opts.userId, GOOGLE_PROVIDER, opts.claims.sub],
        );
        await client.query("ROLLBACK");
        return own.length > 0 ? "already_linked" : "in_use";
      }
      await writeAuditLog({
        organizationId: opts.organizationId,
        actorId: opts.userId,
        actorName: `${user.firstName} ${user.lastName}`.trim(),
        entityType: "User",
        entityId: opts.userId,
        action: "GOOGLE_LINKED",
        after: { provider: GOOGLE_PROVIDER },
        client,
      });
      await client.query("COMMIT");
      return "linked";
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      // (provider, sub) pris par un autre compte, ou (userId, provider) déjà lié : refus, jamais de fusion.
      if (isUniqueViolation(error, "providerSubject")) return "in_use";
      if (isUniqueViolation(error, "userId_provider")) return "already_linked";
      throw error;
    } finally {
      client.release();
    }
  });
}

export type UnlinkResult = "unlinked" | "not_linked" | "last_login_method" | "inactive";

/**
 * Délie Google de l'utilisateur de la session (route institut, rôle rappel_app). Refusé si le compte n'a
 * ni mot de passe ni e-mail vérifié : il ne resterait aucun moyen de se reconnecter. Transaction unique.
 */
export async function unlinkGoogleIdentity(opts: { userId: string; organizationId: string }): Promise<UnlinkResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      status: string;
      passwordHash: string | null;
      emailVerifiedAt: Date | null;
      email: string | null;
      firstName: string;
      lastName: string;
    }>(
      `SELECT status::text AS status, "passwordHash", "emailVerifiedAt", email, "firstName", "lastName"
         FROM "User" WHERE id = $1 AND "organizationId" = $2 FOR UPDATE`,
      [opts.userId, opts.organizationId],
    );
    const user = rows[0];
    if (!user || user.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return "inactive";
    }
    if (!user.passwordHash && !(user.emailVerifiedAt && user.email)) {
      await client.query("ROLLBACK");
      return "last_login_method";
    }
    const deleted = await client.query(`DELETE FROM "UserIdentity" WHERE "userId" = $1 AND provider = $2`, [opts.userId, GOOGLE_PROVIDER]);
    if (!deleted.rowCount) {
      await client.query("ROLLBACK");
      return "not_linked";
    }
    await writeAuditLog({
      organizationId: opts.organizationId,
      actorId: opts.userId,
      actorName: `${user.firstName} ${user.lastName}`.trim(),
      entityType: "User",
      entityId: opts.userId,
      action: "GOOGLE_UNLINKED",
      after: { provider: GOOGLE_PROVIDER },
      client,
    });
    await client.query("COMMIT");
    return "unlinked";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Lecture tenant : l'utilisateur a-t-il un mot de passe, une identité Google ? (rappel_app, RLS institut). */
export async function getLinkContext(userId: string, organizationId: string) {
  const { rows } = await pool.query<{ passwordHash: string | null; linked: boolean }>(
    `SELECT u."passwordHash",
            EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id AND i.provider = $3) AS linked
       FROM "User" u WHERE u.id = $1 AND u."organizationId" = $2 AND u.status = 'ACTIVE'`,
    [userId, organizationId, GOOGLE_PROVIDER],
  );
  return rows[0] ?? null;
}
