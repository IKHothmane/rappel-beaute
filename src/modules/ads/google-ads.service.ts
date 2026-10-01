import { fetchGoogleAdsCampaigns, googleAdsConfig } from "@/modules/ads/google-ads.client";
import { upsertAdsCampaign } from "@/modules/ads/ads-store";

export function adsConnectionStatus() {
  const cfg = googleAdsConfig();
  return {
    connected: cfg.connected,
    customerId: cfg.connected ? cfg.customerId : null,
  };
}

export async function syncGoogleAdsCampaigns() {
  const rows = await fetchGoogleAdsCampaigns();
  const saved = [];
  for (const row of rows) {
    if (!row.externalId) continue;
    saved.push(
      await upsertAdsCampaign({
        externalId: row.externalId,
        name: row.name,
        status: row.status,
        budgetResourceName: row.budgetResourceName,
        dailyBudgetDh: row.dailyBudgetDh,
        todaySpendDh: row.todaySpendDh,
        monthSpendDh: row.monthSpendDh,
        clicks: row.clicks,
        impressions: row.impressions,
        cpcDh: row.cpcDh,
        ctr: row.ctr,
        googleConversions: row.googleConversions,
      }),
    );
  }
  return saved;
}
