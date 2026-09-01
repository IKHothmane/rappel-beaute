import type { NextRequest } from "next/server";
import { adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { listPlatformAuditLogs } from "@/lib/db/platform-audit";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") ?? "100", 10), 200);
  const organizationId = sp.get("organizationId") ?? undefined;

  const items = await listPlatformAuditLogs({ limit, organizationId });
  return adminJson({ items });
}
