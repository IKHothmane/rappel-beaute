import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  archiveSupplier,
  getSupplierById,
  removeProductSupplier,
  updateSupplier,
  upsertProductSupplier,
} from "@/lib/db/procurement";
import {
  validateLinkProductSupplier,
  validateUpdateSupplier,
} from "@/lib/validation/procurement";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const supplier = await getSupplierById(auth.session.organizationId, id);
    if (!supplier) {
      return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
    }
    return NextResponse.json(supplier);
  } catch (error) {
    console.error("[GET /api/suppliers/:id]", error);
    return NextResponse.json({ error: "Impossible de charger le fournisseur." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);

    // Lier / mettre à jour un produit fournisseur
    if (raw.action === "link-product") {
      const validated = validateLinkProductSupplier(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const link = await upsertProductSupplier(
        auth.session.organizationId,
        id,
        validated.data,
      );
      const supplier = await getSupplierById(auth.session.organizationId, id);
      return NextResponse.json({ link, supplier });
    }

    if (raw.action === "unlink-product") {
      const productId = typeof raw.productId === "string" ? raw.productId : "";
      if (!productId) {
        return NextResponse.json({ error: "productId requis." }, { status: 400 });
      }
      await removeProductSupplier(auth.session.organizationId, id, productId);
      const supplier = await getSupplierById(auth.session.organizationId, id);
      return NextResponse.json(supplier);
    }

    const validated = validateUpdateSupplier(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const supplier = await updateSupplier(
      auth.session.organizationId,
      id,
      validated.data,
    );
    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
      }
      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
      }
      if (error.message === "SUPPLIER_NOT_FOUND") {
        return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
      }
    }
    console.error("[PATCH /api/suppliers/:id]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    await archiveSupplier(auth.session.organizationId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
    }
    console.error("[DELETE /api/suppliers/:id]", error);
    return NextResponse.json({ error: "Impossible d'archiver." }, { status: 500 });
  }
}
