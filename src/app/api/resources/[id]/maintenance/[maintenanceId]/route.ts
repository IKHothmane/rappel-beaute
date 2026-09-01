import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite, stripOrganizationId } from "@/lib/auth/api-guard";
import { updateResourceMaintenance } from "@/lib/db/resources";
import { validateUpdateMaintenance } from "@/lib/validation/resource";

type RouteContext = { params: Promise<{ id: string; maintenanceId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const { id, maintenanceId } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateUpdateMaintenance(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const item = await updateResourceMaintenance(
      auth.session.organizationId,
      id,
      maintenanceId,
      validated.data,
    );
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Maintenance introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/resources/:id/maintenance/:maintenanceId]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour." }, { status: 500 });
  }
}
