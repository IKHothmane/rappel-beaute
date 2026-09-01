export type NotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_NO_SHOW"
  | "PAYMENT_RECEIVED"
  | "REFUND_CREATED"
  | "EXPENSE_CREATED"
  | "STOCK_LOW"
  | "STOCK_OUT"
  | "PRODUCT_EXPIRING"
  | "STAFF_LEAVE"
  | "REVIEW_PENDING"
  | "PACKAGE_EXPIRING"
  | "LOYALTY_REWARD"
  | "CAMPAIGN_READY"
  | "SYSTEM";

export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL" | "SUCCESS";

export type NotificationItem = {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  href: string | null;
};

export type NotificationListResponse = {
  data: NotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  APPOINTMENT_CREATED: "Nouveau rendez-vous",
  APPOINTMENT_CANCELLED: "Rendez-vous annulé",
  APPOINTMENT_NO_SHOW: "No-show",
  PAYMENT_RECEIVED: "Paiement reçu",
  REFUND_CREATED: "Remboursement",
  EXPENSE_CREATED: "Dépense enregistrée",
  STOCK_LOW: "Stock faible",
  STOCK_OUT: "Rupture de stock",
  PRODUCT_EXPIRING: "Produit bientôt expiré",
  STAFF_LEAVE: "Congé employée",
  REVIEW_PENDING: "Avis en attente",
  PACKAGE_EXPIRING: "Forfait expirant",
  LOYALTY_REWARD: "Récompense fidélité",
  CAMPAIGN_READY: "Campagne prête",
  SYSTEM: "Système",
};
