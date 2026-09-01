import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCustomerAnalytics } from "@/lib/db/analytics";
import { resolveAnalyticsContext, withScope } from "@/app/api/analytics/_shared";

export async function GET(request: NextRequest) {
  const resolved = await resolveAnalyticsContext(request);
  if (!resolved.ok) return resolved.response;
  if (resolved.ctx.scope === "cash_only") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const data = await getCustomerAnalytics(resolved.ctx.session.organizationId, resolved.ctx.filters);
    return NextResponse.json(withScope(data, resolved.ctx.scope));
  } catch (error) {
    console.error("[GET /api/analytics/customers]", error);
    return NextResponse.json({ error: "Erreur analytics." }, { status: 500 });
  }
}
