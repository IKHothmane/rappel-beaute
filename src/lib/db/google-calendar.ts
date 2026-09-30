import { randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";
import {
  refreshGoogleAccessToken,
  type GoogleTokenSet,
} from "@/lib/google/calendar";

function newId() {
  return `gcal_${randomBytes(8).toString("hex")}`;
}

export type GoogleCalendarConnectionRow = {
  id: string;
  organizationId: string;
  googleEmail: string;
  googleAccountId: string | null;
  calendarId: string;
  calendarName: string | null;
  refreshTokenEnc: string;
  accessTokenEnc: string | null;
  accessTokenExpiresAt: Date | null;
  connectedAt: Date;
};

export async function getGoogleCalendarConnection(
  organizationId: string,
): Promise<GoogleCalendarConnectionRow | null> {
  const { rows } = await pool.query<GoogleCalendarConnectionRow>(
    `SELECT id, "organizationId", "googleEmail", "googleAccountId", "calendarId", "calendarName",
            "refreshTokenEnc", "accessTokenEnc", "accessTokenExpiresAt", "connectedAt"
     FROM "GoogleCalendarConnection"
     WHERE "organizationId" = $1
     LIMIT 1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

export async function upsertGoogleCalendarConnection(input: {
  organizationId: string;
  googleEmail: string;
  googleAccountId: string | null;
  calendarId?: string;
  calendarName?: string | null;
  tokens: GoogleTokenSet;
  existingRefreshEnc?: string | null;
}): Promise<GoogleCalendarConnectionRow> {
  const refreshPlain =
    input.tokens.refreshToken ??
    (input.existingRefreshEnc ? decryptSecret(input.existingRefreshEnc) : null);
  if (!refreshPlain) {
    throw new Error("GOOGLE_REFRESH_MISSING");
  }

  const refreshTokenEnc = encryptSecret(refreshPlain);
  const accessTokenEnc = encryptSecret(input.tokens.accessToken);
  const calendarId = input.calendarId || "primary";
  const calendarName = input.calendarName ?? null;
  const existing = await getGoogleCalendarConnection(input.organizationId);

  if (existing) {
    await pool.query(
      `UPDATE "GoogleCalendarConnection"
       SET "googleEmail" = $1,
           "googleAccountId" = $2,
           "calendarId" = $3,
           "calendarName" = $4,
           "refreshTokenEnc" = $5,
           "accessTokenEnc" = $6,
           "accessTokenExpiresAt" = $7,
           "connectedAt" = NOW(),
           "updatedAt" = NOW()
       WHERE id = $8`,
      [
        input.googleEmail,
        input.googleAccountId,
        calendarId,
        calendarName,
        refreshTokenEnc,
        accessTokenEnc,
        input.tokens.expiresAt,
        existing.id,
      ],
    );
  } else {
    await pool.query(
      `INSERT INTO "GoogleCalendarConnection" (
         id, "organizationId", "googleEmail", "googleAccountId", "calendarId", "calendarName",
         "refreshTokenEnc", "accessTokenEnc", "accessTokenExpiresAt",
         "connectedAt", "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW(),NOW())`,
      [
        newId(),
        input.organizationId,
        input.googleEmail,
        input.googleAccountId,
        calendarId,
        calendarName,
        refreshTokenEnc,
        accessTokenEnc,
        input.tokens.expiresAt,
      ],
    );
  }

  const saved = await getGoogleCalendarConnection(input.organizationId);
  if (!saved) throw new Error("GOOGLE_CONNECTION_SAVE_FAILED");
  return saved;
}

export async function updateGoogleCalendarSelection(
  organizationId: string,
  calendarId: string,
  calendarName: string | null,
): Promise<GoogleCalendarConnectionRow | null> {
  await pool.query(
    `UPDATE "GoogleCalendarConnection"
     SET "calendarId" = $1, "calendarName" = $2, "updatedAt" = NOW()
     WHERE "organizationId" = $3`,
    [calendarId, calendarName, organizationId],
  );
  return getGoogleCalendarConnection(organizationId);
}

export async function deleteGoogleCalendarConnection(organizationId: string): Promise<string | null> {
  const existing = await getGoogleCalendarConnection(organizationId);
  if (!existing) return null;
  let refresh: string | null = null;
  try {
    refresh = decryptSecret(existing.refreshTokenEnc);
  } catch {
    refresh = null;
  }
  await pool.query(`DELETE FROM "GoogleCalendarConnection" WHERE "organizationId" = $1`, [
    organizationId,
  ]);
  return refresh;
}

export async function getValidGoogleAccessToken(
  organizationId: string,
): Promise<{ accessToken: string; calendarId: string } | null> {
  const conn = await getGoogleCalendarConnection(organizationId);
  if (!conn) return null;

  const stillValid =
    conn.accessTokenEnc &&
    conn.accessTokenExpiresAt &&
    conn.accessTokenExpiresAt.getTime() > Date.now() + 30_000;

  if (stillValid && conn.accessTokenEnc) {
    try {
      return {
        accessToken: decryptSecret(conn.accessTokenEnc),
        calendarId: conn.calendarId,
      };
    } catch {
      /* refresh below */
    }
  }

  const refreshToken = decryptSecret(conn.refreshTokenEnc);
  const tokens = await refreshGoogleAccessToken(refreshToken);
  await pool.query(
    `UPDATE "GoogleCalendarConnection"
     SET "accessTokenEnc" = $1,
         "accessTokenExpiresAt" = $2,
         "refreshTokenEnc" = $3,
         "updatedAt" = NOW()
     WHERE id = $4`,
    [
      encryptSecret(tokens.accessToken),
      tokens.expiresAt,
      encryptSecret(tokens.refreshToken ?? refreshToken),
      conn.id,
    ],
  );
  return { accessToken: tokens.accessToken, calendarId: conn.calendarId };
}

export async function getAppointmentGoogleEventId(appointmentId: string): Promise<string | null> {
  const { rows } = await pool.query<{ googleEventId: string | null }>(
    `SELECT "googleEventId" FROM "Appointment" WHERE id = $1`,
    [appointmentId],
  );
  return rows[0]?.googleEventId ?? null;
}

export async function setAppointmentGoogleEventId(
  appointmentId: string,
  googleEventId: string | null,
): Promise<void> {
  await pool.query(`UPDATE "Appointment" SET "googleEventId" = $1, "updatedAt" = NOW() WHERE id = $2`, [
    googleEventId,
    appointmentId,
  ]);
}

export async function getOrganizationName(organizationId: string): Promise<string> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  return rows[0]?.name ?? "Institut";
}
