import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createProductLot,
  getProductById,
  isUniqueViolation,
  updateProduct,
} from "@/lib/db/inventory";
import { validateUpdateProduct } from "@/lib/validation/inventory";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const product = await getProductById(auth.session.organizationId, id);
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("[GET /api/products/:id]", error);
    return NextResponse.json({ error: "Impossible de charger le produit." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);

    // Interdire toute écriture directe du stock
    if ("stock" in raw) {
      return NextResponse.json(
        {
          error:
            "Le stock ne peut pas être modifié directement. Utilisez un mouvement d'inventaire.",
        },
        { status: 400 },
      );
    }

    if (raw.lot && typeof raw.lot === "object") {
      const lot = raw.lot as Record<string, unknown>;
      const created = await createProductLot(auth.session.organizationId, id, {
        lotNumber: String(lot.lotNumber ?? ""),
        quantity: Number(lot.quantity) || 0,
        expiresAt: lot.expiresAt ? String(lot.expiresAt) : undefined,
        notes: lot.notes ? String(lot.notes) : undefined,
      });
      const product = await getProductById(auth.session.organizationId, id);
      return NextResponse.json({ product, lot: created });
    }

    const validated = validateUpdateProduct(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const product = await updateProduct(
      auth.session.organizationId,
      id,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "SKU déjà utilisé." }, { status: 409 });
    }
    console.error("[PATCH /api/products/:id]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour." }, { status: 500 });
  }
}
