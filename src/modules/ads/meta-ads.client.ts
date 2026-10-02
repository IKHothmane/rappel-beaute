const GRAPH_VERSION = "v21.0";

export type MetaAdsCampaignRow = {
  externalId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "UNKNOWN";
  budgetResourceName: string | null;
  dailyBudgetDh: number;
  todaySpendDh: number;
  monthSpendDh: number;
  clicks: number;
  impressions: number;
  cpcDh: number;
  ctr: number;
  googleConversions: number;
};

type Insight = {
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  ctr?: string;
  actions?: { action_type?: string; value?: string }[];
};

export function metaAdsConfig() {
  const accessToken = process.env.META_ADS_ACCESS_TOKEN?.trim() ?? "";
  const accountId = (process.env.META_AD_ACCOUNT_ID ?? "").replace(/^act_/i, "").replace(/\D/g, "");
  const writesEnabled = process.env.META_ADS_WRITES_ENABLED === "true";
  const connected = Boolean(accessToken && accountId);
  return { accessToken, accountId, writesEnabled, connected };
}

export async function fetchMetaAdsCampaigns(): Promise<MetaAdsCampaignRow[]> {
  const cfg = metaAdsConfig();
  if (!cfg.connected) throw new Error("Meta Ads n'est pas connecté.");

  const campaigns = await graph<{ data?: { id?: string; name?: string; status?: string; daily_budget?: string }[] }>(
    cfg,
    `act_${cfg.accountId}/campaigns`,
    { fields: "id,name,status,daily_budget", limit: "100" },
  );

  const rows: MetaAdsCampaignRow[] = [];
  for (const campaign of campaigns.data ?? []) {
    if (!campaign.id) continue;
    const [today, month] = await Promise.all([
      campaignInsight(cfg, campaign.id, "today"),
      campaignInsight(cfg, campaign.id, "this_month"),
    ]);
    rows.push({
      externalId: campaign.id,
      name: campaign.name?.trim() || "Campagne Meta",
      status: mapStatus(campaign.status),
      budgetResourceName: campaign.daily_budget ? campaign.id : null,
      dailyBudgetDh: minorToMajor(campaign.daily_budget),
      todaySpendDh: money(today?.spend),
      monthSpendDh: money(month?.spend),
      clicks: integer(today?.clicks),
      impressions: integer(today?.impressions),
      cpcDh: money(today?.cpc),
      ctr: money(today?.ctr),
      googleConversions: conversions(today),
    });
  }
  return rows;
}

export async function mutateCampaignStatus(externalId: string, status: "ACTIVE" | "PAUSED") {
  const cfg = requireWrite(metaAdsConfig());
  await graph(cfg, externalId, { status }, "POST");
}

export async function mutateCampaignBudget(campaignId: string, amountDh: number) {
  const cfg = requireWrite(metaAdsConfig());
  const dailyBudget = String(Math.round(amountDh * 100));
  await graph(cfg, campaignId, { daily_budget: dailyBudget }, "POST");
}

function requireWrite(cfg: ReturnType<typeof metaAdsConfig>) {
  if (!cfg.connected) throw new Error("Meta Ads n'est pas connecté.");
  if (!cfg.writesEnabled) {
    throw new Error("Les écritures Meta Ads restent désactivées tant que les chiffres réels ne sont pas validés.");
  }
  return cfg;
}

async function campaignInsight(
  cfg: ReturnType<typeof metaAdsConfig>,
  campaignId: string,
  datePreset: "today" | "this_month",
) {
  const body = await graph<{ data?: Insight[] }>(cfg, `${campaignId}/insights`, {
    date_preset: datePreset,
    fields: "spend,impressions,clicks,cpc,ctr,actions",
  });
  return body.data?.[0] ?? null;
}

async function graph<T>(
  cfg: ReturnType<typeof metaAdsConfig>,
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  const init: RequestInit = { method };
  if (method === "GET") {
    url.searchParams.set("access_token", cfg.accessToken);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  } else {
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    init.body = new URLSearchParams({ access_token: cfg.accessToken, ...params }).toString();
  }
  const response = await fetch(url, init);
  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Lecture Meta Ads impossible.");
  }
  return data;
}

function mapStatus(status: string | undefined): MetaAdsCampaignRow["status"] {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "PAUSED") return "PAUSED";
  return "UNKNOWN";
}

function minorToMajor(value: string | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount) / 100;
}

function money(value: string | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function integer(value: string | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function conversions(insight: Insight | null) {
  if (!insight?.actions) return 0;
  const total = insight.actions.reduce((sum, action) => {
    const type = action.action_type ?? "";
    if (!/lead|complete_registration|subscribe/i.test(type)) return sum;
    return sum + Number(action.value ?? 0);
  }, 0);
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : 0;
}
