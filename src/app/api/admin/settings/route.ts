import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  getIntegrationsStatus,
  getPlatformProfile,
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettingsData,
} from "@/lib/db/platform-settings";
import { getPlatformAnalytics, getPlatformBilling } from "@/lib/db/platform-metrics";
import { adminSupportKpis } from "@/lib/db/support-tickets";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const [settings, profile, analytics, supportKpis, billing] = await Promise.all([
      getPlatformSettings(),
      getPlatformProfile(auth.session.id),
      getPlatformAnalytics().catch(() => null),
      adminSupportKpis().catch(() => null),
      getPlatformBilling().catch(() => null),
    ]);

    const failedLines =
      billing?.lines.filter((l) => /fail|échec|error/i.test(l.status)).length ?? 0;
    const pendingLines =
      billing?.lines.filter((l) => /pend|attente|due/i.test(l.status)).length ?? 0;
    const paidLines =
      billing?.lines.filter((l) => /paid|payé|active|ok/i.test(l.status)).length ??
      billing?.lines.length ??
      0;

    return adminJson({
      settings,
      profile,
      integrations: getIntegrationsStatus(),
      snapshots: {
        orgs: analytics?.orgsActive ?? analytics?.orgs ?? 0,
        users: analytics?.users ?? 0,
        mrr: analytics?.mrr ?? billing?.mrr ?? 0,
        openTickets: supportKpis?.open ?? 0,
        paymentsReceived: paidLines,
        paymentsPending: pendingLines,
        paymentsFailed: failedLines,
        recentPayments: (billing?.lines ?? []).slice(0, 8),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/settings]", error);
    return adminError("Impossible de charger les paramètres.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { patch?: Partial<PlatformSettingsData> };
    if (!body.patch || typeof body.patch !== "object") {
      return adminError("Patch invalide.", 400);
    }
    const settings = await updatePlatformSettings({
      patch: body.patch,
      platformUserId: auth.session.id,
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });
    return adminJson({ settings });
  } catch (error) {
    console.error("[PATCH /api/admin/settings]", error);
    return adminError("Impossible d'enregistrer.", 500);
  }
}
