import { randomBytes } from "crypto";
import { Pool } from "pg";
import { issueLoyaltyCard, newLoyaltyId, newPublicToken } from "@/lib/loyalty/cards";
import { localPhoneDigits } from "@/lib/validation/customer";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function joinToken() {
  return `RBJOIN_${newPublicToken().slice("RBLOY_".length)}`;
}

export type JoinQrView = {
  token: string;
  status: "ACTIVE";
  organizationName: string;
  programName: string;
  visitsPerReward: number;
  rewardLabel: string;
  active: boolean;
};

export async function getActiveJoinQr(organizationId: string): Promise<JoinQrView | null> {
  const { rows } = await pool.query<{
    token: string;
    organizationName: string;
    programName: string;
    visitsPerReward: number;
    rewardLabel: string;
    active: boolean;
  }>(
    `SELECT q.token, o.name AS "organizationName",
            COALESCE(NULLIF(p.name, ''), o.name) AS "programName",
            COALESCE(p."visitsPerReward", 10) AS "visitsPerReward",
            COALESCE(NULLIF(p."rewardLabel", ''), 'Récompense') AS "rewardLabel",
            COALESCE(p.active, true) AS active
     FROM "LoyaltyJoinQr" q
     JOIN "Organization" o ON o.id = q."organizationId"
     LEFT JOIN "LoyaltyProgram" p ON p."organizationId" = o.id
     WHERE q."organizationId" = $1 AND q.status = 'ACTIVE'
     ORDER BY q."createdAt" DESC
     LIMIT 1`,
    [organizationId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    token: row.token,
    status: "ACTIVE",
    organizationName: row.organizationName,
    programName: row.programName,
    visitsPerReward: row.visitsPerReward > 0 ? row.visitsPerReward : 10,
    rewardLabel: row.rewardLabel,
    active: row.active,
  };
}

export async function regenerateJoinQr(organizationId: string): Promise<JoinQrView> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE "LoyaltyJoinQr" SET status = 'REVOKED', "revokedAt" = NOW()
       WHERE "organizationId" = $1 AND status = 'ACTIVE'`,
      [organizationId],
    );
    const token = joinToken();
    await client.query(
      `INSERT INTO "LoyaltyJoinQr" (id, "organizationId", token, status) VALUES ($1, $2, $3, 'ACTIVE')`,
      [newLoyaltyId("ljqr"), organizationId, token],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const created = await getActiveJoinQr(organizationId);
  if (!created) throw new Error("JOIN_QR_FAILED");
  return created;
}

export async function revokeJoinQr(organizationId: string): Promise<void> {
  await pool.query(
    `UPDATE "LoyaltyJoinQr" SET status = 'REVOKED', "revokedAt" = NOW()
     WHERE "organizationId" = $1 AND status = 'ACTIVE'`,
    [organizationId],
  );
}

export async function previewJoinQr(token: string): Promise<JoinQrView | null> {
  const normalized = token.trim().toUpperCase();
  if (!/^RBJOIN_[A-Z2-9]{8,32}$/.test(normalized)) return null;
  const { rows } = await pool.query<{ organizationId: string }>(
    `SELECT "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = 'ACTIVE'`,
    [normalized],
  );
  if (!rows[0]) return null;
  return getActiveJoinQr(rows[0].organizationId);
}

export async function enrollFromJoinQr(input: {
  token: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): Promise<{ cardToken: string }> {
  const preview = await previewJoinQr(input.token);
  if (!preview) throw new Error("JOIN_QR_INVALID");
  if (!preview.active) throw new Error("PROGRAM_DISABLED");

  const phone = localPhoneDigits(input.phone);
  if (phone.length < 8 || phone.length > 10) throw new Error("INVALID_PHONE");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (firstName.length < 1 || lastName.length < 1) throw new Error("INVALID_NAME");

  const qr = await pool.query<{ organizationId: string }>(
    `SELECT "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = 'ACTIVE'`,
    [input.token.trim().toUpperCase()],
  );
  const organizationId = qr.rows[0]?.organizationId;
  if (!organizationId) throw new Error("JOIN_QR_INVALID");

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL`,
    [organizationId, phone],
  );
  let customerId = existing.rows[0]?.id;
  if (!customerId) {
    customerId = `cust_${randomBytes(6).toString("hex")}`;
    try {
      await pool.query(
        `INSERT INTO "Customer" (
          id, "organizationId", "firstName", "lastName", phone, email, status,
          "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'NEW', false, false, false, NOW())`,
        [customerId, organizationId, firstName, lastName, phone, input.email?.trim() || null],
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "23505") throw error;
      const again = await pool.query<{ id: string }>(
        `SELECT id FROM "Customer"
         WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL`,
        [organizationId, phone],
      );
      if (!again.rows[0]) throw error;
      customerId = again.rows[0].id;
    }
  }

  const card = await issueLoyaltyCard(organizationId, customerId);
  return { cardToken: card.publicToken };
}
