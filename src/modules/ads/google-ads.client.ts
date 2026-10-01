const ADS_API_VERSION = "v21";

export type GoogleAdsCampaignRow = {
  externalId: string;
  resourceName: string;
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

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export function googleAdsConfig() {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() ?? "";
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() ?? "";
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() ?? "";
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/\D/g, "");
  const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "").replace(/\D/g, "");
  const connected = Boolean(developerToken && clientId && clientSecret && refreshToken && customerId);
  return { developerToken, clientId, clientSecret, refreshToken, customerId, loginCustomerId, connected };
}

export async function fetchGoogleAdsCampaigns(): Promise<GoogleAdsCampaignRow[]> {
  const cfg = googleAdsConfig();
  if (!cfg.connected) {
    throw new Error("Google Ads n'est pas connecté.");
  }
  const [today, month] = await Promise.all([
    search(cfg, campaignQuery("TODAY")),
    search(cfg, campaignQuery("THIS_MONTH")),
  ]);
  const byId = new Map<string, GoogleAdsCampaignRow>();
  for (const row of today) {
    byId.set(row.externalId, { ...row, monthSpendDh: 0 });
  }
  for (const row of month) {
    const current = byId.get(row.externalId);
    if (!current) {
      byId.set(row.externalId, { ...row, todaySpendDh: 0, clicks: 0, impressions: 0, googleConversions: 0, cpcDh: 0, ctr: 0 });
      continue;
    }
    current.monthSpendDh = row.monthSpendDh;
    if (!current.budgetResourceName) current.budgetResourceName = row.budgetResourceName;
    if (!current.dailyBudgetDh) current.dailyBudgetDh = row.dailyBudgetDh;
  }
  return [...byId.values()];
}

export async function mutateCampaignStatus(externalId: string, status: "ENABLED" | "PAUSED") {
  const cfg = googleAdsConfig();
  if (!cfg.connected) throw new Error("Google Ads n'est pas connecté.");
  const resourceName = `customers/${cfg.customerId}/campaigns/${externalId}`;
  await mutate(cfg, "campaigns", {
    operations: [{ update: { resourceName, status }, updateMask: "status" }],
  });
}

export async function mutateCampaignBudget(budgetResourceName: string, amountDh: number) {
  const cfg = googleAdsConfig();
  if (!cfg.connected) throw new Error("Google Ads n'est pas connecté.");
  const amountMicros = String(Math.round(amountDh * 1_000_000));
  await mutate(cfg, "campaignBudgets", {
    operations: [
      {
        update: { resourceName: budgetResourceName, amountMicros },
        updateMask: "amount_micros",
      },
    ],
  });
}

function campaignQuery(period: "TODAY" | "THIS_MONTH") {
  return `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign_budget.resource_name,
      campaign_budget.amount_micros,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING ${period}
      AND campaign.status != 'REMOVED'
  `;
}

async function search(
  cfg: ReturnType<typeof googleAdsConfig>,
  query: string,
): Promise<GoogleAdsCampaignRow[]> {
  const accessToken = await accessTokenFor(cfg);
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${cfg.customerId}/googleAds:search`,
    {
      method: "POST",
      headers: adsHeaders(cfg, accessToken),
      body: JSON.stringify({ query }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    results?: GoogleAdsSearchRow[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || "Lecture Google Ads impossible.");
  }
  const periodIsMonth = query.includes("THIS_MONTH");
  return (data.results ?? []).map((row) => mapRow(row, periodIsMonth));
}

async function mutate(
  cfg: ReturnType<typeof googleAdsConfig>,
  resource: "campaigns" | "campaignBudgets",
  body: unknown,
) {
  const accessToken = await accessTokenFor(cfg);
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${cfg.customerId}/${resource}:mutate`,
    {
      method: "POST",
      headers: adsHeaders(cfg, accessToken),
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message || "Modification Google Ads impossible.");
  }
}

function adsHeaders(cfg: ReturnType<typeof googleAdsConfig>, accessToken: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": cfg.developerToken,
    "Content-Type": "application/json",
  };
  if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;
  return headers;
}

async function accessTokenFor(cfg: ReturnType<typeof googleAdsConfig>) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: cfg.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "Autorisation Google Ads impossible.");
  }
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

type GoogleAdsSearchRow = {
  campaign?: { id?: string; name?: string; status?: string; resourceName?: string };
  campaignBudget?: { resourceName?: string; amountMicros?: string };
  metrics?: { costMicros?: string; clicks?: string; impressions?: string; conversions?: number };
};

function mapRow(row: GoogleAdsSearchRow, month: boolean): GoogleAdsCampaignRow {
  const cost = micros(row.metrics?.costMicros);
  const clicks = Number(row.metrics?.clicks ?? 0);
  const impressions = Number(row.metrics?.impressions ?? 0);
  const status = row.campaign?.status === "ENABLED" ? "ACTIVE" : row.campaign?.status === "PAUSED" ? "PAUSED" : "UNKNOWN";
  return {
    externalId: String(row.campaign?.id ?? ""),
    resourceName: row.campaign?.resourceName ?? "",
    name: row.campaign?.name || "Campagne",
    status,
    budgetResourceName: row.campaignBudget?.resourceName ?? null,
    dailyBudgetDh: micros(row.campaignBudget?.amountMicros),
    todaySpendDh: month ? 0 : cost,
    monthSpendDh: month ? cost : 0,
    clicks: month ? 0 : clicks,
    impressions: month ? 0 : impressions,
    cpcDh: clicks > 0 && !month ? round(cost / clicks) : 0,
    ctr: impressions > 0 && !month ? round(clicks / impressions) : 0,
    googleConversions: month ? 0 : Number(row.metrics?.conversions ?? 0),
  };
}

function micros(value?: string) {
  return round(Number(value ?? 0) / 1_000_000);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
