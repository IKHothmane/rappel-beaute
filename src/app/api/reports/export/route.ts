import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/db/audit";
import { getOrganizationName } from "@/lib/db/analytics";
import { buildReportExport } from "@/lib/reports/export";
import { resolveAnalyticsContext } from "@/lib/reports/permissions";
import { canAccessReportType } from "@/lib/reports/service";
import { parseReportExportParams } from "@/lib/validation/reports";

export async function GET(request: NextRequest) {
  const resolved = await resolveAnalyticsContext(request);
  if (!resolved.ok) return resolved.response;
  const { session, filters, scope } = resolved.ctx;

  const sp = new URL(request.url).searchParams;
  const parsed = parseReportExportParams(sp);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { format, type } = parsed;
  if (!canAccessReportType(type, scope)) {
    return NextResponse.json({ error: "Accès refusé à ce rapport." }, { status: 403 });
  }

  try {
    const orgName = await getOrganizationName(session.organizationId);
    const exported = await buildReportExport(
      session.organizationId,
      filters,
      orgName,
      type,
      format,
      scope,
    );

    await writeAuditLog({
      organizationId: session.organizationId,
      actorId: session.id,
      actorName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "Report",
      entityId: type,
      action: "REPORT_EXPORTED",
      after: {
        reportType: type,
        format,
        periodFrom: filters.period.from,
        periodTo: filters.period.to,
        staffId: filters.staffId,
        serviceId: filters.serviceId,
      },
    });

    return new NextResponse(new Uint8Array(exported.buffer), {
      status: 200,
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/export]", error);
    return NextResponse.json({ error: "Erreur lors de l'export." }, { status: 500 });
  }
}
