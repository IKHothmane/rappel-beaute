import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  adminListSupportTickets,
  adminSupportKpis,
  parseStatus,
} from "@/lib/db/support-tickets";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const status = parseStatus(request.nextUrl.searchParams.get("status"));
    const [kpis, items] = await Promise.all([
      adminSupportKpis(),
      adminListSupportTickets(status ? { status } : undefined),
    ]);

    return adminJson({
      kpis,
      items: items.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        resolvedAt: t.resolvedAt?.toISOString() ?? null,
        lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/support/tickets]", error);
    return adminError("Impossible de charger les tickets.", 500);
  }
}
