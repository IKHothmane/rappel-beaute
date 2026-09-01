import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAnalyticsOverview } from "@/lib/db/analytics";
import { resolveAnalyticsContext, withScope } from "@/app/api/analytics/_shared";

export async function GET(request: NextRequest) {
  const resolved = await resolveAnalyticsContext(request);
  if (!resolved.ok) return resolved.response;
  const { session, filters, scope } = resolved.ctx;

  if (scope === "cash_only") {
    return NextResponse.json(
      withScope(
        {
          period: filters.period,
          comparePeriod: null,
          revenue: { value: 0, previous: null, changePercent: null },
          expenses: { value: 0, previous: null, changePercent: null },
          margin: { value: 0, previous: null, changePercent: null },
          averageTicket: { value: 0, previous: null, changePercent: null },
          appointments: { value: 0, previous: null, changePercent: null },
          customers: { value: 0, previous: null, changePercent: null },
          message: "Vue caisse — utilisez l'onglet Revenus pour les paiements.",
        },
        scope,
      ),
    );
  }

  try {
    const data = await getAnalyticsOverview(session.organizationId, filters);
    return NextResponse.json(withScope({ ...data, scope }, scope));
  } catch (error) {
    console.error("[GET /api/analytics/overview]", error);
    return NextResponse.json({ error: "Erreur analytics." }, { status: 500 });
  }
}
