import type { NextRequest } from "next/server";
import { adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { listAdminSubscriptions } from "@/lib/db/admin-subscriptions";
import type { SubscriptionStatus } from "@/types/subscription";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const items = await listAdminSubscriptions({
    planCode: sp.get("plan") ?? undefined,
    status: (sp.get("status") as SubscriptionStatus) ?? undefined,
    organizationId: sp.get("organizationId") ?? undefined,
  });
  return adminJson({ items });
}
