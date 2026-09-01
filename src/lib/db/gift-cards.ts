import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import type {
  CreateGiftCardInput,
  GiftCardKpis,
  GiftCardListItem,
  GiftCardStatus,
  GiftCardTxnItem,
} from "@/types/promo";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function generateCode(): string {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `BEAUTY-${part()}-${part()}`;
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

function mapCard(r: Record<string, unknown>): GiftCardListItem {
  return {
    id: String(r.id),
    code: String(r.code),
    initialValue: parseFloat(String(r.initialValue)) || 0,
    balance: parseFloat(String(r.balance)) || 0,
    status: r.status as GiftCardStatus,
    buyerName:
      r.buyerFirst || r.buyerLast
        ? `${r.buyerFirst ?? ""} ${r.buyerLast ?? ""}`.trim()
        : null,
    beneficiaryName:
      r.benFirst || r.benLast
        ? `${r.benFirst ?? ""} ${r.benLast ?? ""}`.trim()
        : null,
    buyerCustomerId: (r.buyerCustomerId as string) ?? null,
    beneficiaryCustomerId: (r.beneficiaryCustomerId as string) ?? null,
    expiresAt: r.expiresAt ? new Date(r.expiresAt as Date).toISOString() : null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

export async function getGiftCardKpis(organizationId: string): Promise<GiftCardKpis> {
  const { rows } = await pool.query<{
    soldCount: number;
    soldValue: string;
    redeemedValue: string;
    remainingBalance: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::int FROM "GiftCard"
       WHERE "organizationId" = $1 AND status <> 'CANCELLED') AS "soldCount",
      COALESCE((SELECT SUM("initialValue") FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'), 0)::text AS "soldValue",
      COALESCE((SELECT SUM(ABS(amount)) FROM "GiftCardTransaction"
        WHERE "organizationId" = $1 AND type = 'REDEEMED'), 0)::text AS "redeemedValue",
      COALESCE((SELECT SUM(balance) FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE'), 0)::text AS "remainingBalance"`,
    [organizationId],
  );
  return {
    soldCount: rows[0]?.soldCount ?? 0,
    soldValue: Math.round((parseFloat(rows[0]?.soldValue ?? "0") || 0) * 100) / 100,
    redeemedValue: Math.round((parseFloat(rows[0]?.redeemedValue ?? "0") || 0) * 100) / 100,
    remainingBalance:
      Math.round((parseFloat(rows[0]?.remainingBalance ?? "0") || 0) * 100) / 100,
  };
}

export async function listGiftCards(
  organizationId: string,
  opts: { page: number; limit: number; status?: string | null; search?: string },
): Promise<{ items: GiftCardListItem[]; total: number; kpis: GiftCardKpis }> {
  const conditions = [`g."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;
  if (opts.status) {
    conditions.push(`g.status = $${pi}::"GiftCardStatus"`);
    params.push(opts.status);
    pi++;
  }
  if (opts.search) {
    conditions.push(`g.code ILIKE $${pi}`);
    params.push(`%${opts.search}%`);
    pi++;
  }
  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;
  const [countRes, listRes, kpis] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "GiftCard" g WHERE ${where}`,
      params,
    ),
    pool.query(
      `SELECT g.id, g.code, g."initialValue"::text, g.balance::text, g.status::text,
              g."buyerCustomerId", g."beneficiaryCustomerId", g."expiresAt", g."createdAt",
              b."firstName" AS "buyerFirst", b."lastName" AS "buyerLast",
              n."firstName" AS "benFirst", n."lastName" AS "benLast"
       FROM "GiftCard" g
       LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
       LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
       WHERE ${where}
       ORDER BY g."createdAt" DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
    getGiftCardKpis(organizationId),
  ]);
  return {
    items: listRes.rows.map((r) => mapCard(r as Record<string, unknown>)),
    total: countRes.rows[0]?.total ?? 0,
    kpis,
  };
}

export async function getGiftCardById(
  organizationId: string,
  id: string,
): Promise<(GiftCardListItem & { transactions: GiftCardTxnItem[] }) | null> {
  const { rows } = await pool.query(
    `SELECT g.id, g.code, g."initialValue"::text, g.balance::text, g.status::text,
            g."buyerCustomerId", g."beneficiaryCustomerId", g."expiresAt", g."createdAt",
            b."firstName" AS "buyerFirst", b."lastName" AS "buyerLast",
            n."firstName" AS "benFirst", n."lastName" AS "benLast"
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g.id = $1 AND g."organizationId" = $2`,
    [id, organizationId],
  );
  if (!rows[0]) return null;
  const tx = await pool.query<{
    id: string;
    type: string;
    amount: string;
    balanceAfter: string;
    reason: string | null;
    paymentId: string | null;
    createdAt: Date;
  }>(
    `SELECT id, type::text, amount::text, "balanceAfter"::text, reason, "paymentId", "createdAt"
     FROM "GiftCardTransaction" WHERE "giftCardId" = $1 ORDER BY "createdAt" ASC`,
    [id],
  );
  return {
    ...mapCard(rows[0] as Record<string, unknown>),
    transactions: tx.rows.map((t) => ({
      id: t.id,
      type: t.type as GiftCardTxnItem["type"],
      amount: parseFloat(t.amount) || 0,
      balanceAfter: parseFloat(t.balanceAfter) || 0,
      reason: t.reason,
      paymentId: t.paymentId,
      createdAt: new Date(t.createdAt).toISOString(),
    })),
  };
}

export async function getGiftCardByCode(
  organizationId: string,
  code: string,
): Promise<GiftCardListItem | null> {
  const { rows } = await pool.query(
    `SELECT g.id, g.code, g."initialValue"::text, g.balance::text, g.status::text,
            g."buyerCustomerId", g."beneficiaryCustomerId", g."expiresAt", g."createdAt",
            b."firstName" AS "buyerFirst", b."lastName" AS "buyerLast",
            n."firstName" AS "benFirst", n."lastName" AS "benLast"
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g."organizationId" = $1 AND upper(g.code) = upper($2)`,
    [organizationId, code],
  );
  if (!rows[0]) return null;
  return mapCard(rows[0] as Record<string, unknown>);
}

export async function issueGiftCard(
  organizationId: string,
  input: CreateGiftCardInput,
  actor: { id: string; name?: string | null },
): Promise<GiftCardListItem> {
  const client = await pool.connect();
  let code = generateCode();
  const id = newId("gc");
  try {
    await client.query("BEGIN");
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await client.query(
          `INSERT INTO "GiftCard" (
            id, "organizationId", code, "initialValue", balance,
            "buyerCustomerId", "beneficiaryCustomerId", status, "expiresAt",
            notes, "createdById", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$4,$5,$6,'ACTIVE'::"GiftCardStatus",$7,$8,$9,NOW()
          )`,
          [
            id,
            organizationId,
            code,
            input.amount,
            input.buyerCustomerId ?? null,
            input.beneficiaryCustomerId ?? null,
            input.expiresAt ? new Date(input.expiresAt) : null,
            input.notes ?? null,
            actor.id,
          ],
        );
        break;
      } catch (e) {
        if (isUniqueViolation(e) && attempt < 4) {
          code = generateCode();
          continue;
        }
        throw e;
      }
    }

    await client.query(
      `INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'ISSUED'::"GiftCardTxnType",$4,$4,'Émission carte cadeau',$5,$6
      )`,
      [newId("gctx"), organizationId, id, input.amount, actor.id, `issue:${id}`],
    );

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "GiftCard",
      entityId: id,
      action: "ISSUE",
      after: { code, amount: input.amount },
      client,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const card = await getGiftCardById(organizationId, id);
  if (!card) throw new Error("NOT_FOUND");
  return card;
}

/**
 * Débite la carte (ledger) — idempotent via paymentId.
 * Vérifie statut, expiration et solde côté serveur.
 */
export async function redeemGiftCard(opts: {
  organizationId: string;
  giftCardId?: string | null;
  code?: string | null;
  amount: number;
  paymentId: string;
  userId?: string | null;
  client?: PoolClient;
}): Promise<{ giftCardId: string; redeemed: number }> {
  const c = opts.client ?? pool;
  const key = `redeem:payment:${opts.paymentId}`;

  const dup = await c.query<{ giftCardId: string; amount: string }>(
    `SELECT "giftCardId", amount::text FROM "GiftCardTransaction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [opts.organizationId, key],
  );
  if (dup.rows[0]) {
    return {
      giftCardId: dup.rows[0].giftCardId,
      redeemed: Math.abs(parseFloat(dup.rows[0].amount) || 0),
    };
  }

  let cardId = opts.giftCardId;
  if (!cardId && opts.code) {
    const found = await c.query<{ id: string }>(
      `SELECT id FROM "GiftCard"
       WHERE "organizationId" = $1 AND upper(code) = upper($2)`,
      [opts.organizationId, opts.code],
    );
    cardId = found.rows[0]?.id;
  }
  if (!cardId) throw new Error("GIFT_CARD_NOT_FOUND");

  const { rows } = await c.query<{
    id: string;
    balance: string;
    status: string;
    expiresAt: Date | null;
  }>(
    `SELECT id, balance::text, status::text, "expiresAt"
     FROM "GiftCard"
     WHERE id = $1 AND "organizationId" = $2
     FOR UPDATE`,
    [cardId, opts.organizationId],
  );
  if (!rows[0]) throw new Error("GIFT_CARD_NOT_FOUND");
  if (rows[0].status !== "ACTIVE") throw new Error("GIFT_CARD_INACTIVE");
  if (rows[0].expiresAt && new Date(rows[0].expiresAt) < new Date()) {
    await c.query(
      `UPDATE "GiftCard" SET status = 'EXPIRED'::"GiftCardStatus", "updatedAt" = NOW()
       WHERE id = $1`,
      [cardId],
    );
    throw new Error("GIFT_CARD_EXPIRED");
  }

  const balance = parseFloat(rows[0].balance) || 0;
  const redeemAmount = Math.min(opts.amount, balance);
  if (redeemAmount <= 0) throw new Error("GIFT_CARD_EMPTY");

  const balanceAfter = Math.round((balance - redeemAmount) * 100) / 100;
  const status = balanceAfter <= 0 ? "USED" : "ACTIVE";

  await c.query(
    `INSERT INTO "GiftCardTransaction" (
      id, "organizationId", "giftCardId", type, amount, "balanceAfter",
      reason, "paymentId", "createdById", "idempotencyKey"
    ) VALUES (
      $1,$2,$3,'REDEEMED'::"GiftCardTxnType",$4,$5,'Utilisation encaissement',$6,$7,$8
    )`,
    [
      newId("gctx"),
      opts.organizationId,
      cardId,
      -redeemAmount,
      balanceAfter,
      opts.paymentId,
      opts.userId ?? null,
      key,
    ],
  );

  await c.query(
    `UPDATE "GiftCard" SET
      balance = $1,
      status = $2::"GiftCardStatus",
      "updatedAt" = NOW()
     WHERE id = $3`,
    [balanceAfter, status, cardId],
  );

  return { giftCardId: cardId, redeemed: redeemAmount };
}
