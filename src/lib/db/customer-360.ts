import { randomBytes } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { getCustomerById } from "@/lib/db/customers";
import type {
  CreateCustomerNoteInput,
  Customer360Stats,
  CustomerNoteItem,
  CustomerTimelineEvent,
  CustomerTimelineKind,
  UpdateCustomerNoteInput,
} from "@/types/customer-360";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

/** Vérifie que la cliente appartient à l'org et n'est pas soft-deleted. */
export async function assertCustomerInOrg(
  customerId: string,
  organizationId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [customerId, organizationId],
  );
  return Boolean(rows[0]);
}

/**
 * KPIs fiche 360 — calculés PostgreSQL uniquement.
 * LTV = paiements nets COMPLETED (paiements − refunds).
 */
export async function getCustomer360Stats(
  customerId: string,
  organizationId: string,
): Promise<Customer360Stats | null> {
  if (!(await assertCustomerInOrg(customerId, organizationId))) return null;

  const { rows: aptRows } = await pool.query<{
    visits: string;
    appointments: string;
    noShows: string;
    cancellations: string;
    lastVisitAt: Date | null;
    nextVisitAt: Date | null;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'COMPLETED')::text AS visits,
       COUNT(*)::text AS appointments,
       COUNT(*) FILTER (WHERE status = 'NO_SHOW')::text AS "noShows",
       COUNT(*) FILTER (WHERE status = 'CANCELLED')::text AS cancellations,
       MAX("startAt") FILTER (WHERE status = 'COMPLETED') AS "lastVisitAt",
       MIN("startAt") FILTER (
         WHERE status IN ('PENDING','CONFIRMED') AND "startAt" > NOW()
       ) AS "nextVisitAt"
     FROM "Appointment"
     WHERE "customerId" = $1 AND "organizationId" = $2`,
    [customerId, organizationId],
  );

  const { rows: payRows } = await pool.query<{ net: string }>(
    `SELECT COALESCE(SUM(
       CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END
     ), 0)::text AS net
     FROM "Payment"
     WHERE "customerId" = $1 AND "organizationId" = $2 AND status = 'COMPLETED'`,
    [customerId, organizationId],
  );

  const { rows: loyRows } = await pool.query<{ balance: number }>(
    `SELECT balance FROM "LoyaltyAccount"
     WHERE "customerId" = $1 AND "organizationId" = $2
     LIMIT 1`,
    [customerId, organizationId],
  );

  const { rows: pkgRows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "Package"
     WHERE "customerId" = $1 AND "organizationId" = $2
       AND status = 'ACTIVE'
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`,
    [customerId, organizationId],
  );

  const { rows: giftRows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "GiftCard"
     WHERE "organizationId" = $1
       AND status = 'ACTIVE'
       AND ("buyerCustomerId" = $2 OR "beneficiaryCustomerId" = $2)
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`,
    [organizationId, customerId],
  );

  const { rows: invRows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "Invoice"
     WHERE "customerId" = $1 AND "organizationId" = $2
       AND status IN ('DRAFT','ISSUED','PARTIALLY_PAID')`,
    [customerId, organizationId],
  );

  const visits = parseInt(aptRows[0]?.visits ?? "0", 10);
  const lifetimeNetRevenue = Math.round(parseFloat(payRows[0]?.net ?? "0") * 100) / 100;
  const averageTicket =
    visits > 0 ? Math.round((lifetimeNetRevenue / visits) * 100) / 100 : 0;

  return {
    lifetimeNetRevenue,
    visits,
    appointments: parseInt(aptRows[0]?.appointments ?? "0", 10),
    averageTicket,
    lastVisitAt: aptRows[0]?.lastVisitAt?.toISOString() ?? null,
    nextVisitAt: aptRows[0]?.nextVisitAt?.toISOString() ?? null,
    noShowCount: parseInt(aptRows[0]?.noShows ?? "0", 10),
    cancellationCount: parseInt(aptRows[0]?.cancellations ?? "0", 10),
    loyaltyPoints: loyRows[0]?.balance ?? 0,
    activePackages: parseInt(pkgRows[0]?.n ?? "0", 10),
    giftCardsActive: parseInt(giftRows[0]?.n ?? "0", 10),
    openInvoices: parseInt(invRows[0]?.n ?? "0", 10),
  };
}

