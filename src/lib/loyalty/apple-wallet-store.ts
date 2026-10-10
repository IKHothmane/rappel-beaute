import { randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/logger";
import { applePushToken, appleSerial, passTypeMatches } from "@/lib/loyalty/apple-passkit";

export type ApplePassRecord = {
  id: string;
  serialNumber: string;
  authenticationToken: string;
  updatedAt: Date;
};

function sameSecret(stored: string, given: string) {
  const left = Buffer.from(stored);
  const right = Buffer.from(given);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function ensureApplePass(serial: string): Promise<ApplePassRecord | null> {
  const normalized = appleSerial(serial);
  if (!normalized) return null;
  const existing = await pool.query<{
    id: string | null;
    organizationId: string;
    loyaltyCardId: string;
    authenticationToken: string | null;
    updatedAt: Date | null;
  }>(
    `SELECT c.id AS "loyaltyCardId", c."organizationId",
            p.id, p."authenticationToken", p."updatedAt"
     FROM "LoyaltyCard" c
     LEFT JOIN "AppleWalletPass" p ON p."loyaltyCardId" = c.id
     WHERE c."publicToken" = $1 AND c.status = 'ACTIVE'
     LIMIT 1`,
    [normalized],
  );
  const row = existing.rows[0];
  if (!row) return null;
  if (row.id && row.authenticationToken && row.updatedAt) {
    return {
      id: row.id,
      serialNumber: normalized,
      authenticationToken: row.authenticationToken,
      updatedAt: row.updatedAt,
    };
  }
  const created = await pool.query<{ id: string; authenticationToken: string; updatedAt: Date }>(
    `INSERT INTO "AppleWalletPass"
       (id, "organizationId", "loyaltyCardId", "serialNumber", "authenticationToken")
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ("loyaltyCardId") DO UPDATE SET "serialNumber" = EXCLUDED."serialNumber"
     RETURNING id, "authenticationToken", "updatedAt"`,
    [randomUUID(), row.organizationId, row.loyaltyCardId, normalized, randomBytes(24).toString("base64url")],
  );
  const pass = created.rows[0];
  if (!pass) return null;
  return { id: pass.id, serialNumber: normalized, authenticationToken: pass.authenticationToken, updatedAt: pass.updatedAt };
}

async function authorizedPass(serial: string, token: string) {
  const normalized = appleSerial(serial);
  if (!normalized || !token) return null;
  const result = await pool.query<{ id: string; authenticationToken: string; updatedAt: Date }>(
    `SELECT id, "authenticationToken", "updatedAt"
     FROM "AppleWalletPass" WHERE "serialNumber" = $1`,
    [normalized],
  );
  const pass = result.rows[0];
  if (!pass || !sameSecret(pass.authenticationToken, token)) return null;
  return { ...pass, serialNumber: normalized };
}

export async function registerAppleDevice(input: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
  authenticationToken: string;
  pushToken: string;
}): Promise<201 | 200 | 401> {
  if (!passTypeMatches(input.passTypeIdentifier) || !applePushToken(input.pushToken)) return 401;
  const pass = await authorizedPass(input.serialNumber, input.authenticationToken);
  if (!pass) return 401;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const device = await client.query<{ id: string }>(
      `INSERT INTO "AppleWalletDevice" (id, "deviceLibraryIdentifier", "pushToken")
       VALUES ($1, $2, $3)
       ON CONFLICT ("deviceLibraryIdentifier")
       DO UPDATE SET "pushToken" = EXCLUDED."pushToken", "updatedAt" = CURRENT_TIMESTAMP
       RETURNING id`,
      [randomUUID(), input.deviceLibraryIdentifier, applePushToken(input.pushToken)],
    );
    const deviceId = device.rows[0]?.id;
    if (!deviceId) {
      await client.query("ROLLBACK");
      return 401;
    }
    const link = await client.query(
      `INSERT INTO "AppleWalletRegistration" (id, "passId", "deviceId")
       VALUES ($1, $2, $3)
       ON CONFLICT ("passId", "deviceId") DO NOTHING
       RETURNING id`,
      [randomUUID(), pass.id, deviceId],
    );
    await client.query("COMMIT");
    return link.rows.length > 0 ? 201 : 200;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.warn("apple wallet registration failed", {
      error: error instanceof Error ? error.message : "database",
    });
    return 401;
  } finally {
    client.release();
  }
}

export async function unregisterAppleDevice(input: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
  authenticationToken: string;
}): Promise<200 | 401> {
  if (!passTypeMatches(input.passTypeIdentifier)) return 401;
  const pass = await authorizedPass(input.serialNumber, input.authenticationToken);
  if (!pass) return 401;
  await pool.query(
    `DELETE FROM "AppleWalletRegistration" r
     USING "AppleWalletDevice" d
     WHERE r."deviceId" = d.id AND r."passId" = $1 AND d."deviceLibraryIdentifier" = $2`,
    [pass.id, input.deviceLibraryIdentifier],
  );
  await pool.query(
    `DELETE FROM "AppleWalletDevice" d
     WHERE d."deviceLibraryIdentifier" = $1
       AND NOT EXISTS (SELECT 1 FROM "AppleWalletRegistration" r WHERE r."deviceId" = d.id)`,
    [input.deviceLibraryIdentifier],
  );
  return 200;
}

export async function listUpdatedSerials(deviceLibraryIdentifier: string, passTypeIdentifier: string, since: string | null) {
  if (!passTypeMatches(passTypeIdentifier)) return null;
  const sinceDate = since && Number.isFinite(Date.parse(since)) ? new Date(since) : null;
  const result = await pool.query<{ serialNumber: string; updatedAt: Date }>(
    `SELECT p."serialNumber", p."updatedAt"
     FROM "AppleWalletRegistration" r
     JOIN "AppleWalletDevice" d ON d.id = r."deviceId"
     JOIN "AppleWalletPass" p ON p.id = r."passId"
     WHERE d."deviceLibraryIdentifier" = $1
       AND ($2::timestamptz IS NULL OR p."updatedAt" > $2)
     ORDER BY p."updatedAt" ASC`,
    [deviceLibraryIdentifier, sinceDate],
  );
  if (result.rows.length === 0) return { serialNumbers: [] as string[], lastUpdated: null as string | null };
  const last = result.rows[result.rows.length - 1]?.updatedAt;
  return {
    serialNumbers: result.rows.map((row) => row.serialNumber),
    lastUpdated: last ? last.toISOString() : null,
  };
}

export async function authorizedPassUpdatedAt(serial: string, token: string, passTypeIdentifier: string) {
  if (!passTypeMatches(passTypeIdentifier)) return null;
  const pass = await authorizedPass(serial, token);
  return pass?.updatedAt ?? null;
}

export async function pushTokensForPass(passId: string) {
  const result = await pool.query<{ pushToken: string; deviceId: string }>(
    `SELECT d."pushToken", d.id AS "deviceId"
     FROM "AppleWalletRegistration" r
     JOIN "AppleWalletDevice" d ON d.id = r."deviceId"
     WHERE r."passId" = $1`,
    [passId],
  );
  return result.rows;
}

export async function removeAppleDevice(deviceId: string) {
  await pool.query(`DELETE FROM "AppleWalletDevice" WHERE id = $1`, [deviceId]);
}
