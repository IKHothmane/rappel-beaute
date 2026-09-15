import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { listPlatformAuditLogs } from "@/lib/db/platform-audit";
import { getPlatformDashboardHome } from "@/lib/db/platform-metrics";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const sp = request.nextUrl.searchParams;
    const limit = parseInt(sp.get("limit") ?? "12", 10);

    const [home, audit] = await Promise.all([
      getPlatformDashboardHome(),
      listPlatformAuditLogs({ limit }),
    ]);

    return adminJson({
      ...home,
      // rétrocompat tuiles anciennes
      stats: home.stats,
      audit,
    });
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error);
    return adminError("Impossible de charger le tableau de bord.", 500);
  }
}
