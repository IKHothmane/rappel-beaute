import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import type {
  AppointmentPaymentSummary,
  CashRegisterState,
  CashSessionSummary,
  CashTxnItem,
  CashTxnType,
  CloseCashInput,
  CreatePaymentsInput,
  ManualCashTxnInput,
  OpenCashInput,
  PaymentItem,
  PaymentKind,
  PaymentMethod,
  RefundPaymentInput,
} from "@/types/finance";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

function mapPaymentRow(r: Record<string, unknown>): PaymentItem {
  return {
    id: String(r.id),
    appointmentId: (r.appointmentId as string) ?? null,
    customerId: (r.customerId as string) ?? null,
    customerName:
      r.customerFirst || r.customerLast
        ? `${r.customerFirst ?? ""} ${r.customerLast ?? ""}`.trim()
        : null,
    serviceName: (r.serviceName as string) ?? null,
    amount: parseFloat(String(r.amount)) || 0,
    method: r.method as PaymentMethod,
    kind: r.kind as PaymentKind,
    status: r.status as PaymentItem["status"],
    parentPaymentId: (r.parentPaymentId as string) ?? null,
    giftCardId: (r.giftCardId as string) ?? null,
    notes: (r.notes as string) ?? null,
    userId: (r.userId as string) ?? null,
    userName:
      r.userFirst || r.userLast
        ? `${r.userFirst ?? ""} ${r.userLast ?? ""}`.trim()
        : null,
    paidAt: new Date(r.paidAt as Date).toISOString(),
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

function mapCashTxn(r: Record<string, unknown>): CashTxnItem {
  return {
    id: String(r.id),
    sessionId: String(r.sessionId),
    type: r.type as CashTxnType,
    amount: parseFloat(String(r.amount)) || 0,
    method: (r.method as PaymentMethod) ?? null,
    reason: (r.reason as string) ?? null,
    paymentId: (r.paymentId as string) ?? null,
    userId: (r.userId as string) ?? null,
    userName:
      r.userFirst || r.userLast
        ? `${r.userFirst ?? ""} ${r.userLast ?? ""}`.trim()
        : null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

async function getOpenSessionRow(organizationId: string, client?: PoolClient) {
  const c = client ?? pool;
  const { rows } = await c.query(
    `SELECT
      s.id, s.status::text, s."openingFloat"::text, s."openedAt", s."openedById",
      s."closedAt", s."closedById", s."closingCounted"::text, s."expectedBalance"::text,
      s.difference::text, s."closeReason", s.notes,
      ou."firstName" AS "openFirst", ou."lastName" AS "openLast",
      cu."firstName" AS "closeFirst", cu."lastName" AS "closeLast"
     FROM "CashRegisterSession" s
     LEFT JOIN "User" ou ON ou.id = s."openedById"
     LEFT JOIN "User" cu ON cu.id = s."closedById"
     WHERE s."organizationId" = $1 AND s.status = 'OPEN'
     LIMIT 1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

async function sumSessionCash(sessionId: string, client?: PoolClient) {
  const c = client ?? pool;
  const { rows } = await c.query<{ cashIn: string; cashOut: string; balance: string }>(
    `SELECT
      COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND type <> 'OPENING'), 0)::text AS "cashIn",
      COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0 AND type <> 'CLOSING'), 0)::text AS "cashOut",
      COALESCE(SUM(amount), 0)::text AS balance
     FROM "CashRegisterTransaction"
     WHERE "sessionId" = $1 AND type <> 'CLOSING'`,
    [sessionId],
  );
  return {
    cashIn: parseFloat(rows[0]?.cashIn ?? "0") || 0,
    cashOut: parseFloat(rows[0]?.cashOut ?? "0") || 0,
    balance: parseFloat(rows[0]?.balance ?? "0") || 0,
  };
}

async function paymentsTodayTotals(organizationId: string) {
  const { rows } = await pool.query<{ method: string; total: string }>(
    `SELECT method::text, COALESCE(SUM(
        CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END
      ), 0)::text AS total
     FROM "Payment"
     WHERE "organizationId" = $1
       AND status = 'COMPLETED'
       AND "paidAt" >= date_trunc('day', NOW())
     GROUP BY method`,
    [organizationId],
  );
  const out = { cash: 0, card: 0, transfer: 0, online: 0, other: 0, total: 0 };
  for (const r of rows) {
    const n = parseFloat(r.total) || 0;
    out.total += n;
    if (r.method === "CASH") out.cash += n;
    else if (r.method === "CARD") out.card += n;
    else if (r.method === "TRANSFER") out.transfer += n;
    else if (r.method === "ONLINE") out.online += n;
    else out.other += n;
  }
  return out;
}

async function buildSessionSummary(
  organizationId: string,
  row: Record<string, unknown>,
): Promise<CashSessionSummary> {
  const sums = await sumSessionCash(String(row.id));
  const paymentsToday = await paymentsTodayTotals(organizationId);
  const openingFloat = parseFloat(String(row.openingFloat)) || 0;
  return {
    id: String(row.id),
    status: row.status as CashSessionSummary["status"],
    openingFloat,
    openedAt: new Date(row.openedAt as Date).toISOString(),
    openedById: String(row.openedById),
    openedByName:
      row.openFirst || row.openLast
        ? `${row.openFirst ?? ""} ${row.openLast ?? ""}`.trim()
        : null,
    closedAt: row.closedAt ? new Date(row.closedAt as Date).toISOString() : null,
    closedById: (row.closedById as string) ?? null,
    closedByName:
      row.closeFirst || row.closeLast
        ? `${row.closeFirst ?? ""} ${row.closeLast ?? ""}`.trim()
        : null,
    closingCounted:
      row.closingCounted != null ? parseFloat(String(row.closingCounted)) : null,
    expectedBalance:
      row.expectedBalance != null ? parseFloat(String(row.expectedBalance)) : null,
    difference: row.difference != null ? parseFloat(String(row.difference)) : null,
    closeReason: (row.closeReason as string) ?? null,
    notes: (row.notes as string) ?? null,
    cashIn: sums.cashIn,
    cashOut: sums.cashOut,
    theoreticalBalance: sums.balance,
    paymentsToday,
  };
}

export async function getCashRegisterState(
  organizationId: string,
): Promise<CashRegisterState> {
  const open = await getOpenSessionRow(organizationId);
  if (!open) {
    // Dernière session fermée (aperçu)
    const { rows } = await pool.query(
      `SELECT
        s.id, s.status::text, s."openingFloat"::text, s."openedAt", s."openedById",
        s."closedAt", s."closedById", s."closingCounted"::text, s."expectedBalance"::text,
        s.difference::text, s."closeReason", s.notes,
        ou."firstName" AS "openFirst", ou."lastName" AS "openLast",
        cu."firstName" AS "closeFirst", cu."lastName" AS "closeLast"
       FROM "CashRegisterSession" s
       LEFT JOIN "User" ou ON ou.id = s."openedById"
       LEFT JOIN "User" cu ON cu.id = s."closedById"
       WHERE s."organizationId" = $1
       ORDER BY s."openedAt" DESC LIMIT 1`,
      [organizationId],
    );
    if (!rows[0]) return { session: null, transactions: [] };
    const session = await buildSessionSummary(organizationId, rows[0]);
    const txns = await listCashTransactions(organizationId, { sessionId: session.id, limit: 50 });
    return { session, transactions: txns };
  }

  const session = await buildSessionSummary(organizationId, open);
  const transactions = await listCashTransactions(organizationId, {
    sessionId: session.id,
    limit: 80,
  });
  return { session, transactions };
}

export async function listCashTransactions(
  organizationId: string,
  opts: { sessionId?: string; limit?: number },
): Promise<CashTxnItem[]> {
  const conditions = [`t."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;
  if (opts.sessionId) {
    conditions.push(`t."sessionId" = $${pi}`);
    params.push(opts.sessionId);
    pi++;
  }
  params.push(opts.limit ?? 50);
  const { rows } = await pool.query(
    `SELECT
      t.id, t."sessionId", t.type::text, t.amount::text, t.method::text,
      t.reason, t."paymentId", t."userId", t."createdAt",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "CashRegisterTransaction" t
     LEFT JOIN "User" u ON u.id = t."userId"
     WHERE ${conditions.join(" AND ")}
     ORDER BY t."createdAt" DESC
     LIMIT $${pi}`,
    params,
  );
  return rows.map((r) => mapCashTxn(r as Record<string, unknown>));
}

export async function openCashRegister(
  organizationId: string,
  input: OpenCashInput,
  userId: string,
): Promise<CashRegisterState> {
  const existing = await getOpenSessionRow(organizationId);
  if (existing) throw new Error("ALREADY_OPEN");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = newId("crs");
    await client.query(
      `INSERT INTO "CashRegisterSession" (
        id, "organizationId", "openedById", "openingFloat", status, notes, "updatedAt"
      ) VALUES ($1,$2,$3,$4,'OPEN'::"CashRegisterStatus",$5,NOW())`,
      [id, organizationId, userId, input.openingFloat, input.notes ?? null],
    );
    await client.query(
      `INSERT INTO "CashRegisterTransaction" (
        id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
      ) VALUES ($1,$2,$3,'OPENING'::"CashTxnType",$4,'CASH'::"PaymentMethod",$5,$6,$7)`,
      [
        newId("ctx"),
        organizationId,
        id,
        input.openingFloat,
        "Fond de caisse",
        userId,
        `open:${id}`,
      ],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) throw new Error("ALREADY_OPEN");
    throw e;
  } finally {
    client.release();
  }

  return getCashRegisterState(organizationId);
}

