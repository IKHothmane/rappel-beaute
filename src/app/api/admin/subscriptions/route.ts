import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  createAdminSubscription,
  getAdminSubscriptionsKpis,
  listAdminSubscriptions,
  listPlans,
} from "@/lib/db/admin-subscriptions";
import { listOrganizationsForFilter } from "@/lib/db/admin-users";
import { getShowcaseMonthlyPrice } from "@/lib/subscriptions/plans";
import type { PlanCode, SubscriptionStatus } from "@/types/subscription";
import { platformRoute } from "@/lib/http/route-scope";
import { readJsonObject } from "@/lib/admin/read-json-object";

export const GET = platformRoute(async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const statusRaw = sp.get("status") ?? undefined;
  const [items, kpis, plans, organizations, showcasePrice] = await Promise.all([
    listAdminSubscriptions({
      search: sp.get("search") ?? undefined,
      planCode: sp.get("plan") ?? undefined,
      status: statusRaw as SubscriptionStatus | "EXPIRING_SOON" | "EXPIRED_VIEW" | undefined,
      organizationId: sp.get("organizationId") ?? undefined,
    }),
    getAdminSubscriptionsKpis(),
    listPlans(true),
    listOrganizationsForFilter(),
    getShowcaseMonthlyPrice(),
  ]);

  return adminJson({ items, kpis, plans, organizations, showcasePrice });
});

export const POST = platformRoute(async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return adminError("Corps JSON invalide.", 400);
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  const planCode = typeof body.planCode === "string" ? body.planCode.trim() : "";
  if (!organizationId || !planCode) {
    return adminError("organizationId et planCode requis.", 400);
  }

  try {
    const id = await createAdminSubscription(auth.session, {
      organizationId,
      planCode: planCode as PlanCode,
    });
    return adminJson({ ok: true, id }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PLAN_NOT_FOUND") return adminError("Plan introuvable.", 404);
    if (msg === "ORGANIZATION_NOT_FOUND") return adminError("Institut introuvable.", 404);
    console.error("[POST /api/admin/subscriptions]", e);
    return adminError("Création impossible.", 500);
  }
});
