import { randomBytes } from "node:crypto";
import { burnPasswordCheck, checkPasswordUniform } from "@/lib/auth/crypto";
import { pool } from "@/lib/db/pool";
import { bindPublicInstitute } from "@/lib/db/tenant-context";
import { writeAuditLog } from "@/lib/db/audit";
import { normalizeLoginPhone } from "@/lib/auth/login-identifier";
import { phoneLoginEnabled } from "@/lib/auth/env";
import { PENDING_REPLAY_WINDOW_MS, PENDING_SIGNUP_TTL_MS, hashToken } from "@/lib/db/auth-identities";
import {
  EMAIL_VERIFICATION_TTL_MS,
  emailOwner,
  isUserEmailUniqueViolation,
  lockEmailKey,
  normalizeEmail,
} from "@/lib/db/email-uniqueness";
import {
  PublicSignupError,
  createInstituteWithOwner,
  newId,
  resolveSignupPlan,
  splitPersonName,
} from "@/lib/db/institute-create";

/**
 * Inscription par e-mail vérifié (provider 'email' de AuthPendingSignup). Aucune organisation, aucun abonnement
 * ni aucun User n'existe avant `completeEmailSignup`. Rôle : rappel_public (portée publique des routes).
 *
 * Cycle de vie d'une ligne AuthPendingSignup (email) :
 *  1. startEmailSignup : tokenHash = haché d'un aléa JAMAIS transmis (le cookie n'existe pas encore),
 *     emailVerified = false, expiresAt = +24 h, passwordHash = scrypt du mot de passe saisi (jamais le clair).
 *     Un EmailVerificationToken (32 octets aléatoires, SHA-256 en base, 24 h, usage unique) est lié à la ligne.
 *  2. verifyEmailSignup : consomme le jeton, emailVerified = true, tokenHash remplacé par le haché du jeton du
 *     cookie `__Host-rb_pending` (rotation : le jeton du lien ne vaut jamais comme cookie), expiresAt = +30 min.
 *  3. completeEmailSignup : crée institut + OWNER + essai + réglages + audit dans UNE transaction, puis marque
 *     la ligne consommée (consumedAt, organizationId). Un rejeu dans la fenêtre de 10 min réémet la session.
 * Ordre de verrouillage constant : ligne pending, puis jeton (aucune attente circulaire).
 */

/** Délai minimal entre deux envois de lien pour une même inscription, et plafond de renvois. */
const RESEND_COOLDOWN_MS = 60_000;
const MAX_TOKENS_PER_PENDING = 6;

const newToken = () => randomBytes(32).toString("base64url");
const isUnique = (error: unknown) => typeof error === "object" && !!error && (error as { code?: string }).code === "23505";


export type StartEmailSignupResult =
  | { kind: "created"; token: string }
  /** Un compte institut utilise déjà cette adresse : rien n'est créé, l'appelant envoie l'e-mail "compte existant". */
  | { kind: "existing" }
  /** Adresse d'un administrateur de la plateforme : refus silencieux, aucun e-mail. */
  | { kind: "ignored" };

/**
 * Crée l'inscription en attente et son jeton de vérification, sous un verrou consultatif par adresse (deux
 * demandes simultanées ne laissent qu'une inscription ouverte ; l'index partiel de la migration 20261121100000
 * arbitre le reste, un rejeu unique absorbe la course). Les inscriptions ouvertes précédentes de la même adresse
 * sont closes (leurs liens deviennent inutilisables : le jeton est vérifié contre une ligne ouverte).
 */
