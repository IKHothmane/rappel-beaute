import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { getStaffById, updateStaffSchedule } from "@/lib/db/staff";
import { validateUpdateSchedule } from "@/lib/validation/staff";

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
    return NextResponse.json({
      schedules: staff.schedules,
      breaks: staff.breaks,
    });
  } catch (error) {
    console.error("[GET /api/staff/:id/schedule]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
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
    const validated = validateUpdateSchedule(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    const staff = await updateStaffSchedule(
      auth.session.organizationId,
      id,
      validated.data,
    );
    return NextResponse.json({
      schedules: staff.schedules,
      breaks: staff.breaks,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/staff/:id/schedule]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le planning." }, { status: 500 });
  }
}
