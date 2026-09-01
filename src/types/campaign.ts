export type CampaignChannel = "WHATSAPP" | "EMAIL";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type CampaignRecipientStatus = "PENDING" | "SENT" | "SKIPPED" | "CANCELLED";

export const CAMPAIGN_CHANNELS: CampaignChannel[] = ["WHATSAPP", "EMAIL"];

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
];

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  PAUSED: "En pause",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export const CAMPAIGN_CHANNEL_LABEL: Record<CampaignChannel, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
};

export type CampaignSegmentFilters = {
  /** Statuts CRM : NEW, ACTIVE, VIP, AT_RISK, INACTIVE */
  customerStatuses?: string[];
  minDaysSinceLastVisit?: number;
  maxDaysSinceLastVisit?: number;
  minVisits?: number;
  maxVisits?: number;
  minRevenue?: number;
  maxRevenue?: number;
  minAverageTicket?: number;
  /** A déjà eu un RDV COMPLETED avec ce service */
  serviceIds?: string[];
  loyaltyLevels?: string[];
  hasActivePackage?: boolean;
  packageExpiringSoon?: boolean;
  marketingWhatsapp?: boolean;
  marketingEmail?: boolean;
  noUpcomingAppointment?: boolean;
  excludeRecentMarketing?: boolean;
};

export type CampaignListItem = {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  audienceCount: number;
  pendingCount: number;
  sentCount: number;
  promotionId: string | null;
  promotionName: string | null;
  preparedAt: string | null;
  createdAt: string;
};

export type CampaignKpis = {
  activeCampaigns: number;
  targetedCustomers: number;
  pendingMessages: number;
  sentMessages: number;
  attributedRevenue: number;
};

export type CampaignDetail = CampaignListItem & {
  messageTemplate: string;
  segmentFilters: CampaignSegmentFilters;
  scheduledFor: string | null;
  skippedCount: number;
  attributedRevenue: number;
};

export type CampaignPreviewResult = {
  eligibleCount: number;
  excludedCount: number;
  checks: string[];
  sampleMessage: string | null;
  sampleCustomer: { id: string; name: string } | null;
  customers: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    lastVisitAt: string | null;
    daysSinceLastVisit: number | null;
    excluded: boolean;
    excludeReason: string | null;
  }[];
};

export type CampaignRecipientItem = {
  id: string;
  customerId: string;
  customerName: string;
  status: CampaignRecipientStatus;
  messageSnapshot: string;
  phoneSnapshot: string | null;
  whatsappTaskId: string | null;
  sentAt: string | null;
};

export type CreateCampaignInput = {
  name: string;
  channel: CampaignChannel;
  messageTemplate: string;
  segmentFilters: CampaignSegmentFilters;
  promotionId?: string;
  scheduledFor?: string;
};

export type UpdateCampaignInput = {
  name?: string;
  status?: CampaignStatus;
  messageTemplate?: string;
  segmentFilters?: CampaignSegmentFilters;
  promotionId?: string | null;
  scheduledFor?: string | null;
};
