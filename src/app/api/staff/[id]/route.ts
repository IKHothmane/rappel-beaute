import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { getStaffById, updateStaff } from "@/lib/db/staff";
import { validateUpdateStaff } from "@/lib/validation/staff";

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
    return NextResponse.json(staff);
  } catch (error) {
    console.error("[GET /api/staff/:id]", error);
    return NextResponse.json(
      { error: "Impossible de charger l'employée." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "staff");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateUpdateStaff(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    const staff = await updateStaff(auth.session.organizationId, id, validated.data);
    return NextResponse.json(staff);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/staff/:id]", error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour l'employée." },
      { status: 500 },
    );
  }
}
