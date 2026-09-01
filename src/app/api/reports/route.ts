import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOrganizationName } from "@/lib/db/analytics";
import { resolveAnalyticsContext, withScope } from "@/lib/reports/permissions";
import { buildReportByType, canAccessReportType } from "@/lib/reports/service";
import type { ReportType } from "@/types/reports";

const TYPES = new Set<ReportType>([
  "global",
  "finance",
  "agenda",
  "customers",
  "services",
  "staff",
  "inventory",
  "marketing",
  "reviews",
  "loyalty",
]);

function parseType(sp: URLSearchParams): ReportType {
  sp.delete("organizationId");
  const raw = sp.get("type")?.trim();
  if (raw && TYPES.has(raw as ReportType)) return raw as ReportType;
  return "global";
}

export async function GET(request: NextRequest) {
  const resolved = await resolveAnalyticsContext(request);
  if (!resolved.ok) return resolved.response;
  const { session, filters, scope } = resolved.ctx;

  const type = parseType(new URL(request.url).searchParams);
  if (!canAccessReportType(type, scope)) {
    return NextResponse.json({ error: "Accès refusé à ce rapport." }, { status: 403 });
  }

  try {
    const orgName = await getOrganizationName(session.organizationId);
    const data = await buildReportByType(
      session.organizationId,
      filters,
      orgName,
      type,
      scope,
    );
    return NextResponse.json(
      withScope({ ...(data as Record<string, unknown>) }, scope),
    );
  } catch (error) {
    console.error("[GET /api/reports]", error);
    return NextResponse.json({ error: "Erreur lors du chargement du rapport." }, { status: 500 });
  }
}