export async function closeCashRegister(
  organizationId: string,
  input: CloseCashInput,
  userId: string,
): Promise<CashRegisterState> {
  const open = await getOpenSessionRow(organizationId);
  if (!open) throw new Error("NO_OPEN_SESSION");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sums = await sumSessionCash(String(open.id), client);
    const expected = sums.balance;
    const difference =
      Math.round((input.countedAmount - expected) * 100) / 100;

    await client.query(
      `INSERT INTO "CashRegisterTransaction" (
        id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
      ) VALUES ($1,$2,$3,'CLOSING'::"CashTxnType",$4,'CASH'::"PaymentMethod",$5,$6,$7)`,
      [
        newId("ctx"),
        organizationId,
        open.id,
        0,
        input.reason,
        userId,
        `close:${open.id}`,
      ],
    );

    await client.query(
      `UPDATE "CashRegisterSession"
       SET status = 'CLOSED'::"CashRegisterStatus",
           "closedById" = $1,
           "closedAt" = NOW(),
           "closingCounted" = $2,
           "expectedBalance" = $3,
           difference = $4,
           "closeReason" = $5,
           "updatedAt" = NOW()
       WHERE id = $6`,
      [userId, input.countedAmount, expected, difference, input.reason, open.id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) throw new Error("ALREADY_CLOSED");
    throw e;
  } finally {
    client.release();
  }

  return getCashRegisterState(organizationId);
}

