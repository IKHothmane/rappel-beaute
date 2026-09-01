import type { NextRequest } from "next/server";
import { adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { getPlatformDashboardStats } from "@/lib/db/admin-organizations";
import { listPlatformAuditLogs } from "@/lib/db/platform-audit";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const limit = parseInt(sp.get("limit") ?? "50", 10);
  const organizationId = sp.get("organizationId") ?? undefined;

  const [stats, audit] = await Promise.all([
    getPlatformDashboardStats(),
    listPlatformAuditLogs({ limit, organizationId }),
  ]);

  return adminJson({ stats, audit });
}
