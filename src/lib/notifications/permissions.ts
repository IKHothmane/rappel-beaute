import type { AppRole } from "@/lib/rbac";
import type { NotificationSeverity, NotificationType } from "@/types/notifications";

/** Rôles destinataires par type de notification — le frontend ne décide pas */
export function rolesForNotificationType(type: NotificationType): AppRole[] {
  switch (type) {
    case "STOCK_LOW":
    case "STOCK_OUT":
    case "PRODUCT_EXPIRING":
      return ["OWNER", "MANAGER"];
    case "APPOINTMENT_CREATED":
    case "APPOINTMENT_CANCELLED":
    case "APPOINTMENT_NO_SHOW":
    case "STAFF_LEAVE":
    case "REVIEW_PENDING":
    case "CAMPAIGN_READY":
      return ["OWNER", "MANAGER"];
    case "PAYMENT_RECEIVED":
      return ["OWNER", "ACCOUNTANT", "CASHIER"];
    case "REFUND_CREATED":
    case "EXPENSE_CREATED":
      return ["OWNER", "ACCOUNTANT"];
    case "PACKAGE_EXPIRING":
    case "LOYALTY_REWARD":
      return ["OWNER", "MANAGER"];
    case "SYSTEM":
      return ["OWNER", "MANAGER", "STAFF", "CASHIER", "ACCOUNTANT"];
    default:
      return ["OWNER"];
  }
}

export function severityForType(type: NotificationType): NotificationSeverity {
  switch (type) {
    case "STOCK_OUT":
    case "APPOINTMENT_NO_SHOW":
      return "CRITICAL";
    case "STOCK_LOW":
    case "PRODUCT_EXPIRING":
    case "APPOINTMENT_CANCELLED":
    case "REFUND_CREATED":
      return "WARNING";
    case "PAYMENT_RECEIVED":
    case "APPOINTMENT_CREATED":
      return "SUCCESS";
    default:
      return "INFO";
  }
}

export type NotificationFilterCategory = "all" | "unread" | "agenda" | "finance" | "stock";

export function typesForCategory(category: NotificationFilterCategory): NotificationType[] | null {
  switch (category) {
    case "agenda":
      return ["APPOINTMENT_CREATED", "APPOINTMENT_CANCELLED", "APPOINTMENT_NO_SHOW", "STAFF_LEAVE"];
    case "finance":
      return ["PAYMENT_RECEIVED", "REFUND_CREATED", "EXPENSE_CREATED"];
    case "stock":
      return ["STOCK_LOW", "STOCK_OUT", "PRODUCT_EXPIRING"];
    default:
      return null;
  }
}

export function buildNotificationHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "Product":
      return `/products/${entityId}/`;
    case "Appointment":
      return `/agenda/?appointmentId=${entityId}`;
    case "Payment":
      return `/payments/?paymentId=${entityId}`;
    case "Expense":
      return `/expenses/${entityId}/`;
    case "ReviewRequest":
      return `/reviews/?requestId=${entityId}`;
    case "Campaign":
      return `/marketing/?campaignId=${entityId}`;
    default:
      return typeof metadata?.href === "string" ? metadata.href : null;
  }
}

export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case "STOCK_LOW":
    case "STOCK_OUT":
    case "PRODUCT_EXPIRING":
      return "🔴";
    case "APPOINTMENT_CREATED":
    case "APPOINTMENT_CANCELLED":
    case "APPOINTMENT_NO_SHOW":
    case "STAFF_LEAVE":
      return "🟠";
    case "PAYMENT_RECEIVED":
    case "REFUND_CREATED":
    case "EXPENSE_CREATED":
      return "💰";
    case "REVIEW_PENDING":
      return "⭐";
    case "CAMPAIGN_READY":
      return "📣";
    case "LOYALTY_REWARD":
    case "PACKAGE_EXPIRING":
      return "🎁";
    default:
      return "🔔";
  }
}