function pushEvent(
  events: CustomerTimelineEvent[],
  e: Omit<CustomerTimelineEvent, "kind"> & { kind: CustomerTimelineKind },
) {
  events.push(e);
}

/** Timeline unifiée — chaque élément vient de PostgreSQL. */
export async function getCustomerTimeline(
  customerId: string,
  organizationId: string,
  limit = 80,
): Promise<CustomerTimelineEvent[] | null> {
  if (!(await assertCustomerInOrg(customerId, organizationId))) return null;

  const events: CustomerTimelineEvent[] = [];

  const [apts, pays, invoices, loyalty, wa, reviews, promos, packages, notes, gifts] =
    await Promise.all([
      pool.query<{
        id: string;
        startAt: Date;
        serviceName: string;
        price: string;
        status: string;
      }>(
        `SELECT a.id, a."startAt", s.name AS "serviceName", a.price::text, a.status::text
         FROM "Appointment" a
         JOIN "Service" s ON s.id = a."serviceId"
         WHERE a."customerId" = $1 AND a."organizationId" = $2
         ORDER BY a."startAt" DESC LIMIT 40`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        createdAt: Date;
        amount: string;
        kind: string;
        method: string;
        status: string;
      }>(
        `SELECT id, "createdAt", amount::text, kind::text, method::text, status::text
         FROM "Payment"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 40`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        createdAt: Date;
        number: string;
        total: string;
        status: string;
      }>(
        `SELECT id, "createdAt", number, total::text, status::text
         FROM "Invoice"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 30`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        createdAt: Date;
        points: string;
        type: string;
        reason: string | null;
      }>(
        `SELECT id, "createdAt", points::text, type::text, reason
         FROM "LoyaltyTransaction"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 30`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        scheduledFor: Date;
        type: string;
        status: string;
      }>(
        `SELECT id, "scheduledFor", type::text, status::text
         FROM "WhatsAppTask"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "scheduledFor" DESC LIMIT 30`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        createdAt: Date;
        status: string;
        satisfaction: string | null;
      }>(
        `SELECT id, "createdAt", status::text, satisfaction::text
         FROM "ReviewRequest"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 20`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        usedAt: Date;
        promoName: string;
        discount: string | null;
      }>(
        `SELECT pu.id, pu."createdAt" AS "usedAt", p.name AS "promoName",
                pu."discountAmount"::text AS discount
         FROM "PromotionUsage" pu
         JOIN "Promotion" p ON p.id = pu."promotionId"
         WHERE pu."customerId" = $1 AND pu."organizationId" = $2
         ORDER BY pu."createdAt" DESC LIMIT 20`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        createdAt: Date;
        name: string;
        status: string;
      }>(
        `SELECT id, "createdAt", name, status::text
         FROM "Package"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 20`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        createdAt: Date;
        content: string;
        authorName: string | null;
      }>(
        `SELECT n.id, n."createdAt", n.content,
                CASE WHEN u.id IS NULL THEN NULL
                     ELSE TRIM(CONCAT(u."firstName", ' ', NULLIF(u."lastName", ''))) END AS "authorName"
         FROM "CustomerNote" n
         LEFT JOIN "User" u ON u.id = n."authorId"
         WHERE n."customerId" = $1 AND n."organizationId" = $2 AND n."deletedAt" IS NULL
         ORDER BY n."createdAt" DESC LIMIT 30`,
        [customerId, organizationId],
      ),
      pool.query<{
        id: string;
        createdAt: Date;
        code: string;
        balance: string;
        status: string;
      }>(
        `SELECT id, "createdAt", code, balance::text, status::text
         FROM "GiftCard"
         WHERE "organizationId" = $1
           AND ("buyerCustomerId" = $2 OR "beneficiaryCustomerId" = $2)
         ORDER BY "createdAt" DESC LIMIT 20`,
        [organizationId, customerId],
      ),
    ]);

  for (const r of apts.rows) {
    pushEvent(events, {
      id: `apt_${r.id}`,
      kind: "APPOINTMENT",
      at: r.startAt.toISOString(),
      title: r.serviceName,
      subtitle: r.status,
      amount: parseFloat(r.price),
      meta: { appointmentId: r.id, status: r.status },
    });
  }
  for (const r of pays.rows) {
    const signed =
      r.kind === "REFUND" ? -parseFloat(r.amount) : parseFloat(r.amount);
    pushEvent(events, {
      id: `pay_${r.id}`,
      kind: "PAYMENT",
      at: r.createdAt.toISOString(),
      title: r.kind === "REFUND" ? "Remboursement" : "Paiement",
      subtitle: `${r.method} · ${r.status}`,
      amount: signed,
      meta: { paymentId: r.id, kind: r.kind },
    });
  }
  for (const r of invoices.rows) {
    pushEvent(events, {
      id: `inv_${r.id}`,
      kind: "INVOICE",
      at: r.createdAt.toISOString(),
      title: `Facture ${r.number}`,
      subtitle: r.status,
      amount: parseFloat(r.total),
      meta: { invoiceId: r.id },
    });
  }
  for (const r of loyalty.rows) {
    const pts = parseInt(r.points, 10);
    pushEvent(events, {
      id: `loy_${r.id}`,
      kind: "LOYALTY",
      at: r.createdAt.toISOString(),
      title: `Fidélité ${pts >= 0 ? "+" : ""}${pts} pts`,
      subtitle: r.reason ?? r.type,
      amount: null,
      meta: { type: r.type },
    });
  }
  for (const r of wa.rows) {
    pushEvent(events, {
      id: `wa_${r.id}`,
      kind: "WHATSAPP",
      at: r.scheduledFor.toISOString(),
      title: `WhatsApp · ${r.type}`,
      subtitle: r.status,
      amount: null,
      meta: { type: r.type, status: r.status },
    });
  }
  for (const r of reviews.rows) {
    pushEvent(events, {
      id: `rev_${r.id}`,
      kind: "REVIEW",
      at: r.createdAt.toISOString(),
      title: "Demande d'avis",
      subtitle: r.satisfaction ?? r.status,
      amount: null,
      meta: { status: r.status },
    });
  }
  for (const r of promos.rows) {
    pushEvent(events, {
      id: `promo_${r.id}`,
      kind: "PROMOTION",
      at: r.usedAt.toISOString(),
      title: r.promoName,
      subtitle: "Promotion utilisée",
      amount: r.discount != null ? parseFloat(r.discount) : null,
      meta: {},
    });
  }
  for (const r of packages.rows) {
    pushEvent(events, {
      id: `pkg_${r.id}`,
      kind: "PACKAGE",
      at: r.createdAt.toISOString(),
      title: r.name,
      subtitle: `Forfait · ${r.status}`,
      amount: null,
      meta: { status: r.status },
    });
  }
  for (const r of notes.rows) {
    pushEvent(events, {
      id: `note_${r.id}`,
      kind: "NOTE",
      at: r.createdAt.toISOString(),
      title: "Note interne",
      subtitle: r.authorName ?? r.content.slice(0, 80),
      amount: null,
      meta: { noteId: r.id },
    });
  }
  for (const r of gifts.rows) {
    pushEvent(events, {
      id: `gift_${r.id}`,
      kind: "GIFT_CARD",
      at: r.createdAt.toISOString(),
      title: `Carte cadeau ${r.code}`,
      subtitle: r.status,
      amount: parseFloat(r.balance),
      meta: { code: r.code },
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events.slice(0, limit);
}

function mapNote(r: Record<string, unknown>): CustomerNoteItem {
  return {
    id: String(r.id),
    customerId: String(r.customerId),
    content: String(r.content),
    authorId: (r.authorId as string) ?? null,
    authorName: (r.authorName as string) ?? null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
    updatedAt: new Date(r.updatedAt as Date).toISOString(),
  };
}

export async function listCustomerNotes(
  customerId: string,
  organizationId: string,
): Promise<CustomerNoteItem[] | null> {
  if (!(await assertCustomerInOrg(customerId, organizationId))) return null;

  const { rows } = await pool.query(
    `SELECT n.id, n."customerId", n.content, n."authorId",
            n."createdAt", n."updatedAt",
            CASE WHEN u.id IS NULL THEN NULL
                 ELSE TRIM(CONCAT(u."firstName", ' ', NULLIF(u."lastName", ''))) END AS "authorName"
     FROM "CustomerNote" n
     LEFT JOIN "User" u ON u.id = n."authorId"
     WHERE n."customerId" = $1 AND n."organizationId" = $2 AND n."deletedAt" IS NULL
     ORDER BY n."createdAt" DESC`,
    [customerId, organizationId],
  );
  return rows.map((r) => mapNote(r as Record<string, unknown>));
}

export async function createCustomerNote(
  customerId: string,
  organizationId: string,
  input: CreateCustomerNoteInput,
  actor: { id: string; name?: string | null },
): Promise<CustomerNoteItem | null> {
  if (!(await assertCustomerInOrg(customerId, organizationId))) return null;

  const content = input.content.trim();
  if (!content) throw new Error("EMPTY_CONTENT");

  const id = newId("cnote");
  await pool.query(
    `INSERT INTO "CustomerNote" (
      id, "organizationId", "customerId", "authorId", content, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,NOW())`,
    [id, organizationId, customerId, actor.id, content],
  );

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "CustomerNote",
    entityId: id,
    action: "CREATE",
    after: { customerId, content },
  });

  const list = await listCustomerNotes(customerId, organizationId);
  return list?.find((n) => n.id === id) ?? null;
}

export async function updateCustomerNote(
  noteId: string,
  customerId: string,
  organizationId: string,
  input: UpdateCustomerNoteInput,
  actor: { id: string; name?: string | null },
): Promise<CustomerNoteItem | null> {
  const { rows: beforeRows } = await pool.query<{
    id: string;
    content: string;
    customerId: string;
  }>(
    `SELECT id, content, "customerId" FROM "CustomerNote"
     WHERE id = $1 AND "organizationId" = $2 AND "customerId" = $3 AND "deletedAt" IS NULL`,
    [noteId, organizationId, customerId],
  );
  const before = beforeRows[0];
  if (!before) return null;

  const content = input.content.trim();
  if (!content) throw new Error("EMPTY_CONTENT");

  await pool.query(
    `UPDATE "CustomerNote" SET content = $1, "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3 AND "deletedAt" IS NULL`,
    [content, noteId, organizationId],
  );

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "CustomerNote",
    entityId: noteId,
    action: "UPDATE",
    before: { content: before.content },
    after: { content },
  });

  const list = await listCustomerNotes(customerId, organizationId);
  return list?.find((n) => n.id === noteId) ?? null;
}