export async function createManualCashTxn(
  organizationId: string,
  input: ManualCashTxnInput,
  userId: string,
): Promise<CashTxnItem> {
  const open = await getOpenSessionRow(organizationId);
  if (!open) throw new Error("NO_OPEN_SESSION");

  const signed = input.type === "CASH_IN" ? Math.abs(input.amount) : -Math.abs(input.amount);
  const key = input.idempotencyKey ?? `manual:${open.id}:${input.type}:${signed}:${input.reason}:${Date.now()}`;

  const existing = await pool.query(
    `SELECT id FROM "CashRegisterTransaction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [organizationId, key],
  );
  if (existing.rows[0]) {
    const list = await listCashTransactions(organizationId, { sessionId: String(open.id), limit: 20 });
    const found = list.find((t) => t.id === existing.rows[0].id);
    if (found) return found;
  }

  const id = newId("ctx");
  await pool.query(
    `INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4::"CashTxnType",$5,'CASH'::"PaymentMethod",$6,$7,$8)`,
    [id, organizationId, open.id, input.type, signed, input.reason, userId, key],
  );

  const list = await listCashTransactions(organizationId, { sessionId: String(open.id), limit: 5 });
  const created = list.find((t) => t.id === id);
  if (!created) throw new Error("TXN_NOT_FOUND");
  return created;
}

async function insertCashTxnForPayment(
  client: PoolClient,
  opts: {
    organizationId: string;
    sessionId: string;
    type: "SALE" | "REFUND_OUT";
    amount: number;
    paymentId: string;
    userId: string | null;
    reason: string;
    idempotencyKey: string;
  },
) {
  const signed = opts.type === "SALE" ? Math.abs(opts.amount) : -Math.abs(opts.amount);
  await client.query(
    `INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "paymentId", "userId", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4::"CashTxnType",$5,'CASH'::"PaymentMethod",$6,$7,$8,$9)
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    [
      newId("ctx"),
      opts.organizationId,
      opts.sessionId,
      opts.type,
      signed,
      opts.reason,
      opts.paymentId,
      opts.userId,
      opts.idempotencyKey,
    ],
  );
}