export async function startEmailSignup(input: { email: string; name: string; passwordHash: string }): Promise<StartEmailSignupResult> {
  const email = normalizeEmail(input.email);
  for (let attempt = 0; attempt < 2; attempt++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await lockEmailKey(client, email);
      const owner = await emailOwner(client, email);
      if (owner !== "free") {
        await client.query("ROLLBACK");
        return owner === "user" ? { kind: "existing" } : { kind: "ignored" };
      }
      await client.query(
        `UPDATE "AuthPendingSignup" SET "consumedAt" = NOW()
          WHERE provider = 'email' AND LOWER("email") = $1 AND "consumedAt" IS NULL`,
        [email],
      );
      const pendingId = `aps_${randomBytes(10).toString("hex")}`;
      await client.query(
        `INSERT INTO "AuthPendingSignup" (id, "tokenHash", provider, "providerSubject", email, "emailVerified", name, "passwordHash", "expiresAt")
         VALUES ($1, $2, 'email', NULL, $3, false, $4, $5, NOW() + ($6::bigint * INTERVAL '1 millisecond'))`,
        [pendingId, hashToken(newToken()), email, input.name, input.passwordHash, EMAIL_VERIFICATION_TTL_MS],
      );
      const token = newToken();
      await client.query(
        `INSERT INTO "EmailVerificationToken" (id, "pendingSignupId", "newEmail", "tokenHash", "expiresAt")
         VALUES ($1, $2, $3, $4, NOW() + ($5::bigint * INTERVAL '1 millisecond'))`,
        [`evt_${randomBytes(10).toString("hex")}`, pendingId, email, hashToken(token), EMAIL_VERIFICATION_TTL_MS],
      );
      await client.query("COMMIT");
      return { kind: "created", token };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (attempt === 0 && isUnique(error)) continue;
      throw error;
    } finally {
      client.release();
    }
  }
  throw new Error("EMAIL_SIGNUP_CONFLICT");
}

export type ResendEmailSignupResult =
  | { kind: "created"; token: string; name: string }
  | { kind: "existing" }
  | { kind: "ignored" }
  | { kind: "none" };

/**
 * Nouveau lien pour l'inscription ouverte et non vérifiée de cette adresse : les jetons précédents sont
 * invalidés (usedAt) puis un nouveau est inséré, dans une transaction sous verrou. Rien à renvoyer (aucune
 * inscription, délai de 60 s, plafond de renvois) : "none", sans effet visible.
 */
