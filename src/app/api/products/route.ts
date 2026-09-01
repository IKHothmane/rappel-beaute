import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createProduct, isUniqueViolation, listProducts } from "@/lib/db/inventory";
import { parseProductListQuery, validateCreateProduct } from "@/lib/validation/inventory";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const q = parseProductListQuery(new URL(request.url).searchParams);
    const { items, total, kpis } = await listProducts(auth.session.organizationId, {
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
    console.error("[GET /api/products]", error);
    return NextResponse.json({ error: "Impossible de charger les produits." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreateProduct(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const product = await createProduct(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Un produit avec ce SKU existe déjà." },
        { status: 409 },
      );
    }
    console.error("[POST /api/products]", error);
    return NextResponse.json({ error: "Impossible de créer le produit." }, { status: 500 });
  }
}
