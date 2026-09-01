import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import type {
  CreateExpenseInput,
  ExpenseDetail,
  ExpenseKpis,
  ExpenseListItem,
  UpdateExpenseInput,
} from "@/types/expense";
import type { PaymentMethod } from "@/types/finance";

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

function mapExpense(r: Record<string, unknown>): ExpenseListItem {
  return {
    id: String(r.id),
    category: r.category as ExpenseListItem["category"],
    amount: parseFloat(String(r.amount)) || 0,
    paymentMethod: r.paymentMethod as PaymentMethod,
    description: (r.description as string) ?? null,
    supplierId: (r.supplierId as string) ?? null,
    supplierName: (r.supplierName as string) ?? null,
    expenseDate: new Date(r.expenseDate as Date).toISOString(),
    reference: (r.reference as string) ?? null,
    status: r.status as ExpenseListItem["status"],
    createdById: (r.createdById as string) ?? null,
    createdByName:
      r.userFirst || r.userLast
        ? `${r.userFirst ?? ""} ${r.userLast ?? ""}`.trim()
        : null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

const SELECT = `
  SELECT
    e.id, e.category::text, e.amount::text, e."paymentMethod"::text,
    e.description, e."supplierId", s.name AS "supplierName",
    e."expenseDate", e.reference, e.status::text, e."createdById",
    e."createdAt", e."updatedAt",
    u."firstName" AS "userFirst", u."lastName" AS "userLast"
  FROM "Expense" e
  LEFT JOIN "Supplier" s ON s.id = e."supplierId"
  LEFT JOIN "User" u ON u.id = e."createdById"
`;

export async function getExpenseKpis(organizationId: string): Promise<ExpenseKpis> {
  const { rows } = await pool.query<{
    monthTotal: string;
    todayTotal: string;
    prevMonthTotal: string;
  }>(
    `SELECT
      COALESCE(SUM(amount) FILTER (
        WHERE status = 'RECORDED'
          AND "expenseDate" >= date_trunc('month', NOW())
          AND "expenseDate" < date_trunc('month', NOW()) + INTERVAL '1 month'
          AND "deletedAt" IS NULL
      ), 0)::text AS "monthTotal",
      COALESCE(SUM(amount) FILTER (
        WHERE status = 'RECORDED'
          AND "expenseDate" >= date_trunc('day', NOW())
          AND "expenseDate" < date_trunc('day', NOW()) + INTERVAL '1 day'
          AND "deletedAt" IS NULL
      ), 0)::text AS "todayTotal",
      COALESCE(SUM(amount) FILTER (
        WHERE status = 'RECORDED'
          AND "expenseDate" >= date_trunc('month', NOW()) - INTERVAL '1 month'
          AND "expenseDate" < date_trunc('month', NOW())
          AND "deletedAt" IS NULL
      ), 0)::text AS "prevMonthTotal"
     FROM "Expense"
     WHERE "organizationId" = $1`,
    [organizationId],
  );
  const monthTotal = parseFloat(rows[0]?.monthTotal ?? "0") || 0;
  const todayTotal = parseFloat(rows[0]?.todayTotal ?? "0") || 0;
  const prevMonthTotal = parseFloat(rows[0]?.prevMonthTotal ?? "0") || 0;
  const evolutionPct =
    prevMonthTotal > 0
      ? Math.round(((monthTotal - prevMonthTotal) / prevMonthTotal) * 1000) / 10
      : monthTotal > 0
        ? 100
        : null;
  return {
    monthTotal: Math.round(monthTotal * 100) / 100,
    todayTotal: Math.round(todayTotal * 100) / 100,
    prevMonthTotal: Math.round(prevMonthTotal * 100) / 100,
    evolutionPct,
  };
}

export async function listExpenses(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    category?: string | null;
    method?: string | null;
    supplierId?: string | null;
    from?: string | null;
    to?: string | null;
    minAmount?: number | null;
    maxAmount?: number | null;
    includeVoid?: boolean;
  },
): Promise<{ items: ExpenseListItem[]; total: number; kpis: ExpenseKpis }> {
  const conditions = [`e."organizationId" = $1`, `e."deletedAt" IS NULL`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (!opts.includeVoid) {
    conditions.push(`e.status = 'RECORDED'`);
  }
  if (opts.category) {
    conditions.push(`e.category = $${pi}::"ExpenseCategory"`);
    params.push(opts.category);
    pi++;
  }
  if (opts.method) {
    conditions.push(`e."paymentMethod" = $${pi}::"PaymentMethod"`);
    params.push(opts.method);
    pi++;
  }
  if (opts.supplierId) {
    conditions.push(`e."supplierId" = $${pi}`);
    params.push(opts.supplierId);
    pi++;
  }
  if (opts.from) {
    conditions.push(`e."expenseDate" >= $${pi}::timestamptz`);
    params.push(opts.from);
    pi++;
  }
  if (opts.to) {
    conditions.push(`e."expenseDate" < ($${pi}::date + INTERVAL '1 day')`);
    params.push(opts.to);
    pi++;
  }
  if (opts.minAmount != null) {
    conditions.push(`e.amount >= $${pi}`);
    params.push(opts.minAmount);
    pi++;
  }
  if (opts.maxAmount != null) {
    conditions.push(`e.amount <= $${pi}`);
    params.push(opts.maxAmount);
    pi++;
  }
  if (opts.search) {
    conditions.push(
      `(COALESCE(e.description,'') ILIKE $${pi} OR COALESCE(e.reference,'') ILIKE $${pi} OR COALESCE(s.name,'') ILIKE $${pi})`,
    );
    params.push(`%${opts.search}%`);
    pi++;
  }

  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;

  const [countRes, listRes, kpis] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM "Expense" e
       LEFT JOIN "Supplier" s ON s.id = e."supplierId"
       WHERE ${where}`,
      params,
    ),
    pool.query(
      `${SELECT}
       WHERE ${where}
       ORDER BY e."expenseDate" DESC, e."createdAt" DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
    getExpenseKpis(organizationId),
  ]);

  return {
    items: listRes.rows.map((r) => mapExpense(r as Record<string, unknown>)),
    total: countRes.rows[0]?.total ?? 0,
    kpis,
  };
}

