import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { bindPublicInstitute } from "@/lib/db/tenant-context";
import { normalizeLoyaltyPhone } from "@/lib/loyalty/profile-input";

const DAY = 86_400_000;
export const CUSTOMER_SESSION_IDLE_MS = 30 * DAY;
export const CUSTOMER_SESSION_MAX_MS = 90 * DAY;
export const VERIFICATION_REQUEST_MS = 15 * 60_000;

type CookieReader = { cookies: { get(name: string): { value: string } | undefined } };
type Session = { token: string; expiresAt: Date };

export function loyaltySecretToken() {
  return randomBytes(32).toString("base64url");
}

export function loyaltySecretHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieName(organizationId: string, kind: "session" | "request") {
  return `__Host-rb-loyalty-${kind}-${loyaltySecretHash(organizationId).slice(0, 24)}`;
}

function readCookie(request: CookieReader, organizationId: string, kind: "session" | "request") {
  const token = request.cookies.get(cookieName(organizationId, kind))?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function applyCookie(response: NextResponse, organizationId: string, kind: "session" | "request", value: Session) {
  response.cookies.set(cookieName(organizationId, kind), value.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: value.expiresAt,
  });
}

export function applyLoyaltySession(response: NextResponse, organizationId: string, session: Session) {
  applyCookie(response, organizationId, "session", session);
}

/**
 * Session d'appareil pour une carte que l'appareil vient de créer lui-même (QR d'institut, carte directe).
 * Même durée et même liaison au numéro que la session obtenue après validation par l'équipe.
 */
export async function createLoyaltyCustomerSession(
  organizationId: string,
  customerId: string,
  phone: string,
): Promise<Session> {
  const token = loyaltySecretToken();
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_IDLE_MS);
  bindPublicInstitute(organizationId);
  await pool.query(
    `INSERT INTO "LoyaltyCustomerSession"
       (id,"organizationId","customerId","tokenHash","phoneSnapshot","expiresAt","absoluteExpiresAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      `lcss_${randomBytes(8).toString("hex")}`,
      organizationId,
      customerId,
      loyaltySecretHash(token),
      normalizeLoyaltyPhone(phone),
      expiresAt,
      new Date(Date.now() + CUSTOMER_SESSION_MAX_MS),
    ],
  );
  return { token, expiresAt };
}

/** Révoque les sessions d'appareil de cette cliente, sauf celle dont le jeton est donné (déjà émise). */
export async function revokeLoyaltySessionsExcept(organizationId: string, customerId: string, keepToken: string) {
  bindPublicInstitute(organizationId);
  await pool.query(
    `UPDATE "LoyaltyCustomerSession" SET "revokedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL AND "tokenHash" <> $3`,
    [organizationId, customerId, loyaltySecretHash(keepToken)],
  );
}

export function applyLoyaltyVerificationRequest(response: NextResponse, organizationId: string, request: Session) {
  applyCookie(response, organizationId, "request", request);
}

export function readLoyaltyVerificationRequest(request: CookieReader, organizationId: string) {
  return readCookie(request, organizationId, "request");
}

async function readSession(request: CookieReader, organizationId: string, cardId?: string) {
  const token = readCookie(request, organizationId, "session");
  if (!token) return null;
  bindPublicInstitute(organizationId);
  const { rows } = await pool.query<{
    id: string;
    customerId: string;
    cardToken: string;
    phone: string;
    phoneSnapshot: string;
    expiresAt: Date;
  }>(
    `SELECT s.id, s."customerId", lc."publicToken" AS "cardToken", c.phone, s."phoneSnapshot", s."expiresAt"
     FROM "LoyaltyCustomerSession" s
     JOIN "Customer" c ON c.id = s."customerId" AND c."organizationId" = s."organizationId"
     JOIN "LoyaltyCard" lc ON lc."customerId" = c.id AND lc."organizationId" = c."organizationId"
     JOIN "Organization" o ON o.id = c."organizationId" AND o.status = 'ACTIVE'
     WHERE s."organizationId" = $1 AND s."tokenHash" = $2 AND ($3::text IS NULL OR lc.id = $3)
       AND s."revokedAt" IS NULL AND s."expiresAt" > NOW() AND s."absoluteExpiresAt" > NOW()
       AND c."deletedAt" IS NULL AND lc.status = 'ACTIVE' AND lc."mergedIntoCardId" IS NULL`,
    [organizationId, loyaltySecretHash(token), cardId ?? null],
  );
  const session = rows[0];
  return session && normalizeLoyaltyPhone(session.phone) === session.phoneSnapshot ? { ...session, token } : null;
}

export async function resolveLoyaltyJoinSession(request: CookieReader, organizationId: string) {
  const session = await readSession(request, organizationId);
  if (!session) return null;
  // Renouvelle uniquement le QR d’adhésion, à une granularité quotidienne.
  if (session.expiresAt.getTime() > Date.now() + CUSTOMER_SESSION_IDLE_MS - DAY) return session;
  const { rows } = await pool.query<{ expiresAt: Date }>(
    `UPDATE "LoyaltyCustomerSession" s
     SET "expiresAt" = LEAST(s."absoluteExpiresAt", NOW() + interval '30 days')
     WHERE s.id = $1 AND s."organizationId" = $2 AND s."customerId" = $3
       AND s."revokedAt" IS NULL AND s."expiresAt" > NOW() AND s."absoluteExpiresAt" > NOW()
       AND EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = s."customerId"
         AND c."organizationId" = s."organizationId" AND c.phone = $4 AND c."deletedAt" IS NULL)
     RETURNING s."expiresAt"`,
    [session.id, organizationId, session.customerId, session.phone],
  );
  return rows[0] ? { ...session, expiresAt: rows[0].expiresAt } : null;
}

export async function getLoyaltyCardSession(request: CookieReader, cardToken: string) {
  const normalized = cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(normalized)) return null;
  const { rows } = await pool.query<{ id: string; organizationId: string }>(
    `SELECT id, "organizationId" FROM app_public_card_by_token($1)`, [normalized],
  );
  const card = rows[0];
  if (!card) return null;
  const session = await readSession(request, card.organizationId, card.id);
  return session ? { customerId: session.customerId, organizationId: card.organizationId } : null;
}

