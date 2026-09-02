import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { canUseFeature } from "@/lib/subscriptions/limits";
import {
  buildCommissionsCsv,
  getStaffCommissionSummary,
  listCommissions,
  resolveStaffIdForUser,
} from "@/lib/db/commissions";
import { canExportCommissions, getFeatureAccess } from "@/lib/rbac";
import { parseCommissionListQuery } from "@/lib/validation/commission";

export async function GET(request: NextRequest) {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth.response;

  const plan = await canUseFeature(auth.session.organizationId, "commissions");
  if (!plan.ok) {
    return NextResponse.json(
      { error: plan.message, code: plan.code },
      { status: 403 },
    );
  }

  const level = getFeatureAccess(auth.session.role, "commissions");
  if (level === "none" || !canExportCommissions(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const q = parseCommissionListQuery(url.searchParams);
    const format = url.searchParams.get("format") || "json";
    const staffIdParam = url.searchParams.get("staffId");

    let forceStaffId: string | null = null;
    if (level === "limited") {
      forceStaffId = await resolveStaffIdForUser(auth.session.organizationId, {
        email: auth.session.email,
        firstName: auth.session.firstName,
        lastName: auth.session.lastName,
      });
    }

    if (staffIdParam && format === "staff-summary") {
      if (forceStaffId && forceStaffId !== staffIdParam) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const year = Number(url.searchParams.get("year")) || undefined;
      const month = Number(url.searchParams.get("month")) || undefined;
      const summary = await getStaffCommissionSummary(
        auth.session.organizationId,
        staffIdParam,
        { year, month },
      );
      if (!summary) {
        return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
      }
      return NextResponse.json(summary);
    }

    const { items, kpis, period, total } = await listCommissions(
      auth.session.organizationId,
      {
        ...q,
        limit: Math.min(500, q.limit || 200),
        search: q.search || undefined,
        forceStaffId,
      },
    );

    if (format === "csv" || format === "excel") {
      const csv = buildCommissionsCsv(items);
      const filename =
        format === "excel"
          ? `commissions_${period.year}_${period.month}.xls`
          : `commissions_${period.year}_${period.month}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type":
            format === "excel"
              ? "application/vnd.ms-excel; charset=utf-8"
              : "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      data: items,
      kpis,
      period,
      total,
      exportHint: "Ajoutez ?format=csv|excel pour télécharger.",
    });
  } catch (error) {
    console.error("[GET /api/reports/commissions]", error);
    return NextResponse.json(
      { error: "Impossible de générer le rapport." },
      { status: 500 },
    );
  }
}