export async function getAppointmentPaymentSummary(
  organizationId: string,
  appointmentId: string,
): Promise<AppointmentPaymentSummary | null> {
  const apt = await pool.query<{ price: string }>(
    `SELECT price::text FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,
    [appointmentId, organizationId],
  );
  if (!apt.rows[0]) return null;

  // Prefer invoice total (après promo) si facture émise
  const inv = await pool.query<{ total: string }>(
    `SELECT total::text FROM "Invoice"
     WHERE "appointmentId" = $1 AND "organizationId" = $2
       AND status <> 'VOID'
     ORDER BY "createdAt" DESC LIMIT 1`,
    [appointmentId, organizationId],
  );

  const payments = await listPayments(organizationId, { appointmentId, limit: 100 });
  const paid = payments
    .filter((p) => p.kind !== "REFUND" && p.status === "COMPLETED")
    .reduce((s, p) => s + p.amount, 0);
  const refunded = payments
    .filter((p) => p.kind === "REFUND" && p.status === "COMPLETED")
    .reduce((s, p) => s + p.amount, 0);
  const netPaid = Math.round((paid - refunded) * 100) / 100;
  const price =
    inv.rows[0] != null
      ? parseFloat(inv.rows[0].total) || 0
      : parseFloat(apt.rows[0].price) || 0;
  const remaining = Math.max(0, Math.round((price - netPaid) * 100) / 100);

  return {
    appointmentId,
    price,
    paid: Math.round(paid * 100) / 100,
    refunded: Math.round(refunded * 100) / 100,
    netPaid,
    remaining,
    payments,
  };
}

export async function listPayments(
  organizationId: string,
  opts: {
    page?: number;
    limit?: number;
    appointmentId?: string | null;
    customerId?: string | null;
  },
): Promise<PaymentItem[]> {
  const conditions = [`p."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;
  if (opts.appointmentId) {
    conditions.push(`p."appointmentId" = $${pi}`);
    params.push(opts.appointmentId);
    pi++;
  }
  if (opts.customerId) {
    conditions.push(`p."customerId" = $${pi}`);
    params.push(opts.customerId);
    pi++;
  }
  const limit = opts.limit ?? 40;
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT
      p.id, p."appointmentId", p."customerId", p.amount::text, p.method::text,
      p.kind::text, p.status::text, p."parentPaymentId", p."giftCardId", p.notes, p."userId",
      p."paidAt", p."createdAt",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast",
      s.name AS "serviceName",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "Payment" p
     LEFT JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "User" u ON u.id = p."userId"
     WHERE ${conditions.join(" AND ")}
     ORDER BY p."paidAt" DESC
     LIMIT $${pi}`,
    params,
  );
  return rows.map((r) => mapPaymentRow(r as Record<string, unknown>));
}

export async function getPaymentById(
  organizationId: string,
  paymentId: string,
): Promise<PaymentItem | null> {
  const { rows } = await pool.query(
    `SELECT
      p.id, p."appointmentId", p."customerId", p.amount::text, p.method::text,
      p.kind::text, p.status::text, p."parentPaymentId", p."giftCardId", p.notes, p."userId",
      p."paidAt", p."createdAt",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast",
      s.name AS "serviceName",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "Payment" p
     LEFT JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "User" u ON u.id = p."userId"
     WHERE p.id = $1 AND p."organizationId" = $2`,
    [paymentId, organizationId],
  );
  if (!rows[0]) return null;
  return mapPaymentRow(rows[0] as Record<string, unknown>);
}

/**
 * Crée un ou plusieurs paiements (multi-méthodes).
 * Si method=CASH → CashRegisterTransaction SALE (caisse ouverte obligatoire).
 */
export async function createPayments(
  organizationId: string,
  input: CreatePaymentsInput,
  userId: string,
): Promise<{ payments: PaymentItem[]; summary: AppointmentPaymentSummary }> {
  if (input.idempotencyKey) {
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM "Payment"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [organizationId, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      const summary = await getAppointmentPaymentSummary(organizationId, input.appointmentId);
      if (!summary) throw new Error("APPOINTMENT_NOT_FOUND");
      return { payments: summary.payments, summary };
    }
  }

  const apt = await pool.query<{
    id: string;
    customerId: string;
    price: string;
    status: string;
  }>(
    `SELECT id, "customerId", price::text, status::text
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,
    [input.appointmentId, organizationId],
  );
  if (!apt.rows[0]) throw new Error("APPOINTMENT_NOT_FOUND");

  const needsCash = input.items.some((i) => i.method === "CASH");
  const open = needsCash ? await getOpenSessionRow(organizationId) : null;
  if (needsCash && !open) throw new Error("NO_OPEN_SESSION");

  const summaryBefore = await getAppointmentPaymentSummary(organizationId, input.appointmentId);
  const totalNew = input.items.reduce((s, i) => s + i.amount, 0);
  if (summaryBefore && totalNew > summaryBefore.remaining + 0.01) {
    throw new Error("OVERPAY");
  }

  const createdIds: string[] = [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < input.items.length; i++) {
      const line = input.items[i];
      const id = newId("pay");
      const key =
        input.idempotencyKey && i === 0
          ? input.idempotencyKey
          : input.idempotencyKey
            ? `${input.idempotencyKey}:${i}`
            : null;

      let giftCardId: string | null = line.giftCardId ?? null;
      if (line.method === "GIFT_CARD") {
        const { redeemGiftCard } = await import("@/lib/db/gift-cards");
        const redeemed = await redeemGiftCard({
          organizationId,
          giftCardId: line.giftCardId,
          code: line.giftCardCode,
          amount: line.amount,
          paymentId: id,
          userId,
          client,
        });
        giftCardId = redeemed.giftCardId;
        // Montant réellement débité (plafonné au solde)
        if (Math.abs(redeemed.redeemed - line.amount) > 0.01) {
          line.amount = redeemed.redeemed;
        }
      }

      await client.query(
        `INSERT INTO "Payment" (
          id, "organizationId", "appointmentId", "customerId", amount, method, kind,
          status, "giftCardId", notes, "userId", "idempotencyKey", "paidAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6::"PaymentMethod",$7::"PaymentKind",
          'COMPLETED'::"PaymentStatus",$8,$9,$10,$11,NOW(),NOW()
        )`,
        [
          id,
          organizationId,
          input.appointmentId,
          apt.rows[0].customerId,
          line.amount,
          line.method,
          line.kind ?? "PAYMENT",
          giftCardId,
          input.notes ?? null,
          userId,
          key,
        ],
      );
      createdIds.push(id);

      if (line.method === "CASH" && open) {
        await insertCashTxnForPayment(client, {
          organizationId,
          sessionId: String(open.id),
          type: "SALE",
          amount: line.amount,
          paymentId: id,
          userId,
          reason: `Encaissement RDV`,
          idempotencyKey: `cashpay:${id}`,
        });
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e) && input.idempotencyKey) {
      const summary = await getAppointmentPaymentSummary(organizationId, input.appointmentId);
      if (!summary) throw new Error("APPOINTMENT_NOT_FOUND");
      return { payments: summary.payments, summary };
    }
    throw e;
  } finally {
    client.release();
  }

  const summary = await getAppointmentPaymentSummary(organizationId, input.appointmentId);
  if (!summary) throw new Error("APPOINTMENT_NOT_FOUND");
  const payments = summary.payments.filter((p) => createdIds.includes(p.id));

  // Mettre à jour le statut facture liée si elle existe
  try {
    const { refreshInvoiceStatusForAppointment } = await import("@/lib/db/invoices");
    await refreshInvoiceStatusForAppointment(organizationId, input.appointmentId);
  } catch {
    /* facture optionnelle */
  }

  // Fidélité : points sur montant réellement payé (idempotent par paymentId)
  try {
    const { earnPointsFromPayment } = await import("@/lib/db/loyalty");
    for (const p of payments) {
      if (p.kind === "REFUND") continue;
      await earnPointsFromPayment({
        organizationId,
        customerId: apt.rows[0].customerId,
        paymentId: p.id,
        amountMad: p.amount,
        appointmentId: input.appointmentId,
        userId,
      });
    }
  } catch (e) {
    console.error("[createPayments] loyalty earn", e);
  }

  try {
    const { notifyPaymentReceived } = await import("@/lib/notifications/emitter");
    const { PAYMENT_METHOD_LABEL } = await import("@/types/analytics");
    for (const p of payments) {
      if (p.kind !== "PAYMENT") continue;
      await notifyPaymentReceived(organizationId, {
        paymentId: p.id,
        appointmentId: input.appointmentId,
        amount: p.amount,
        method: PAYMENT_METHOD_LABEL[p.method] ?? p.method,
      });
    }
  } catch (e) {
    console.error("[createPayments] notification", e);
  }

  return { payments, summary };
}

