import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { adminSupportAnalytics } from "@/lib/db/support-tickets";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const analytics = await adminSupportAnalytics();
    return adminJson(analytics);
  } catch (error) {
    console.error("[GET /api/admin/support/tickets/analytics]", error);
    return adminError("Impossible de charger les analytics support.", 500);
  }
}
