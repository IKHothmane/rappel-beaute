import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { resolveStaffIdForUser } from "@/lib/db/commissions";
import { getAnalyticsScope, type AnalyticsScope } from "@/lib/rbac";
import { parseAnalyticsFilters } from "@/lib/validation/analytics";
import type { AnalyticsFilters } from "@/types/analytics";
import type { AppSessionUser } from "@/lib/auth/types";

export type AnalyticsContext = {
  session: AppSessionUser;
  filters: AnalyticsFilters;
  scope: AnalyticsScope;
};

/** Contexte session + filtres + RBAC — partagé Analytics et Reports */
export async function resolveAnalyticsContext(
  request: NextRequest,
): Promise<{ ok: true; ctx: AnalyticsContext } | { ok: false; response: NextResponse }> {
  const auth = await requireFeatureRead(request, "analytics");
  if (!auth.ok) return auth;

  const scope = getAnalyticsScope(auth.session.role);
  if (!scope) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }

  const sp = new URL(request.url).searchParams;
  sp.delete("organizationId");

  const parsed = parseAnalyticsFilters(sp);
  if (!parsed.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: parsed.error }, { status: 400 }),
    };
  }

  const filters = { ...parsed.filters };

  if (scope === "staff_self") {
    const staffId = await resolveStaffIdForUser(auth.session.organizationId, {
      email: auth.session.email,
      firstName: auth.session.firstName,
      lastName: auth.session.lastName,
    });
    if (!staffId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Profil employée introuvable." },
          { status: 403 },
        ),
      };
    }
    filters.staffId = staffId;
  }

  if (scope === "cash_only") {
    filters.staffId = null;
    filters.serviceId = null;
    filters.resourceId = null;
  }

  return {
    ok: true,
    ctx: { session: auth.session, filters, scope },
  };
}

export function withScope<T>(
  data: T,
  scope: AnalyticsScope,
): T & { scope: AnalyticsScope } {
  return { ...data, scope };
}