export async function getExpenseById(
  organizationId: string,
  expenseId: string,
): Promise<ExpenseDetail | null> {
  const { rows } = await pool.query(
    `${SELECT}
     WHERE e.id = $1 AND e."organizationId" = $2 AND e."deletedAt" IS NULL`,
    [expenseId, organizationId],
  );
  if (!rows[0]) return null;
  return {
    ...mapExpense(rows[0] as Record<string, unknown>),
    updatedAt: new Date(rows[0].updatedAt as Date).toISOString(),
  };
}

async function getOpenCashSessionId(
  organizationId: string,
  client: PoolClient,
): Promise<string | null> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM "CashRegisterSession"
     WHERE "organizationId" = $1 AND status = 'OPEN'
     LIMIT 1`,
    [organizationId],
  );
  return rows[0]?.id ?? null;
}

async function postCashExpense(
  client: PoolClient,
  opts: {
    organizationId: string;
    sessionId: string;
    expenseId: string;
    amount: number;
    userId: string | null;
    reason: string;
    idempotencyKey: string;
    type?: "EXPENSE" | "CASH_IN";
  },
) {
  const signed =
    opts.type === "CASH_IN" ? Math.abs(opts.amount) : -Math.abs(opts.amount);
  await client.query(
    `INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
    ) VALUES (
      $1,$2,$3,$4::"CashTxnType",$5,'CASH'::"PaymentMethod",$6,$7,$8
    )
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    [
      newId("ctx"),
      opts.organizationId,
      opts.sessionId,
      opts.type ?? "EXPENSE",
      signed,
      opts.reason,
      opts.userId,
      opts.idempotencyKey,
    ],
  );
}

