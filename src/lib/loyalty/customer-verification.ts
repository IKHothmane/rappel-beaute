import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { pool } from "@/lib/db/pool";
import { issueLoyaltyCard, newLoyaltyId } from "@/lib/loyalty/cards";
import {
  CUSTOMER_SESSION_IDLE_MS,
  CUSTOMER_SESSION_MAX_MS,
  VERIFICATION_REQUEST_MS,
  loyaltySecretHash,
  loyaltySecretToken,
} from "@/lib/loyalty/customer-session";
import { loyaltyPhoneLookupVariants, normalizeLoyaltyPhone } from "@/lib/loyalty/profile-input";

type Mode = "enroll" | "recover";
type RequestData = {
  id: string;
  code: string;
  mode: Mode;
  firstName: string;
  lastName: string;
  phone: string;
  marketingWhatsappConsent: boolean | null;
  customerId: string | null;
  expiresAt: Date;
};
type Actor = { id: string; name: string };

async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function createVerificationRequest(input: {
  organizationId: string; mode: Mode; firstName: string; lastName: string; phone: string;
  marketingWhatsappConsent: boolean;
}) {
  const token = loyaltySecretToken();
  const code = randomBytes(6).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + VERIFICATION_REQUEST_MS);
  await pool.query(
    `INSERT INTO "LoyaltyVerificationRequest"
       (id, "organizationId", "tokenHash", code, mode, "firstName", "lastName", phone,
        "marketingWhatsappConsent", "expiresAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [newLoyaltyId("lverify"), input.organizationId, loyaltySecretHash(token), code,
      input.mode, input.firstName, input.lastName, input.phone, input.marketingWhatsappConsent, expiresAt],
  );
  return { token, code, expiresAt };
}

export async function previewVerificationRequest(organizationId: string, code: string) {
  const { rows } = await pool.query<Pick<RequestData, "code" | "mode" | "firstName" | "lastName" | "phone" | "expiresAt">>(
    `SELECT code, mode, "firstName", "lastName", phone, "expiresAt"
     FROM "LoyaltyVerificationRequest"
     WHERE "organizationId" = $1 AND code = $2 AND "expiresAt" > NOW()
       AND "approvedAt" IS NULL AND "consumedAt" IS NULL`,
    [organizationId, code],
  );
  return rows[0] ?? null;
}

export async function revokeLoyaltyVerificationAccess(client: PoolClient, organizationId: string, customerId: string) {
  await client.query(
    `UPDATE "LoyaltyCustomerSession" SET "revokedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL`,
    [organizationId, customerId],
  );
  await client.query(
    `UPDATE "LoyaltyVerificationRequest" SET "consumedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2
       AND "approvedAt" IS NOT NULL AND "consumedAt" IS NULL`,
    [organizationId, customerId],
  );
}

export async function revokeCustomerLoyaltySessions(organizationId: string, customerId: string, actor: Actor) {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('loyalty-merge:' || $1::text))", [organizationId]);
    const target = await client.query(
      `SELECT 1 FROM "Customer" WHERE "organizationId" = $1 AND id = $2 AND "deletedAt" IS NULL FOR UPDATE`,
      [organizationId, customerId],
    );
    if (!target.rows.length) throw new Error("CUSTOMER_NOT_FOUND");
    await revokeLoyaltyVerificationAccess(client, organizationId, customerId);
    await writeAuditLog({ organizationId, actorId: actor.id, actorName: actor.name, client,
      entityType: "Customer", entityId: customerId, action: "LOYALTY_CUSTOMER_SESSIONS_REVOKED" });
  });
}

