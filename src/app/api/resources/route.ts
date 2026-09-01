import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createResource, listResources } from "@/lib/db/resources";
import { parseResourceListQuery, validateCreateResource } from "@/lib/validation/resource";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, type, active, serviceId, agenda } =
      parseResourceListQuery(searchParams);

    const { items, total } = await listResources(auth.session.organizationId, {
      page,
      limit,
      search: search || undefined,
      type,
      active,
      serviceId,
      agenda,
    });

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[GET /api/resources]", error);
    return NextResponse.json(
      { error: "Impossible de charger les ressources." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreateResource(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const resource = await createResource(auth.session.organizationId, validated.data);
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("[POST /api/resources]", error);
    return NextResponse.json(
      { error: "Impossible de créer la ressource." },
      { status: 500 },
    );
  }
}