export async function createExpense(
  organizationId: string,
  input: CreateExpenseInput,
  actor: { id: string; name?: string | null },
): Promise<ExpenseDetail> {
  const needsCash = input.paymentMethod === "CASH";
  const client = await pool.connect();
  const id = newId("exp");

  try {
    await client.query("BEGIN");

    let sessionId: string | null = null;
    if (needsCash) {
      sessionId = await getOpenCashSessionId(organizationId, client);
      if (!sessionId) throw new Error("NO_OPEN_SESSION");
    }

    await client.query(
      `INSERT INTO "Expense" (
        id, "organizationId", category, amount, "paymentMethod", description,
        "supplierId", "expenseDate", reference, status, "createdById", "updatedAt"
      ) VALUES (
        $1,$2,$3::"ExpenseCategory",$4,$5::"PaymentMethod",$6,
        $7,$8,$9,'RECORDED'::"ExpenseStatus",$10,NOW()
      )`,
      [
        id,
        organizationId,
        input.category,
        input.amount,
        input.paymentMethod,
        input.description ?? null,
        input.supplierId ?? null,
        new Date(input.expenseDate),
        input.reference ?? null,
        actor.id,
      ],
    );

    if (needsCash && sessionId) {
      await postCashExpense(client, {
        organizationId,
        sessionId,
        expenseId: id,
        amount: input.amount,
        userId: actor.id,
        reason: input.description ?? `Dépense ${input.category}`,
        idempotencyKey: `expense:${id}`,
      });
    }

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Expense",
      entityId: id,
      action: "CREATE",
      after: input,
      client,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const detail = await getExpenseById(organizationId, id);
  if (!detail) throw new Error("NOT_FOUND");

  try {
    const { notifyExpenseCreated } = await import("@/lib/notifications/emitter");
    await notifyExpenseCreated(organizationId, {
      expenseId: id,
      amount: input.amount,
      category: input.category,
      description: input.description,
    });
  } catch (e) {
    console.error("[createExpense] notification", e);
  }

  return detail;
}

export async function updateExpense(
  organizationId: string,
  expenseId: string,
  input: UpdateExpenseInput,
  actor: { id: string; name?: string | null },
): Promise<ExpenseDetail> {
  const existing = await getExpenseById(organizationId, expenseId);
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status === "VOID") throw new Error("VOIDED");

  const next = {
    category: input.category ?? existing.category,
    amount: input.amount ?? existing.amount,
    paymentMethod: input.paymentMethod ?? existing.paymentMethod,
    description:
      input.description !== undefined ? input.description : existing.description,
    supplierId:
      input.supplierId !== undefined ? input.supplierId : existing.supplierId,
    expenseDate: input.expenseDate ?? existing.expenseDate,
    reference: input.reference !== undefined ? input.reference : existing.reference,
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE "Expense" SET
        category = $1::"ExpenseCategory",
        amount = $2,
        "paymentMethod" = $3::"PaymentMethod",
        description = $4,
        "supplierId" = $5,
        "expenseDate" = $6,
        reference = $7,
        "updatedAt" = NOW()
       WHERE id = $8 AND "organizationId" = $9`,
      [
        next.category,
        next.amount,
        next.paymentMethod,
        next.description,
        next.supplierId,
        new Date(next.expenseDate),
        next.reference,
        expenseId,
        organizationId,
      ],
    );

    // Ajustement caisse si méthode/montant espèces change
    const wasCash = existing.paymentMethod === "CASH";
    const isCash = next.paymentMethod === "CASH";
    const amountChanged = existing.amount !== next.amount;
    const methodChanged = existing.paymentMethod !== next.paymentMethod;

    if (wasCash || isCash) {
      const sessionId = await getOpenCashSessionId(organizationId, client);
      if ((isCash || wasCash) && !sessionId && (amountChanged || methodChanged)) {
        throw new Error("NO_OPEN_SESSION");
      }
      if (sessionId) {
        if (wasCash && (!isCash || amountChanged || methodChanged)) {
          // Remettre l'ancien montant en caisse
          await postCashExpense(client, {
            organizationId,
            sessionId,
            expenseId,
            amount: existing.amount,
            userId: actor.id,
            reason: `Correction / annulation effet caisse ${expenseId}`,
            idempotencyKey: `expense:rev:${expenseId}:${existing.amount}:${Date.now()}`,
            type: "CASH_IN",
          });
        }
        if (isCash && (amountChanged || methodChanged || !wasCash)) {
          await postCashExpense(client, {
            organizationId,
            sessionId,
            expenseId,
            amount: next.amount,
            userId: actor.id,
            reason: next.description ?? `Dépense ${next.category}`,
            idempotencyKey: `expense:upd:${expenseId}:${next.amount}:${Date.now()}`,
          });
        }
      }
    }

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Expense",
      entityId: expenseId,
      action: "UPDATE",
      before: {
        amount: existing.amount,
        category: existing.category,
        paymentMethod: existing.paymentMethod,
        description: existing.description,
      },
      after: next,
      client,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const detail = await getExpenseById(organizationId, expenseId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export async function voidExpense(
  organizationId: string,
  expenseId: string,
  actor: { id: string; name?: string | null },
  reason?: string,
): Promise<ExpenseDetail> {
  const existing = await getExpenseById(organizationId, expenseId);
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status === "VOID") return existing;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE "Expense"
       SET status = 'VOID'::"ExpenseStatus",
           "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,
      [expenseId, organizationId],
    );

    if (existing.paymentMethod === "CASH") {
      const sessionId = await getOpenCashSessionId(organizationId, client);
      if (!sessionId) throw new Error("NO_OPEN_SESSION");
      await postCashExpense(client, {
        organizationId,
        sessionId,
        expenseId,
        amount: existing.amount,
        userId: actor.id,
        reason: reason ?? `Annulation dépense ${expenseId}`,
        idempotencyKey: `expense:void:${expenseId}`,
        type: "CASH_IN",
      });
    }

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Expense",
      entityId: expenseId,
      action: "VOID",
      before: { amount: existing.amount, status: existing.status },
      after: { status: "VOID", reason: reason ?? null },
      client,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const detail = await getExpenseById(organizationId, expenseId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}