export async function approveVerificationRequest(input: {
  organizationId: string; code: string; customerId?: string; phoneChangeConfirmed: boolean; actor: Actor;
}) {
  const { organizationId, actor } = input;
  return transaction(async (client) => {
    // Même ordre de verrous que la fusion et les crédits.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('loyalty-merge:' || $1::text))", [organizationId]);
    const found = await client.query<RequestData>(
      `SELECT id, code, mode, "firstName", "lastName", phone, "marketingWhatsappConsent", "expiresAt"
       FROM "LoyaltyVerificationRequest"
       WHERE "organizationId" = $1 AND code = $2 AND "expiresAt" > NOW()
         AND "approvedAt" IS NULL AND "consumedAt" IS NULL FOR UPDATE`,
      [organizationId, input.code],
    );
    const request = found.rows[0];
    if (!request) throw new Error("VERIFICATION_NOT_FOUND");
    if (request.mode === "recover" && !input.customerId) throw new Error("CUSTOMER_REQUIRED");

    const conflicts = await client.query(
      `SELECT 1 FROM "Customer"
       WHERE "organizationId" = $1 AND phone = ANY($2::text[]) AND "deletedAt" IS NULL
         AND ($3::text IS NULL OR id <> $3) LIMIT 1`,
      [organizationId, loyaltyPhoneLookupVariants(request.phone), input.customerId ?? null],
    );
    if (conflicts.rows.length) throw new Error("PHONE_ALREADY_KNOWN");

    let customerId = input.customerId;
    if (customerId) {
      const target = await client.query<{ phone: string }>(
        `SELECT phone FROM "Customer" WHERE "organizationId" = $1 AND id = $2 AND "deletedAt" IS NULL FOR UPDATE`,
        [organizationId, customerId],
      );
      if (!target.rows[0]) throw new Error("CUSTOMER_NOT_FOUND");
      const previousPhone = target.rows[0].phone;
      if (normalizeLoyaltyPhone(previousPhone) !== request.phone) {
        if (!input.phoneChangeConfirmed || (request.mode !== "recover" && !previousPhone.startsWith("WL"))) {
          throw new Error("PHONE_CHANGE_CONFIRMATION_REQUIRED");
        }
        await client.query(
          `UPDATE "Customer" SET phone = $3, "updatedAt" = NOW() WHERE "organizationId" = $1 AND id = $2`,
          [organizationId, customerId, request.phone],
        );
      }
      if (request.mode === "recover" || normalizeLoyaltyPhone(previousPhone) !== request.phone) {
        await revokeLoyaltyVerificationAccess(client, organizationId, customerId);
      }
    } else {
      customerId = `cust_${randomBytes(6).toString("hex")}`;
      await client.query(
        `INSERT INTO "Customer" (id,"organizationId","firstName","lastName",phone,status,
          "marketingWhatsapp","marketingEmail","marketingSms","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'NEW',$6,false,false,NOW())`,
        [customerId, organizationId, request.firstName, request.lastName, request.phone, request.marketingWhatsappConsent === true],
      );
      if (request.marketingWhatsappConsent === true) {
        await writeAuditLog({ organizationId, client, entityType: "Customer", entityId: customerId,
          action: "MARKETING_WHATSAPP_CONSENT", after: { source: "loyalty-card", consent: "whatsapp" } });
      }
    }

    const card = await issueLoyaltyCard(organizationId, customerId, client);
    const active = await client.query(
      `SELECT 1 FROM "LoyaltyCard" WHERE "organizationId" = $1 AND id = $2
        AND status = 'ACTIVE' AND "mergedIntoCardId" IS NULL`, [organizationId, card.id],
    );
    if (!active.rows.length) throw new Error("CARD_NOT_FOUND");
    await client.query(
      `UPDATE "LoyaltyVerificationRequest" SET "customerId" = $3, "approvedBy" = $4, "approvedAt" = NOW()
       WHERE "organizationId" = $1 AND id = $2`,
      [organizationId, request.id, customerId, actor.id],
    );
    await writeAuditLog({ organizationId, actorId: actor.id, actorName: actor.name, client,
      entityType: "Customer", entityId: customerId, action: "LOYALTY_IDENTITY_VERIFIED",
      after: { mode: request.mode, requestId: request.id } });
  }).catch((error: unknown) => {
    if ((error as { code?: string }).code === "23505") throw new Error("PHONE_ALREADY_KNOWN");
    throw error;
  });
}

export async function claimVerificationRequest(organizationId: string, deviceToken: string) {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('loyalty-merge:' || $1::text))", [organizationId]);
    const found = await client.query<{ id: string; customerId: string | null; phone: string; approvedAt: Date | null }>(
      `SELECT id, "customerId", phone, "approvedAt" FROM "LoyaltyVerificationRequest"
       WHERE "organizationId" = $1 AND "tokenHash" = $2 AND "expiresAt" > NOW() AND "consumedAt" IS NULL
       FOR UPDATE`, [organizationId, loyaltySecretHash(deviceToken)],
    );
    const request = found.rows[0];
    if (!request) throw new Error("VERIFICATION_NOT_FOUND");
    if (!request.customerId || !request.approvedAt) throw new Error("VERIFICATION_PENDING");

    const owned = await client.query<{ phone: string; cardToken: string }>(
      `SELECT c.phone, lc."publicToken" AS "cardToken" FROM "Customer" c
       JOIN "LoyaltyCard" lc ON lc."organizationId" = c."organizationId" AND lc."customerId" = c.id
       WHERE c."organizationId" = $1 AND c.id = $2 AND c."deletedAt" IS NULL
         AND lc.status = 'ACTIVE' AND lc."mergedIntoCardId" IS NULL FOR UPDATE OF c`,
      [organizationId, request.customerId],
    );
    const card = owned.rows[0];
    if (!card || normalizeLoyaltyPhone(card.phone) !== request.phone) throw new Error("VERIFICATION_NOT_FOUND");
    const token = loyaltySecretToken();
    const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_IDLE_MS);
    await client.query(
      `INSERT INTO "LoyaltyCustomerSession"
         (id,"organizationId","customerId","tokenHash","phoneSnapshot","expiresAt","absoluteExpiresAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [newLoyaltyId("lcss"), organizationId, request.customerId, loyaltySecretHash(token), request.phone,
        expiresAt, new Date(Date.now() + CUSTOMER_SESSION_MAX_MS)],
    );
    await client.query(`UPDATE "LoyaltyVerificationRequest" SET "consumedAt" = NOW() WHERE "organizationId" = $1 AND id = $2`,
      [organizationId, request.id]);
    return { token, expiresAt, cardToken: card.cardToken };
  });
}