export async function refundPayment(
  organizationId: string,
  paymentId: string,
  input: RefundPaymentInput,
  userId: string,
): Promise<PaymentItem> {
  if (input.idempotencyKey) {
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM "Payment"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [organizationId, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      const p = await getPaymentById(organizationId, existing.rows[0].id);
      if (p) return p;
    }
  }

  const original = await getPaymentById(organizationId, paymentId);
  if (!original) throw new Error("NOT_FOUND");
  if (original.kind === "REFUND") throw new Error("CANNOT_REFUND_REFUND");
  if (original.status !== "COMPLETED") throw new Error("NOT_REFUNDABLE");

  // Total déjà remboursé sur ce paiement
  const { rows: refundedRows } = await pool.query<{ t: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS t FROM "Payment"
     WHERE "parentPaymentId" = $1 AND kind = 'REFUND' AND status = 'COMPLETED'`,
    [paymentId],
  );
  const already = parseFloat(refundedRows[0]?.t ?? "0") || 0;
  if (input.amount > original.amount - already + 0.01) throw new Error("OVER_REFUND");

  const needsCash = input.method === "CASH";
  const open = needsCash ? await getOpenSessionRow(organizationId) : null;
  if (needsCash && !open) throw new Error("NO_OPEN_SESSION");

  const id = newId("pay");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "Payment" (
        id, "organizationId", "appointmentId", "customerId", amount, method, kind,
        status, "parentPaymentId", notes, "userId", "idempotencyKey", "paidAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6::"PaymentMethod",'REFUND'::"PaymentKind",
        'COMPLETED'::"PaymentStatus",$7,$8,$9,$10,NOW(),NOW()
      )`,
      [
        id,
        organizationId,
        original.appointmentId,
        original.customerId,
        input.amount,
        input.method,
        paymentId,
        input.reason ?? "Remboursement",
        userId,
        input.idempotencyKey ?? null,
      ],
    );

    if (needsCash && open) {
      await insertCashTxnForPayment(client, {
        organizationId,
        sessionId: String(open.id),
        type: "REFUND_OUT",
        amount: input.amount,
        paymentId: id,
        userId,
        reason: input.reason ?? "Remboursement espèces",
        idempotencyKey: `cashrefund:${id}`,
      });
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e) && input.idempotencyKey) {
      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM "Payment" WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
        [organizationId, input.idempotencyKey],
      );
      const p = existing.rows[0]
        ? await getPaymentById(organizationId, existing.rows[0].id)
        : null;
      if (p) return p;
    }
    throw e;
  } finally {
    client.release();
  }

  const created = await getPaymentById(organizationId, id);
  if (!created) throw new Error("NOT_FOUND");

  // Correction commission historisée (jamais de suppression du CommissionRecord)
  try {
    const { adjustCommissionsForRefund } = await import("@/lib/db/commissions");
    await adjustCommissionsForRefund({
      organizationId,
      appointmentId: original.appointmentId,
      refundPaymentId: id,
      refundAmount: input.amount,
      originalPaymentAmount: original.amount,
      actorId: userId,
      reason: input.reason ?? "Remboursement cliente",
    });
  } catch (e) {
    console.error("[refundPayment] commission adjustment", e);
  }

  // Fidélité : retrait points proportionnel (ledger ADJUSTMENT)
  if (original.customerId) {
    try {
      const { adjustPointsForRefund } = await import("@/lib/db/loyalty");
      await adjustPointsForRefund({
        organizationId,
        customerId: original.customerId,
        refundPaymentId: id,
        refundAmount: input.amount,
        originalPaymentAmount: original.amount,
        userId,
      });
    } catch (e) {
      console.error("[refundPayment] loyalty adjustment", e);
    }
  }

  try {
    const { notifyRefundCreated } = await import("@/lib/notifications/emitter");
    const { PAYMENT_METHOD_LABEL } = await import("@/types/analytics");
    if (original.appointmentId) {
      await notifyRefundCreated(organizationId, {
        paymentId: created.id,
        appointmentId: original.appointmentId,
        amount: created.amount,
        method: PAYMENT_METHOD_LABEL[created.method] ?? created.method,
      });
    }
  } catch (e) {
    console.error("[refundPayment] notification", e);
  }

  return created;
}

