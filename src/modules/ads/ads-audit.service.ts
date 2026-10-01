import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { insertAdsDecision } from "@/modules/ads/ads-store";
import type { AdsDecisionKind } from "@/modules/ads/ads-rules.service";

export async function recordAdsDecision(input: {
  platformUserId?: string | null;
  platformUserName?: string | null;
  campaignId: string | null;
  externalId?: string | null;
  kind: AdsDecisionKind;
  summary: string;
  reason: string;
  executed: boolean;
  blocked: boolean;
  metrics?: unknown;
}) {
  await insertAdsDecision({
    campaignId: input.campaignId,
    kind: input.kind,
    summary: input.summary,
    reason: input.reason,
    executed: input.executed,
    blocked: input.blocked,
    metrics: input.metrics,
  });
  await writePlatformAuditLog({
    platformUserId: input.platformUserId,
    platformUserName: input.platformUserName,
    entityType: "ADS_AGENT",
    entityId: input.externalId || input.campaignId || "account",
    action: input.executed ? input.kind : `ADS_${input.kind}_HELD`,
    after: {
      summary: input.summary,
      reason: input.reason,
      executed: input.executed,
      blocked: input.blocked,
    },
  });
}
