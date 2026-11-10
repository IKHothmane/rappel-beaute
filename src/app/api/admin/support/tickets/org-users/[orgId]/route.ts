import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { listOrgUsersForSupport } from "@/lib/db/support-tickets";
import { platformRoute } from "@/lib/http/route-scope";

type Ctx = { params: Promise<{ orgId: string }> };

export const GET = platformRoute(async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { orgId } = await context.params;
  try {
    const users = await listOrgUsersForSupport(orgId);
    return adminJson({ users });
  } catch (error) {
    console.error("[GET /api/admin/support/tickets/org-users]", error);
    return adminError("Impossible de charger les utilisateurs.", 500);
  }
});
