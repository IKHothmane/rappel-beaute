import { Pool } from "pg";
import { emitNotification } from "@/lib/db/notifications";
import { computeStockAlert } from "@/types/inventory";
import type { Appointment } from "@/types/appointment";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function customerLabel(apt: Appointment): string {
  return apt.customerName.trim();
}

export async function notifyAppointmentCreated(
  organizationId: string,
  appointment: Appointment,
): Promise<void> {
  try {
    await emitNotification({
      organizationId,
      type: "APPOINTMENT_CREATED",
      eventKey: "appointment_created",
      title: "Nouveau rendez-vous",
      message: `${customerLabel(appointment)} — ${formatDateTime(appointment.startAt)}`,
      entityType: "Appointment",
      entityId: appointment.id,
      alsoStaffId: appointment.staffId,
      metadata: {
        customerName: customerLabel(appointment),
        serviceName: appointment.serviceName,
        startAt: appointment.startAt,
      },
    });
  } catch (e) {
    console.error("[notifyAppointmentCreated]", e);
  }
}

export async function notifyAppointmentStatusChange(
  organizationId: string,
  appointment: Appointment,
  previousStatus: Appointment["status"],
): Promise<void> {
  if (appointment.status === previousStatus) return;

  try {
    if (appointment.status === "CANCELLED") {
      await emitNotification({
        organizationId,
        type: "APPOINTMENT_CANCELLED",
        eventKey: "appointment_cancelled",
        title: "Rendez-vous annulé",
        message: `${customerLabel(appointment)} — ${formatDateTime(appointment.startAt)}`,
        entityType: "Appointment",
        entityId: appointment.id,
        alsoStaffId: appointment.staffId,
      });
    } else if (appointment.status === "NO_SHOW") {
      await emitNotification({
        organizationId,
        type: "APPOINTMENT_NO_SHOW",
        eventKey: "appointment_no_show",
        title: "No-show",
        message: `${customerLabel(appointment)} ne s'est pas présentée`,
        entityType: "Appointment",
        entityId: appointment.id,
        alsoStaffId: appointment.staffId,
      });
    }
  } catch (e) {
    console.error("[notifyAppointmentStatusChange]", e);
  }
}

export async function notifyPaymentReceived(
  organizationId: string,
  opts: {
    paymentId: string;
    appointmentId: string;
    amount: number;
    method: string;
  },
): Promise<void> {
  try {
    await emitNotification({
      organizationId,
      type: "PAYMENT_RECEIVED",
      eventKey: "payment_received",
      title: "Paiement reçu",
      message: `${opts.amount.toLocaleString("fr-MA")} MAD — ${opts.method}`,
      entityType: "Payment",
      entityId: opts.paymentId,
      metadata: { appointmentId: opts.appointmentId, amount: opts.amount, method: opts.method },
    });
  } catch (e) {
    console.error("[notifyPaymentReceived]", e);
  }
}

export async function notifyRefundCreated(
  organizationId: string,
  opts: {
    paymentId: string;
    appointmentId: string;
    amount: number;
    method: string;
  },
): Promise<void> {
  try {
    await emitNotification({
      organizationId,
      type: "REFUND_CREATED",
      eventKey: "refund_created",
      title: "Remboursement",
      message: `${opts.amount.toLocaleString("fr-MA")} MAD — ${opts.method}`,
      entityType: "Payment",
      entityId: opts.paymentId,
      metadata: { appointmentId: opts.appointmentId, amount: opts.amount },
    });
  } catch (e) {
    console.error("[notifyRefundCreated]", e);
  }
}

export async function notifyExpenseCreated(
  organizationId: string,
  opts: { expenseId: string; amount: number; category: string; description?: string | null },
): Promise<void> {
  try {
    await emitNotification({
      organizationId,
      type: "EXPENSE_CREATED",
      eventKey: "expense_created",
      title: "Dépense enregistrée",
      message: `${opts.amount.toLocaleString("fr-MA")} MAD — ${opts.category}${opts.description ? ` · ${opts.description}` : ""}`,
      entityType: "Expense",
      entityId: opts.expenseId,
      metadata: { amount: opts.amount, category: opts.category },
    });
  } catch (e) {
    console.error("[notifyExpenseCreated]", e);
  }
}

export async function checkStockAndNotify(
  organizationId: string,
  productId: string,
): Promise<void> {
  try {
    const { rows } = await pool.query<{
      name: string;
      stock: string;
      minStock: string;
      unit: string;
      nearestExpiry: Date | null;
    }>(
      `SELECT p.name, p.stock::text, p."minStock"::text, p.unit::text,
              (SELECT MIN(l."expiresAt") FROM "ProductLot" l
               WHERE l."productId" = p.id AND l."expiresAt" IS NOT NULL
                 AND l.quantity > 0) AS "nearestExpiry"
       FROM "Product" p
       WHERE p.id = $1 AND p."organizationId" = $2 AND p."deletedAt" IS NULL`,
      [productId, organizationId],
    );
    const product = rows[0];
    if (!product) return;

    const stock = parseFloat(product.stock) || 0;
    const minStock = parseFloat(product.minStock) || 0;
    const alert = computeStockAlert(stock, minStock, product.nearestExpiry);

    if (alert === "OUT") {
      await emitNotification({
        organizationId,
        type: "STOCK_OUT",
        eventKey: "stock_out",
        title: "Rupture de stock",
        message: `${product.name} — stock : 0 ${product.unit}`,
        entityType: "Product",
        entityId: productId,
        metadata: { stock: 0, unit: product.unit, productName: product.name },
      });
    } else if (alert === "LOW") {
      await emitNotification({
        organizationId,
        type: "STOCK_LOW",
        eventKey: "stock_low",
        title: "Stock faible",
        message: `${product.name} — stock : ${stock} ${product.unit}`,
        entityType: "Product",
        entityId: productId,
        metadata: { stock, minStock, unit: product.unit, productName: product.name },
      });
    } else if (alert === "EXPIRING") {
      await emitNotification({
        organizationId,
        type: "PRODUCT_EXPIRING",
        eventKey: "product_expiring",
        title: "Produit bientôt expiré",
        message: `${product.name} expire bientôt`,
        entityType: "Product",
        entityId: productId,
        metadata: {
          productName: product.name,
          nearestExpiry: product.nearestExpiry?.toISOString() ?? null,
        },
      });
    }
  } catch (e) {
    console.error("[checkStockAndNotify]", e);
  }
}

export async function notifyReviewPending(
  organizationId: string,
  opts: { reviewRequestId: string; customerName: string },
): Promise<void> {
  try {
    await emitNotification({
      organizationId,
      type: "REVIEW_PENDING",
      eventKey: "review_pending",
      title: "Avis en attente",
      message: `Demande d'avis pour ${opts.customerName}`,
      entityType: "ReviewRequest",
      entityId: opts.reviewRequestId,
    });
  } catch (e) {
    console.error("[notifyReviewPending]", e);
  }
}
