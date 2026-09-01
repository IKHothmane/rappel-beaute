import type {
  CampaignChannel,
  CampaignSegmentFilters,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@/types/campaign";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES } from "@/types/campaign";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

function strArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter((x) => typeof x === "string") as string[];
  return arr.length ? arr : undefined;
}

export function parseSegmentFilters(raw: unknown): CampaignSegmentFilters {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    customerStatuses: strArray(o.customerStatuses),
    minDaysSinceLastVisit: num(o.minDaysSinceLastVisit),
    maxDaysSinceLastVisit: num(o.maxDaysSinceLastVisit),
    minVisits: num(o.minVisits),
    maxVisits: num(o.maxVisits),
    minRevenue: num(o.minRevenue),
    maxRevenue: num(o.maxRevenue),
    minAverageTicket: num(o.minAverageTicket),
    serviceIds: strArray(o.serviceIds),
    loyaltyLevels: strArray(o.loyaltyLevels),
    hasActivePackage: bool(o.hasActivePackage),
    packageExpiringSoon: bool(o.packageExpiringSoon),
    marketingWhatsapp: bool(o.marketingWhatsapp),
    marketingEmail: bool(o.marketingEmail),
    noUpcomingAppointment: bool(o.noUpcomingAppointment) ?? true,
    excludeRecentMarketing: bool(o.excludeRecentMarketing) ?? true,
  };
}

export function validateCreateCampaign(
  raw: Record<string, unknown>,
): { ok: true; data: CreateCampaignInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const name = str(raw.name);
  const channel = str(raw.channel) as CampaignChannel | undefined;
  const messageTemplate = str(raw.messageTemplate);
  if (!name) errors.push("name");
  if (!channel || !CAMPAIGN_CHANNELS.includes(channel)) errors.push("channel");
  if (!messageTemplate) errors.push("messageTemplate");
  if (errors.length || !name || !channel || !messageTemplate) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      channel,
      messageTemplate,
      segmentFilters: parseSegmentFilters(raw.segmentFilters),
      promotionId: str(raw.promotionId),
      scheduledFor: str(raw.scheduledFor),
    },
  };
}

export function validateUpdateCampaign(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateCampaignInput } | { ok: false; errors: string[] } {
  const data: UpdateCampaignInput = {};
  if (raw.name !== undefined) data.name = str(raw.name);
  if (raw.status !== undefined) {
    const s = str(raw.status) as CampaignStatus | undefined;
    if (s && CAMPAIGN_STATUSES.includes(s)) data.status = s;
  }
  if (raw.messageTemplate !== undefined) data.messageTemplate = str(raw.messageTemplate);
  if (raw.segmentFilters !== undefined) data.segmentFilters = parseSegmentFilters(raw.segmentFilters);
  if (raw.promotionId !== undefined) data.promotionId = str(raw.promotionId) ?? null;
  if (raw.scheduledFor !== undefined) data.scheduledFor = str(raw.scheduledFor) ?? null;
  return { ok: true, data };
}

export function validatePreviewBody(raw: Record<string, unknown>):
  | {
      ok: true;
      channel: CampaignChannel;
      messageTemplate: string;
      segmentFilters: CampaignSegmentFilters;
      promotionId: string | null;
    }
  | { ok: false; errors: string[] } {
  const channel = str(raw.channel) as CampaignChannel | undefined;
  const messageTemplate = str(raw.messageTemplate);
  if (!channel || !CAMPAIGN_CHANNELS.includes(channel) || !messageTemplate) {
    return { ok: false, errors: ["channel", "messageTemplate"] };
  }
  return {
    ok: true,
    channel,
    messageTemplate,
    segmentFilters: parseSegmentFilters(raw.segmentFilters),
    promotionId: str(raw.promotionId) ?? null,
  };
}
