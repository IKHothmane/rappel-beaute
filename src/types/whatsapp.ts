export type WhatsAppTaskType =
  | "APPOINTMENT_CONFIRMATION"
  | "APPOINTMENT_REMINDER"
  | "APPOINTMENT_FOLLOWUP"
  | "REACTIVATION"
  | "BIRTHDAY"
  | "REVIEW_REQUEST"
  | "PROMOTION"
  | "PACKAGE_EXPIRING"
  | "LOYALTY_REWARD"
  | "WAITING_LIST";

export type WhatsAppTaskStatus = "PENDING" | "SENT" | "SKIPPED" | "CANCELLED";

export type WhatsAppStaffOutcome =
  | "CUSTOMER_CONFIRMED"
  | "CUSTOMER_CANCELLED"
  | "NEEDS_FOLLOWUP";

export const WHATSAPP_TASK_TYPES: WhatsAppTaskType[] = [
  "APPOINTMENT_CONFIRMATION",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_FOLLOWUP",
  "REACTIVATION",
  "BIRTHDAY",
  "REVIEW_REQUEST",
  "PROMOTION",
  "PACKAGE_EXPIRING",
  "LOYALTY_REWARD",
  "WAITING_LIST",
];

export const WHATSAPP_TASK_TYPE_LABEL: Record<WhatsAppTaskType, string> = {
  APPOINTMENT_CONFIRMATION: "Confirmation RDV",
  APPOINTMENT_REMINDER: "Rappel RDV",
  APPOINTMENT_FOLLOWUP: "Suivi RDV",
  REACTIVATION: "Réactivation",
  BIRTHDAY: "Anniversaire",
  REVIEW_REQUEST: "Demande d'avis",
  PROMOTION: "Promotion",
  PACKAGE_EXPIRING: "Forfait expirant",
  LOYALTY_REWARD: "Récompense fidélité",
  WAITING_LIST: "Liste d'attente",
};

export const WHATSAPP_TASK_STATUS_LABEL: Record<WhatsAppTaskStatus, string> = {
  PENDING: "À envoyer",
  SENT: "Envoyé",
  SKIPPED: "Ignoré",
  CANCELLED: "Annulé",
};

export const WHATSAPP_OUTCOME_LABEL: Record<WhatsAppStaffOutcome, string> = {
  CUSTOMER_CONFIRMED: "Confirmée",
  CUSTOMER_CANCELLED: "Annulée",
  NEEDS_FOLLOWUP: "Relance",
};

/** Types nécessitant marketingWhatsapp = true */
export const WHATSAPP_MARKETING_TYPES = new Set<WhatsAppTaskType>([
  "REACTIVATION",
  "BIRTHDAY",
  "PROMOTION",
  "LOYALTY_REWARD",
  "PACKAGE_EXPIRING",
]);

export type WhatsAppTemplateItem = {
  id: string;
  name: string;
  type: WhatsAppTaskType;
  body: string;
  active: boolean;
  isDefault: boolean;
};

export type WhatsAppTaskItem = {
  id: string;
  type: WhatsAppTaskType;
  status: WhatsAppTaskStatus;
  messageSnapshot: string;
  phoneSnapshot: string;
  waLink: string;
  scheduledFor: string;
  sentAt: string | null;
  sentById: string | null;
  staffOutcome: WhatsAppStaffOutcome | null;
  outcomeAt: string | null;
  customerId: string;
  customerName: string;
  appointmentId: string | null;
  appointmentStartAt: string | null;
  serviceName: string | null;
  servicePrice: number | null;
  templateId: string | null;
};

export type WhatsAppKpis = {
  pendingToday: number;
  sentToday: number;
  confirmationsRecorded: number;
  cancellationsRecorded: number;
  followUpsRecorded: number;
};

export type CreateWhatsAppTemplateInput = {
  name: string;
  type: WhatsAppTaskType;
  body: string;
  active?: boolean;
  isDefault?: boolean;
};

export type UpdateWhatsAppTemplateInput = {
  id: string;
  name?: string;
  body?: string;
  active?: boolean;
  isDefault?: boolean;
};

export const WHATSAPP_TEMPLATE_VARIABLES = [
  "{{customer.firstName}}",
  "{{customer.lastName}}",
  "{{appointment.date}}",
  "{{appointment.time}}",
  "{{service.name}}",
  "{{service.price}}",
  "{{staff.firstName}}",
  "{{organization.name}}",
  "{{organization.phone}}",
  "{{organization.address}}",
  "{{organization.googleReviewUrl}}",
  "{{promotion.code}}",
  "{{package.remainingSessions}}",
  "{{loyalty.points}}",
  "{{lastVisit.date}}",
  "{{lastVisit.days}}",
  "{{lastService.name}}",
] as const;
