export type ReactivationBucket =
  | "ACTIVE"
  | "DAYS_30"
  | "DAYS_45"
  | "DAYS_60"
  | "DAYS_90"
  | "AT_RISK";

export const REACTIVATION_BUCKETS: ReactivationBucket[] = [
  "ACTIVE",
  "DAYS_30",
  "DAYS_45",
  "DAYS_60",
  "DAYS_90",
  "AT_RISK",
];

export const REACTIVATION_BUCKET_LABEL: Record<ReactivationBucket, string> = {
  ACTIVE: "Actives",
  DAYS_30: "30 jours",
  DAYS_45: "45 jours",
  DAYS_60: "60 jours",
  DAYS_90: "90 jours",
  AT_RISK: "À risque",
};

export type ReactivationSettings = {
  minimumDaysBetweenMarketingMessages: number;
  threshold30Enabled: boolean;
  threshold45Enabled: boolean;
  threshold60Enabled: boolean;
  threshold90Enabled: boolean;
  autoCreateWhatsAppTasks: boolean;
  promoCode30: string | null;
  promoCode45: string | null;
  promoCode60: string | null;
  promoCode90: string | null;
  promoDiscount30: string | null;
  promoDiscount45: string | null;
  promoDiscount60: string | null;
  promoDiscount90: string | null;
};

export type ReactivationKpis = {
  toRelance: number;
  days30: number;
  days45: number;
  days60: number;
  days90: number;
  days180: number;
  estimatedRevenue: number;
  inactiveCount: number;
  contactedCount: number;
  pendingCount: number;
  upcomingCount: number;
  returnedCount: number;
  recoveredRevenue: number;
  conversionPct: number | null;
  vipInactiveCount: number;
  highSpenderCount: number;
  firstVisitCount: number;
};

export const REACTIVATION_HIGH_SPEND = 3000;

export type ReactivationCustomerItem = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingWhatsapp: boolean;
  status: string;
  bucket: ReactivationBucket;
  daysSinceLastVisit: number;
  lastVisitAt: string;
  lastServiceName: string | null;
  lastStaffName: string | null;
  lastServicePrice: number | null;
  averageTicket: number;
  totalRevenue: number;
  visits: number;
  lastMarketingSentAt: string | null;
  hasUpcomingAppointment: boolean;
  isSnoozed: boolean;
  canPrepareWhatsApp: boolean;
  blockReason: string | null;
  pendingWhatsAppTaskId: string | null;
  suggestedPromoCode: string | null;
  suggestedPromoDiscount: string | null;
};

export type UpdateReactivationSettingsInput = Partial<ReactivationSettings>;
