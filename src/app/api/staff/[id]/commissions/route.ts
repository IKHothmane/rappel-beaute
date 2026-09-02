import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { canUseFeature } from "@/lib/subscriptions/limits";
import {
  getStaffCommissionSummary,
  resolveStaffIdForUser,
} from "@/lib/db/commissions";
import { getFeatureAccess } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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
  if (level === "none") {
    // MANAGER peut encore voir via staff read
    if (!["OWNER", "MANAGER", "ACCOUNTANT", "STAFF"].includes(auth.session.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
  }

  try {
    const { id } = await context.params;
    if (level === "limited") {
      const own = await resolveStaffIdForUser(auth.session.organizationId, {
        email: auth.session.email,
        firstName: auth.session.firstName,
        lastName: auth.session.lastName,
      });
      if (!own || own !== id) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
    }

    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year")) || undefined;
    const month = Number(url.searchParams.get("month")) || undefined;
    const summary = await getStaffCommissionSummary(
      auth.session.organizationId,
      id,
      { year, month },
    );
    if (!summary) {
      return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
    }
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /api/staff/:id/commissions]", error);
    return NextResponse.json(
      { error: "Impossible de charger les commissions." },
      { status: 500 },
    );
  }
}
