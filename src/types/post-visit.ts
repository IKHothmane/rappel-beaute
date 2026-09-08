export type PostVisitSettings = {
  enabled: boolean;
  defaultReturnDays: number;
  maxOverdueDays: number;
  minimumDaysBetweenMarketingMessages: number;
  respectFutureAppointments: boolean;
  respectOptIn: boolean;
  autoCreateWhatsAppTasks: boolean;
};

export type UpdatePostVisitSettingsInput = Partial<PostVisitSettings>;

export type PostVisitTaskStatus = "PENDING" | "SENT" | "SKIPPED" | "CANCELLED" | "UPCOMING";

export type PostVisitListItem = {
  appointmentId: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  serviceId: string;
  serviceName: string;
  lastVisitAt: string;
  recommendedAt: string;
  returnDays: number;
  status: PostVisitTaskStatus;
  statusLabel: string;
  whatsappTaskId: string | null;
  messagePreview: string | null;
  waLink: string | null;
  bookingUrl: string;
  blockReason: string | null;
  canPrepare: boolean;
};

export type PostVisitKpis = {
  eligible: number;
  prepared: number;
  sent: number;
  upcoming: number;
};

export type PostVisitAnalytics = {
  eligible: number;
  prepared: number;
  sent: number;
  bookingsAfter: number;
  completedAfter: number;
};

export const POST_VISIT_STATUS_LABEL: Record<PostVisitTaskStatus, string> = {
  PENDING: "À préparer",
  SENT: "Envoyée",
  SKIPPED: "Ignorée",
  CANCELLED: "Annulée",
  UPCOMING: "Planifiée",
};
