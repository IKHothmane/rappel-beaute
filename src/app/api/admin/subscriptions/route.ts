import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  createAdminSubscription,
  getAdminSubscriptionsKpis,
  listAdminSubscriptions,
  listPlans,
} from "@/lib/db/admin-subscriptions";
import { listOrganizationsForFilter } from "@/lib/db/admin-users";
import type { PlanCode, SubscriptionStatus } from "@/types/subscription";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const statusRaw = sp.get("status") ?? undefined;
  const [items, kpis, plans, organizations] = await Promise.all([
    listAdminSubscriptions({
      search: sp.get("search") ?? undefined,
      planCode: sp.get("plan") ?? undefined,
      status: statusRaw as SubscriptionStatus | "EXPIRING_SOON" | "EXPIRED_VIEW" | undefined,
      organizationId: sp.get("organizationId") ?? undefined,
    }),
    getAdminSubscriptionsKpis(),
    listPlans(true),
    listOrganizationsForFilter(),
  ]);

  return adminJson({ items, kpis, plans, organizations });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      organizationId?: string;
      planCode?: PlanCode;
    };
    if (!body.organizationId || !body.planCode) {
      return adminError("organizationId et planCode requis.", 400);
    }
    const id = await createAdminSubscription(auth.session, {
      organizationId: body.organizationId,
      planCode: body.planCode,
    });
    return adminJson({ ok: true, id }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PLAN_NOT_FOUND") return adminError("Plan introuvable.", 404);
    console.error("[POST /api/admin/subscriptions]", e);
    return adminError("Création impossible.", 500);
  }
}
