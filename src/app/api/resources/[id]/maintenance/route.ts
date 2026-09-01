import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createResourceMaintenance, getResourceById } from "@/lib/db/resources";
import { validateCreateMaintenance } from "@/lib/validation/resource";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const resource = await getResourceById(auth.session.organizationId, id);
    if (!resource) {
      return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
    }
    return NextResponse.json({ data: resource.maintenances });
  } catch (error) {
    console.error("[GET /api/resources/:id/maintenance]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreateMaintenance(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const item = await createResourceMaintenance(
      auth.session.organizationId,
      id,
      validated.data,
    );
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
    }
    console.error("[POST /api/resources/:id/maintenance]", error);
    return NextResponse.json({ error: "Impossible de créer la maintenance." }, { status: 500 });
  }
}
