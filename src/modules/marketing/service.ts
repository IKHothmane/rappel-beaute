import type { CampaignChannel, CampaignDetail, CampaignKpis, CampaignListItem, CampaignPreviewResult, CampaignRecipientItem, CampaignSegmentFilters, CreateCampaignInput } from "@/types/campaign";
import { CAMPAIGN_CHANNEL_LABEL, CAMPAIGN_STATUS_LABEL } from "@/types/campaign";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function listCampaigns(): Promise<{ items: CampaignListItem[]; kpis: CampaignKpis }> {
  const res = await fetch("/api/campaigns/", fetchOpts);
  return parseJson(res);
}

export async function previewCampaignAudience(input: {
  channel: CampaignChannel;
  messageTemplate: string;
  segmentFilters: CampaignSegmentFilters;
  promotionId?: string | null;
}): Promise<CampaignPreviewResult> {
  const res = await fetch("/api/campaigns/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "preview", ...input }),
  });
  return parseJson(res);
}

export async function createCampaign(input: CreateCampaignInput) {
  const res = await fetch("/api/campaigns/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, campaign: data as CampaignListItem };
}

export async function prepareCampaign(id: string) {
  const res = await fetch(`/api/campaigns/${id}/prepare/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, result: data as { prepared: number; skipped: number; campaign: CampaignDetail } };
}

export async function listCampaignRecipients(id: string): Promise<CampaignRecipientItem[]> {
  const res = await fetch(`/api/campaigns/${id}/recipients/`, fetchOpts);
  const data = await parseJson<{ data: CampaignRecipientItem[] }>(res);
  return data.data;
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}

export { CAMPAIGN_STATUS_LABEL, CAMPAIGN_CHANNEL_LABEL };