export async function deleteCustomerNote(
  noteId: string,
  customerId: string,
  organizationId: string,
  actor: { id: string; name?: string | null },
): Promise<boolean> {
  const { rows: beforeRows } = await pool.query<{ id: string; content: string }>(
    `SELECT id, content FROM "CustomerNote"
     WHERE id = $1 AND "organizationId" = $2 AND "customerId" = $3 AND "deletedAt" IS NULL`,
    [noteId, organizationId, customerId],
  );
  const before = beforeRows[0];
  if (!before) return false;

  await pool.query(
    `UPDATE "CustomerNote" SET "deletedAt" = NOW(), "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [noteId, organizationId],
  );

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "CustomerNote",
    entityId: noteId,
    action: "DELETE",
    before: { content: before.content, customerId },
  });

  return true;
}

/** Enrichit le détail cliente avec stats 360 (sans casser l'API existante). */
export async function getCustomer360Bundle(
  customerId: string,
  organizationId: string,
): Promise<{
  customer: NonNullable<Awaited<ReturnType<typeof getCustomerById>>>;
  stats: Customer360Stats;
} | null> {
  const customer = await getCustomerById(customerId, organizationId);
  if (!customer) return null;
  const stats = await getCustomer360Stats(customerId, organizationId);
  if (!stats) return null;
  return { customer, stats };
}
