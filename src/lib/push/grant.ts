import { createHash, randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { grantAllowsCard, type PushGrant } from "@/lib/push/eligibility";

export const PUSH_GRANT_COOKIE = "rb_push_grant";
const GRANT_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export function newGrantToken() {
  return randomBytes(32).toString("base64url");
}

export function hashGrantToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function loadPushGrant(raw: string | undefined, now = new Date()): Promise<PushGrant | null> {
  if (!raw || raw.length < 20) return null;
  const { rows } = await pool.query<PushGrant>(
    `SELECT "organizationId", "customerId", "expiresAt", "revokedAt"
     FROM "PushAccessGrant"
     WHERE "tokenHash" = $1`,
    [hashGrantToken(raw)],
  );
  const grant = rows[0] ?? null;
  if (!grant || grantAllowsCard(grant, { organizationId: grant.organizationId, customerId: grant.customerId }, now) !== "ok") {
    return null;
  }
  return grant;
}

export function grantFromRequest(request: NextRequest) {
  return loadPushGrant(request.cookies.get(PUSH_GRANT_COOKIE)?.value);
}

export function setGrantCookie(response: NextResponse, raw: string) {
  response.cookies.set(PUSH_GRANT_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(GRANT_TTL_MS / 1000),
  });
}

export { GRANT_TTL_MS };
