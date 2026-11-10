import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAnalyticsOverview } from "@/lib/db/analytics";
import { resolveAnalyticsContext, withScope } from "@/app/api/analytics/_shared";
import { tenantRoute } from "@/lib/http/route-scope";

export const GET = tenantRoute(async function GET(request: NextRequest) {
  const resolved = await resolveAnalyticsContext(request);
  if (!resolved.ok) return resolved.response;
  const { session, filters, scope } = resolved.ctx;

  try {
    const data = await getAnalyticsOverview(session.organizationId, filters);
    return NextResponse.json(
      withScope(
        {
          ...data,
          scope,
          ...(scope === "cash_only"
            ? { message: "Vue caisse — indicateurs basés sur les encaissements de la période." }
            : {}),
        },
        scope,
      ),
    );
  } catch (error) {
    console.error("[GET /api/analytics/overview]", error);
    return NextResponse.json({ error: "Erreur analytics." }, { status: 500 });
  }
});
