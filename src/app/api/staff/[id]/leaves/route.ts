import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { canEditStaffLeaves } from "@/lib/rbac";
import { createStaffLeave, getStaffById } from "@/lib/db/staff";
import { validateCreateLeave } from "@/lib/validation/staff";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "staff");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const staff = await getStaffById(auth.session.organizationId, id);
    if (!staff) {
      return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
    }
    return NextResponse.json({ data: staff.leaves });
  } catch (error) {
    console.error("[GET /api/staff/:id/leaves]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "staff");
  if (!auth.ok) return auth.response;

  if (!canEditStaffLeaves(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateCreateLeave(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    const leave = await createStaffLeave(auth.session.organizationId, id, validated.data);
    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
    }
    console.error("[POST /api/staff/:id/leaves]", error);
    return NextResponse.json({ error: "Impossible de créer le congé." }, { status: 500 });
  }
}
