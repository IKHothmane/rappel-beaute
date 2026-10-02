import { mutateCampaignBudget, mutateCampaignStatus } from "@/modules/ads/meta-ads.client";
import { setAdsCampaignBudget, setAdsCampaignStatus } from "@/modules/ads/ads-store";

export async function pauseMetaCampaign(externalId: string) {
  await mutateCampaignStatus(externalId, "PAUSED");
  await setAdsCampaignStatus(externalId, "PAUSED");
}

export async function activateMetaCampaign(externalId: string) {
  await mutateCampaignStatus(externalId, "ACTIVE");
  await setAdsCampaignStatus(externalId, "ACTIVE");
}

export async function reduceOrRaiseBudget(input: {
  externalId: string;
  budgetResourceName: string | null;
  nextBudgetDh: number;
}) {
  if (!input.budgetResourceName) {
    throw new Error("Budget journalier Meta introuvable pour cette campagne.");
  }
  await mutateCampaignBudget(input.budgetResourceName, input.nextBudgetDh);
  await setAdsCampaignBudget(input.externalId, input.nextBudgetDh);
}
