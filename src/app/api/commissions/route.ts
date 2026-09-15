import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  requireAppSession,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  closeCommissionPeriod,
  listCommissions,
  resolveStaffIdForUser,
  setCommissionsPaidBulk,
} from "@/lib/db/commissions";
import { canCloseCommissionPeriod, canWriteCommissions, getFeatureAccess } from "@/lib/rbac";
import {
  parseCommissionListQuery,
  validateClosePeriod,
  validateMarkPaidBulk,
} from "@/lib/validation/commission";

export async function GET(request: NextRequest) {
  const auth = await requireAppSession(request);
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
            paidTotal: 0,
            unpaidTotal: 0,
            paidCount: 0,
            unpaidCount: 0,
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

/** POST { action: "closePeriod" | "markPaidBulk", ... } */
export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "commissions");
  if (!auth.ok) return auth.response;
  if (!canWriteCommissions(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.action === "markPaidBulk") {
      const validated = validateMarkPaidBulk(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const result = await setCommissionsPaidBulk(
        auth.session.organizationId,
        validated.data.ids,
        actor,
      );
      return NextResponse.json(result);
    }

    if (raw.action !== "closePeriod") {
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }
    if (!canCloseCommissionPeriod(auth.session.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
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
      actor,
    );
    return NextResponse.json(period);
  } catch (error) {
    console.error("[POST /api/commissions]", error);
    return NextResponse.json(
      { error: "Impossible d’exécuter l’action." },
      { status: 500 },
    );
  }
}
