import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRevenueAnalytics } from "@/lib/db/analytics";
import { resolveAnalyticsContext, withScope } from "@/app/api/analytics/_shared";

export async function GET(request: NextRequest) {
  const resolved = await resolveAnalyticsContext(request);
  if (!resolved.ok) return resolved.response;
  const { session, filters, scope } = resolved.ctx;

  try {
    const data = await getRevenueAnalytics(session.organizationId, filters);
    return NextResponse.json(withScope(data, scope));
  } catch (error) {
    console.error("[GET /api/analytics/revenue]", error);
    return NextResponse.json({ error: "Erreur analytics." }, { status: 500 });
  }
}
