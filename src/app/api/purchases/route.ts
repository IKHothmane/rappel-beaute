import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createPurchase, listPurchases } from "@/lib/db/procurement";
import {
  parsePurchaseListQuery,
  validateCreatePurchase,
} from "@/lib/validation/procurement";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "stock", "purchases");
  if (!auth.ok) return auth.response;

  try {
    const q = parsePurchaseListQuery(new URL(request.url).searchParams);
    const { items, total, kpis } = await listPurchases(auth.session.organizationId, {
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
    console.error("[GET /api/purchases]", error);
    return NextResponse.json({ error: "Impossible de charger les achats." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "stock", "purchases");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreatePurchase(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const purchase = await createPurchase(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SUPPLIER_NOT_FOUND") {
        return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
      }
      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
      }
    }
    console.error("[POST /api/purchases]", error);
    return NextResponse.json({ error: "Impossible de créer la commande." }, { status: 500 });
  }
}
