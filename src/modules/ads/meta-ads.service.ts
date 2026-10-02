import { fetchMetaAdsCampaigns, metaAdsConfig } from "@/modules/ads/meta-ads.client";
import { upsertAdsCampaign } from "@/modules/ads/ads-store";

export function adsConnectionStatus() {
  const cfg = metaAdsConfig();
  return {
    connected: cfg.connected,
    customerId: cfg.connected ? cfg.accountId : null,
    writesEnabled: cfg.writesEnabled,
  };
}

export async function syncMetaAdsCampaigns() {
  const rows = await fetchMetaAdsCampaigns();
  const saved = [];
  for (const row of rows) {
    if (!row.externalId) continue;
    saved.push(await upsertAdsCampaign(row));
  }
  return saved;
}
