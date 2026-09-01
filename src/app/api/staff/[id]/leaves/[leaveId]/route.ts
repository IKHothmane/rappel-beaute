import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { canEditStaffLeaves } from "@/lib/rbac";
import { updateStaffLeave } from "@/lib/db/staff";
import { validateUpdateLeave } from "@/lib/validation/staff";

type RouteContext = { params: Promise<{ id: string; leaveId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "staff");
  if (!auth.ok) return auth.response;

  if (!canEditStaffLeaves(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const { id, leaveId } = await context.params;
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateUpdateLeave(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    const leave = await updateStaffLeave(
      auth.session.organizationId,
      id,
      leaveId,
      validated.data,
    );
    return NextResponse.json(leave);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Congé introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/staff/:id/leaves/:leaveId]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le congé." }, { status: 500 });
  }
}
