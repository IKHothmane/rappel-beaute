export type ReviewRequestStatus = "PENDING" | "SENT" | "SKIPPED" | "CANCELLED" | "RECORDED";

export type ReviewSatisfaction = "VERY_SATISFIED" | "SATISFIED" | "DISSATISFIED";

export const REVIEW_STATUS_LABEL: Record<ReviewRequestStatus, string> = {
  PENDING: "À envoyer",
  SENT: "Envoyé",
  SKIPPED: "Ignoré",
  CANCELLED: "Annulé",
  RECORDED: "Enregistré",
};

export const REVIEW_SATISFACTION_LABEL: Record<ReviewSatisfaction, string> = {
  VERY_SATISFIED: "Très satisfaite",
  SATISFIED: "Satisfaite",
  DISSATISFIED: "Insatisfaite",
};

export const REVIEW_SATISFACTION_EMOJI: Record<ReviewSatisfaction, string> = {
  VERY_SATISFIED: "😊",
  SATISFIED: "😐",
  DISSATISFIED: "😞",
};

/** Score interne pour moyenne (enregistrement manuel uniquement) */
export const REVIEW_SATISFACTION_SCORE: Record<ReviewSatisfaction, number> = {
  VERY_SATISFIED: 5,
  SATISFIED: 4,
  DISSATISFIED: 1,
};

export type ReviewSettings = {
  googleReviewUrl: string | null;
  delayHours: number;
  maxWindowHours: number;
  enabled: boolean;
};

export type ReviewKpis = {
  pendingToSend: number;
  sentThisMonth: number;
  recordedCount: number;
  averageScore: number | null;
  satisfiedPercent: number | null;
};

export type ReviewRequestItem = {
  id: string;
  status: ReviewRequestStatus;
  customerId: string;
  customerName: string;
  appointmentId: string;
  serviceName: string;
  completedAt: string;
  hoursSinceCompleted: number;
  messageSnapshot: string;
  phoneSnapshot: string;
  waLink: string;
  whatsappTaskId: string | null;
  sentAt: string | null;
  satisfaction: ReviewSatisfaction | null;
  satisfactionRecordedAt: string | null;
  googleReviewUrl: string | null;
};

export type UpdateReviewSettingsInput = Partial<ReviewSettings>;

export type ReviewAlertItem = {
  reviewRequestId: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  satisfaction: ReviewSatisfaction;
  recordedAt: string;
};