export async function resendEmailSignup(rawEmail: string): Promise<ResendEmailSignupResult> {
  const email = normalizeEmail(rawEmail);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockEmailKey(client, email);
    const owner = await emailOwner(client, email);
    if (owner !== "free") {
      await client.query("ROLLBACK");
      return owner === "user" ? { kind: "existing" } : { kind: "ignored" };
    }
    const { rows } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM "AuthPendingSignup"
        WHERE provider = 'email' AND LOWER("email") = $1 AND "consumedAt" IS NULL AND "emailVerified" = false AND "expiresAt" > NOW()
        FOR UPDATE`,
      [email],
    );
    const pending = rows[0];
    if (!pending) {
      await client.query("ROLLBACK");
      return { kind: "none" };
    }
    const { rows: stats } = await client.query<{ n: string; recent: boolean }>(
      `SELECT count(*)::text AS n,
              COALESCE(bool_or("createdAt" > NOW() - ($2::bigint * INTERVAL '1 millisecond')), false) AS recent
         FROM "EmailVerificationToken" WHERE "pendingSignupId" = $1`,
      [pending.id, RESEND_COOLDOWN_MS],
    );
    if (Number(stats[0]?.n ?? 0) >= MAX_TOKENS_PER_PENDING || stats[0]?.recent) {
      await client.query("ROLLBACK");
      return { kind: "none" };
    }
    await client.query(`UPDATE "EmailVerificationToken" SET "usedAt" = NOW() WHERE "pendingSignupId" = $1 AND "usedAt" IS NULL`, [pending.id]);
    const token = newToken();
    await client.query(
      `INSERT INTO "EmailVerificationToken" (id, "pendingSignupId", "newEmail", "tokenHash", "expiresAt")
       VALUES ($1, $2, $3, $4, NOW() + ($5::bigint * INTERVAL '1 millisecond'))`,
      [`evt_${randomBytes(10).toString("hex")}`, pending.id, email, hashToken(token), EMAIL_VERIFICATION_TTL_MS],
    );
    await client.query(`UPDATE "AuthPendingSignup" SET "expiresAt" = NOW() + ($2::bigint * INTERVAL '1 millisecond') WHERE id = $1`, [
      pending.id,
      EMAIL_VERIFICATION_TTL_MS,
    ]);
    await client.query("COMMIT");
    return { kind: "created", token, name: pending.name };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export type VerifyEmailSignupResult = { kind: "verified"; cookieToken: string; email: string; name: string } | { kind: "invalid" };

/**
 * Consomme le jeton du lien : une seule transaction verrouille la ligne pending puis le jeton (FOR UPDATE),
 * contrôle l'usage unique, l'expiration et l'état de la ligne, REVÉRIFIE l'unicité globale de l'adresse (un compte a
 * pu apparaître depuis l'envoi), marque l'e-mail vérifié et fait tourner le jeton de cookie. Jeton inconnu, expiré,
 * déjà utilisé, ou adresse devenue indisponible : même résultat "invalid" (aucun indice).
 */
export async function verifyEmailSignup(token: string): Promise<VerifyEmailSignupResult> {
  if (!token || token.length > 256) return { kind: "invalid" };
  const tokenHash = hashToken(token);
  const { rows: lookup } = await pool.query<{ pendingSignupId: string; email: string }>(
    `SELECT t."pendingSignupId", p.email FROM "EmailVerificationToken" t
       JOIN "AuthPendingSignup" p ON p.id = t."pendingSignupId"
      WHERE t."tokenHash" = $1 AND t."pendingSignupId" IS NOT NULL`,
    [tokenHash],
  );
  const pendingId = lookup[0]?.pendingSignupId;
  if (!pendingId) return { kind: "invalid" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockEmailKey(client, lookup[0].email);
    const { rows: pendingRows } = await client.query<{
      email: string;
      name: string;
      consumedAt: Date | null;
      emailVerified: boolean;
      expired: boolean;
    }>(
      `SELECT email, name, "consumedAt", "emailVerified", "expiresAt" <= NOW() AS expired
         FROM "AuthPendingSignup" WHERE id = $1 AND provider = 'email' FOR UPDATE`,
      [pendingId],
    );
    const { rows: tokenRows } = await client.query<{ id: string; usedAt: Date | null; expired: boolean }>(
      `SELECT id, "usedAt", "expiresAt" <= NOW() AS expired FROM "EmailVerificationToken"
        WHERE "tokenHash" = $1 AND "pendingSignupId" = $2 FOR UPDATE`,
      [tokenHash, pendingId],
    );
    const pending = pendingRows[0];
    const row = tokenRows[0];
    if (!pending || !row || row.usedAt || row.expired || pending.consumedAt || pending.emailVerified || pending.expired) {
      await client.query("ROLLBACK");
      return { kind: "invalid" };
    }
    if ((await emailOwner(client, pending.email)) !== "free") {
      // Le compte est apparu entre l'envoi et le clic : jeton et inscription sont clos, sans rien révéler.
      await client.query(`UPDATE "EmailVerificationToken" SET "usedAt" = NOW() WHERE id = $1`, [row.id]);
      await client.query(`UPDATE "AuthPendingSignup" SET "consumedAt" = NOW() WHERE id = $1`, [pendingId]);
      await client.query("COMMIT");
      return { kind: "invalid" };
    }
    const cookieToken = newToken();
    await client.query(`UPDATE "EmailVerificationToken" SET "usedAt" = NOW() WHERE id = $1`, [row.id]);
    await client.query(
      `UPDATE "AuthPendingSignup"
          SET "emailVerified" = true, "tokenHash" = $2, "expiresAt" = NOW() + ($3::bigint * INTERVAL '1 millisecond')
        WHERE id = $1`,
      [pendingId, hashToken(cookieToken), PENDING_SIGNUP_TTL_MS],
    );
    await client.query("COMMIT");
    return { kind: "verified", cookieToken, email: pending.email, name: pending.name };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Pending e-mail VÉRIFIÉ, ouvert (non consommé, non expiré) : nom et adresse pour préremplir le formulaire. */
export async function getOpenEmailPending(cookieToken: string): Promise<{ name: string; email: string } | null> {
  if (!cookieToken || cookieToken.length > 256) return null;
  const { rows } = await pool.query<{ name: string; email: string }>(
    `SELECT name, email FROM "AuthPendingSignup"
      WHERE "tokenHash" = $1 AND provider = 'email' AND "emailVerified" = true AND "consumedAt" IS NULL AND "expiresAt" > NOW()`,
    [hashToken(cookieToken)],
  );
  return rows[0] ?? null;
}

export type EmailPendingState = { consumed: boolean; organizationId: string | null; expired: boolean; replayable: boolean };

/** État pour un rejeu idempotent (même sémantique que getGooglePendingState) ; null si inconnu ou non vérifié. */
export async function getEmailPendingState(cookieToken: string): Promise<EmailPendingState | null> {
  if (!cookieToken || cookieToken.length > 256) return null;
  const { rows } = await pool.query<{ consumedAt: Date | null; organizationId: string | null; expired: boolean; replayable: boolean }>(
    `SELECT "consumedAt", "organizationId", "expiresAt" <= NOW() AS expired,
            ("consumedAt" IS NOT NULL AND "organizationId" IS NOT NULL
              AND "consumedAt" > NOW() - ($2::bigint * INTERVAL '1 millisecond')) AS replayable
       FROM "AuthPendingSignup" WHERE "tokenHash" = $1 AND provider = 'email' AND "emailVerified" = true`,
    [hashToken(cookieToken), PENDING_REPLAY_WINDOW_MS],
  );
  const row = rows[0];
  if (!row) return null;
  return { consumed: row.consumedAt !== null, organizationId: row.organizationId, expired: row.expired, replayable: Boolean(row.replayable) };
}

export type CompleteEmailSignupInput = {
  token: string;
  /** Mot de passe de l'inscription, saisi de nouveau : exclut la prise de contrôle par un tiers (voir ci-dessous). */
  password: string;
  institut: string;
  city: string;
  address: string;
  website: string | null;
  phone: string;
  personName?: string;
};

export type CompleteEmailSignupResult =
  | { kind: "created"; organizationId: string; userId: string; email: string; firstName: string; institut: string }
  | { kind: "replay"; organizationId: string; userId: string }
  | { kind: "invalid" }
  | { kind: "bad_password" };

/**
 * Finalisation : mêmes garanties que completeGoogleSignup (verrou FOR UPDATE du pending, unicité de l'e-mail et du
 * téléphone dans la transaction, institut + OWNER + essai + réglages + audit atomiques, rejeu borné, une seule
 * organisation en cas de double clic).
 *
 * Mot de passe re-saisi : sans lui, un tiers qui s'inscrirait avec l'adresse d'une victime et un mot de passe P
 * verrait la victime, croyant s'inscrire, vérifier l'adresse et créer l'institut, puis se connecterait avec P.
 * Le mot de passe saisi doit donc correspondre au haché du pending (coût uniforme : une vérification est toujours
 * faite, même quand le pending est inconnu). Le OWNER reçoit le haché du pending (jamais le clair).
 */
export async function completeEmailSignup(input: CompleteEmailSignupInput): Promise<CompleteEmailSignupResult> {
  const tokenHash = hashToken(input.token);
  const phoneEnabled = phoneLoginEnabled();
  const phone = normalizeLoginPhone(input.phone);
  if (!phone) throw new PublicSignupError("INVALID", "Indiquez un numéro de téléphone valide.");

  // 1) Mot de passe, hors transaction (scrypt ne tient aucun verrou). Le haché du pending est immuable.
  const { rows: pre } = await pool.query<{ passwordHash: string | null; email: string }>(
    `SELECT "passwordHash", email FROM "AuthPendingSignup"
      WHERE "tokenHash" = $1 AND provider = 'email' AND "emailVerified" = true`,
    [tokenHash],
  );
  const knownHash = pre[0]?.passwordHash ?? null;
  if (!knownHash) {
    await burnPasswordCheck(input.password);
    return { kind: "invalid" };
  }
  if (!(await checkPasswordUniform(input.password, knownHash))) return { kind: "bad_password" };

  const plan = await resolveSignupPlan();
  const orgId = newId("org");
  const ownerId = newId("u");
  bindPublicInstitute(orgId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockEmailKey(client, pre[0].email);
    const { rows } = await client.query<{
      id: string;
      email: string;
      name: string;
      passwordHash: string | null;
      consumedAt: Date | null;
      organizationId: string | null;
      expired: boolean;
      replayable: boolean;
    }>(
      `SELECT id, email, name, "passwordHash", "consumedAt", "organizationId", "expiresAt" <= NOW() AS expired,
              ("consumedAt" IS NOT NULL AND "organizationId" IS NOT NULL
                AND "consumedAt" > NOW() - ($2::bigint * INTERVAL '1 millisecond')) AS replayable
         FROM "AuthPendingSignup"
        WHERE "tokenHash" = $1 AND provider = 'email' AND "emailVerified" = true FOR UPDATE`,
      [tokenHash, PENDING_REPLAY_WINDOW_MS],
    );
    const pending = rows[0];
    if (!pending || pending.passwordHash !== knownHash) {
      await client.query("ROLLBACK");
      return { kind: "invalid" };
    }
    if (pending.consumedAt) {
      if (pending.organizationId && pending.replayable) {
        const { rows: owner } = await client.query<{ id: string }>(
          `SELECT id FROM "User" WHERE "organizationId" = $1 AND role::text = 'OWNER' AND LOWER(BTRIM(email)) = $2 LIMIT 1`,
          [pending.organizationId, normalizeEmail(pending.email)],
        );
        await client.query("ROLLBACK");
        return owner[0] ? { kind: "replay", organizationId: pending.organizationId, userId: owner[0].id } : { kind: "invalid" };
      }
      await client.query("ROLLBACK");
      return { kind: "invalid" };
    }
    if (pending.expired) {
      await client.query("ROLLBACK");
      return { kind: "invalid" };
    }

    if ((await emailOwner(client, pending.email)) !== "free") {
      throw new PublicSignupError("EMAIL_TAKEN", "Impossible de créer ce compte avec cette adresse.");
    }
    if (phoneEnabled) {
      const phoneCheck = await client.query(`SELECT 1 FROM "User" WHERE "loginPhone" = $1 LIMIT 1`, [phone]);
      if (phoneCheck.rows.length) throw new PublicSignupError("PHONE_TAKEN", "Ce numéro de téléphone possède déjà un compte.");
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
        // Téléphone désactivé comme identifiant : il reste un contact (User.phone) mais plus loginPhone.
        loginPhone: phoneEnabled ? phone : null,
        passwordHash: pending.passwordHash,
        mustChangePassword: false,
        emailVerifiedAt: now,
      },
      plan,
      now,
    });
    await client.query(`UPDATE "AuthPendingSignup" SET "consumedAt" = NOW(), "organizationId" = $2 WHERE id = $1`, [pending.id, orgId]);
    await writeAuditLog({
      organizationId: orgId,
      actorId: ownerId,
      actorName: `${firstName} ${lastName}`.trim(),
      entityType: "User",
      entityId: ownerId,
      action: "SIGNUP_EMAIL",
      after: { provider: "email", emailVerified: true },
      client,
    });
    await client.query("COMMIT");
    return { kind: "created", organizationId: orgId, userId: ownerId, email: pending.email, firstName, institut };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (isUserEmailUniqueViolation(error)) throw new PublicSignupError("EMAIL_TAKEN", "Impossible de créer ce compte avec cette adresse.");
    if (isUnique(error) && String((error as { constraint?: string }).constraint ?? "").includes("User_loginPhone")) {
      throw new PublicSignupError("PHONE_TAKEN", "Ce numéro de téléphone possède déjà un compte.");
    }
    throw error;
  } finally {
    client.release();
  }
}
