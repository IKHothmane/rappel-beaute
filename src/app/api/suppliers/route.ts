import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  requireAppSession,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { canReadFeature } from "@/lib/rbac";
import {
  createSupplier,
  listSuppliers,
} from "@/lib/db/procurement";
import {
  parseSupplierListQuery,
  validateCreateSupplier,
} from "@/lib/validation/procurement";

export async function GET(request: NextRequest) {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth.response;
  if (
    !canReadFeature(auth.session.role, "stock") &&
    !canReadFeature(auth.session.role, "expenses")
  ) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const q = parseSupplierListQuery(new URL(request.url).searchParams);
    const { items, total, kpis } = await listSuppliers(auth.session.organizationId, {
      ...q,
      search: q.search || undefined,
    });
    return NextResponse.json({
      data: items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
      kpis,
    });
  } catch (error) {
    console.error("[GET /api/suppliers]", error);
    return NextResponse.json({ error: "Impossible de charger les fournisseurs." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreateSupplier(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const supplier = await createSupplier(auth.session.organizationId, validated.data);
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("[POST /api/suppliers]", error);
    return NextResponse.json({ error: "Impossible de créer le fournisseur." }, { status: 500 });
  }
}
