import {
  mutateCampaignBudget,
  mutateCampaignStatus,
} from "@/modules/ads/google-ads.client";
import { setAdsCampaignBudget, setAdsCampaignStatus } from "@/modules/ads/ads-store";

export async function pauseGoogleCampaign(externalId: string) {
  await mutateCampaignStatus(externalId, "PAUSED");
  await setAdsCampaignStatus(externalId, "PAUSED");
}

export async function activateGoogleCampaign(externalId: string) {
  await mutateCampaignStatus(externalId, "ENABLED");
  await setAdsCampaignStatus(externalId, "ACTIVE");
}

export async function reduceOrRaiseBudget(input: {
  externalId: string;
  budgetResourceName: string | null;
  nextBudgetDh: number;
}) {
  if (!input.budgetResourceName) {
    throw new Error("Budget Google Ads introuvable pour cette campagne.");
  }
  await mutateCampaignBudget(input.budgetResourceName, input.nextBudgetDh);
  await setAdsCampaignBudget(input.externalId, input.nextBudgetDh);
}