/** RDVs du jour avec solde restant (pour encaissement rapide) */
export async function listBillableAppointments(
  organizationId: string,
): Promise<
  {
    id: string;
    customerName: string;
    serviceName: string;
    price: number;
    remaining: number;
    status: string;
    startAt: string;
  }[]
> {
  const { rows } = await pool.query(
    `SELECT
      a.id, a.status::text, a.price::text, a."startAt",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast",
      s.name AS "serviceName",
      COALESCE((
        SELECT SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END)
        FROM "Payment" p
        WHERE p."appointmentId" = a.id AND p.status = 'COMPLETED'
      ), 0)::text AS "netPaid"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a.status IN ('COMPLETED', 'IN_PROGRESS', 'ARRIVED', 'CONFIRMED')
       AND a."startAt" >= date_trunc('day', NOW()) - INTERVAL '1 day'
       AND a."startAt" < date_trunc('day', NOW()) + INTERVAL '2 days'
     ORDER BY a."startAt" DESC
     LIMIT 40`,
    [organizationId],
  );

  return rows
    .map((r) => {
      const price = parseFloat(r.price) || 0;
      const netPaid = parseFloat(r.netPaid) || 0;
      const remaining = Math.max(0, Math.round((price - netPaid) * 100) / 100);
      return {
        id: r.id as string,
        customerName: `${r.customerFirst} ${r.customerLast}`.trim(),
        serviceName: r.serviceName as string,
        price,
        remaining,
        status: r.status as string,
        startAt: new Date(r.startAt as Date).toISOString(),
      };
    })
    .filter((r) => r.remaining > 0);
}
