import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAIMarketingAnalytics,
  getMarketingAnalytics,
  getPostVisitAnalyticsSummary,
} from "@/lib/db/analytics";
import { resolveAnalyticsContext, withScope } from "@/app/api/analytics/_shared";

export async function GET(request: NextRequest) {
  const resolved = await resolveAnalyticsContext(request);
  if (!resolved.ok) return resolved.response;
  if (resolved.ctx.scope !== "full") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const [items, postVisit, aiMarketing] = await Promise.all([
      getMarketingAnalytics(resolved.ctx.session.organizationId, resolved.ctx.filters),
      getPostVisitAnalyticsSummary(
        resolved.ctx.session.organizationId,
        resolved.ctx.filters,
      ),
      getAIMarketingAnalytics(resolved.ctx.session.organizationId, resolved.ctx.filters),
    ]);
    return NextResponse.json(withScope({ items, postVisit, aiMarketing }, resolved.ctx.scope));
  } catch (error) {
    console.error("[GET /api/analytics/marketing]", error);
    return NextResponse.json({ error: "Erreur analytics." }, { status: 500 });
  }
}
