import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  requireSession,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createCommissionAdjustment,
  getCommissionById,
  resolveStaffIdForUser,
  setCommissionPaid,
} from "@/lib/db/commissions";
import { canWriteCommissions, getFeatureAccess } from "@/lib/rbac";
import { validateCommissionAdjustment } from "@/lib/validation/commission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const level = getFeatureAccess(auth.session.role, "commissions");
  if (level === "none") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const commission = await getCommissionById(auth.session.organizationId, id);
    if (!commission) {
      return NextResponse.json({ error: "Commission introuvable." }, { status: 404 });
    }

    if (level === "limited") {
      const staffId = await resolveStaffIdForUser(auth.session.organizationId, {
        email: auth.session.email,
        firstName: auth.session.firstName,
        lastName: auth.session.lastName,
      });
      if (!staffId || staffId !== commission.staffId) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
    }

    return NextResponse.json(commission);
  } catch (error) {
    console.error("[GET /api/commissions/:id]", error);
    return NextResponse.json(
      { error: "Impossible de charger la commission." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "commissions");
  if (!auth.ok) return auth.response;
  if (!canWriteCommissions(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.action === "adjust") {
      const validated = validateCommissionAdjustment(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const commission = await createCommissionAdjustment(
        auth.session.organizationId,
        id,
        validated.data,
        actor,
      );
      return NextResponse.json(commission);
    }

    if (raw.action === "markPaid" || raw.action === "markUnpaid") {
      const commission = await setCommissionPaid(
        auth.session.organizationId,
        id,
        raw.action === "markPaid",
        actor,
      );
      return NextResponse.json(commission);
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Commission introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/commissions/:id]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour." }, { status: 500 });
  }
}
