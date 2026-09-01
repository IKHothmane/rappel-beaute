import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createService,
  getServiceFormOptions,
  listServices,
} from "@/lib/db/services";
import {
  parseServiceListQuery,
  validateCreateService,
} from "@/lib/validation/service";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "services");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("options") === "1") {
      const options = await getServiceFormOptions(auth.session.organizationId);
      return NextResponse.json(options);
    }

    const { page, limit, search, category, active, agenda } = parseServiceListQuery(searchParams);

    const { items, total, categories } = await listServices(auth.session.organizationId, {
      page,
      limit,
      search: search || undefined,
      category,
      active,
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
      categories,
    });
  } catch (error) {
    console.error("[GET /api/services]", error);
    return NextResponse.json(
      { error: "Impossible de charger les services." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "services");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateCreateService(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    const service = await createService(auth.session.organizationId, validated.data);
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("[POST /api/services]", error);
    return NextResponse.json(
      { error: "Impossible de créer le service." },
      { status: 500 },
    );
  }
}
