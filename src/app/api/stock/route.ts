import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  applyInventoryCount,
  createInventoryMovement,
  getStockKpis,
  listMovements,
} from "@/lib/db/inventory";
import {
  parseMovementListQuery,
  validateCreateMovement,
} from "@/lib/validation/inventory";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get("kpis") === "1") {
      const kpis = await getStockKpis(auth.session.organizationId);
      return NextResponse.json(kpis);
    }

    const q = parseMovementListQuery(url.searchParams);
    const { items, total } = await listMovements(auth.session.organizationId, {
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
    });
  } catch (error) {
    console.error("[GET /api/stock]", error);
    return NextResponse.json({ error: "Impossible de charger le stock." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "stock");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);

    // Inventaire physique
    if (raw.action === "inventory-count" && Array.isArray(raw.items)) {
      const items = raw.items.map((i) => {
        const item = i as Record<string, unknown>;
        return {
          productId: String(item.productId),
          countedQuantity: Number(item.countedQuantity),
        };
      });
      const result = await applyInventoryCount(
        auth.session.organizationId,
        items,
        auth.session.id,
      );
      return NextResponse.json(result, { status: 201 });
    }

    const validated = validateCreateMovement(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    // Bloquer SERVICE_CONSUMPTION manuel sans référence RDV (évite doublons hors flux)
    if (
      validated.data.type === "SERVICE_CONSUMPTION" &&
      !validated.data.referenceId
    ) {
      return NextResponse.json(
        { error: "La consommation service passe par la finalisation du RDV." },
        { status: 400 },
      );
    }

    const { movement, created } = await createInventoryMovement(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json({ ...movement, created }, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    console.error("[POST /api/stock]", error);
    return NextResponse.json({ error: "Impossible d'enregistrer le mouvement." }, { status: 500 });
  }
}
