import { listAdsCampaigns, platformAcquisitionCounts } from "@/modules/ads/ads-store";

export async function getAdsMetrics() {
  const [campaigns, acquisition] = await Promise.all([
    listAdsCampaigns(),
    platformAcquisitionCounts(),
  ]);
  const todaySpendDh = sum(campaigns.map((c) => c.todaySpendDh));
  const monthSpendDh = sum(campaigns.map((c) => c.monthSpendDh));
  const clicks = sum(campaigns.map((c) => c.clicks));
  const costPerSignup =
    acquisition.signupsMonth > 0 ? round(monthSpendDh / acquisition.signupsMonth) : null;
  const costPerSubscription =
    acquisition.subscriptions > 0 ? round(monthSpendDh / acquisition.subscriptions) : null;
  return {
    campaigns,
    todaySpendDh,
    monthSpendDh,
    clicks,
    ...acquisition,
    costPerSignup,
    costPerSubscription,
  };
}

function sum(values: number[]) {
  return round(values.reduce((total, value) => total + value, 0));
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
