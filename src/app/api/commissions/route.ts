import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  requireSession,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  closeCommissionPeriod,
  listCommissions,
  resolveStaffIdForUser,
} from "@/lib/db/commissions";
import { canCloseCommissionPeriod, getFeatureAccess } from "@/lib/rbac";
import {
  parseCommissionListQuery,
  validateClosePeriod,
} from "@/lib/validation/commission";

export async function GET(request: NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const level = getFeatureAccess(auth.session.role, "commissions");
  if (level === "none") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const q = parseCommissionListQuery(new URL(request.url).searchParams);
    let forceStaffId: string | null = null;

    if (level === "limited") {
      forceStaffId = await resolveStaffIdForUser(auth.session.organizationId, {
        email: auth.session.email,
        firstName: auth.session.firstName,
        lastName: auth.session.lastName,
      });
      if (!forceStaffId) {
        return NextResponse.json({
          data: [],
          pagination: { page: 1, limit: q.limit, total: 0, totalPages: 1 },
          kpis: {
            commissionTotal: 0,
            baseTotal: 0,
            count: 0,
            avgRatePct: null,
            byStaff: [],
          },
          period: {
            from: new Date().toISOString(),
            to: new Date().toISOString(),
            preset: q.preset,
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            status: "OPEN",
          },
        });
      }
    }

    const { items, total, kpis, period } = await listCommissions(
      auth.session.organizationId,
      {
        ...q,
        search: q.search || undefined,
        forceStaffId,
      },
    );

    return NextResponse.json({
      data: items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
      kpis,
      period,
    });
  } catch (error) {
    console.error("[GET /api/commissions]", error);
    return NextResponse.json(
      { error: "Impossible de charger les commissions." },
      { status: 500 },
    );
  }
}

/** Clôture de période : POST { action: "closePeriod", year, month } */
export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "commissions");
  if (!auth.ok) return auth.response;
  if (!canCloseCommissionPeriod(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    if (raw.action !== "closePeriod") {
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }
    const validated = validateClosePeriod(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const period = await closeCommissionPeriod(
      auth.session.organizationId,
      validated.data.year,
      validated.data.month,
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    return NextResponse.json(period);
  } catch (error) {
    console.error("[POST /api/commissions]", error);
    return NextResponse.json(
      { error: "Impossible de clôturer la période." },
      { status: 500 },
    );
  }
}
