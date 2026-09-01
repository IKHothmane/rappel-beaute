import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  getPurchaseById,
  receivePurchase,
  updatePurchase,
} from "@/lib/db/procurement";
import {
  validateReceivePurchase,
  validateUpdatePurchase,
} from "@/lib/validation/procurement";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "stock", "purchases");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const purchase = await getPurchaseById(auth.session.organizationId, id);
    if (!purchase) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    return NextResponse.json(purchase);
  } catch (error) {
    console.error("[GET /api/purchases/:id]", error);
    return NextResponse.json({ error: "Impossible de charger la commande." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "stock", "purchases");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);

    if (raw.action === "receive") {
      const validated = validateReceivePurchase(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const result = await receivePurchase(
        auth.session.organizationId,
        id,
        validated.data,
        auth.session.id,
      );
      return NextResponse.json(result, { status: result.created ? 201 : 200 });
    }

    const validated = validateUpdatePurchase(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const purchase = await updatePurchase(
      auth.session.organizationId,
      id,
      validated.data,
    );
    return NextResponse.json(purchase);
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number]> = {
        NOT_FOUND: ["Commande introuvable.", 404],
        ITEMS_LOCKED: ["Les lignes ne sont modifiables qu'en brouillon.", 400],
        LOCKED: ["Commande verrouillée.", 400],
        CANNOT_CANCEL: ["Impossible d'annuler une commande déjà partiellement reçue.", 400],
        NOT_RECEIVABLE: ["Cette commande ne peut pas être réceptionnée.", 400],
        ITEM_NOT_FOUND: ["Ligne de commande introuvable.", 404],
        OVER_RECEIVE: ["Quantité reçue supérieure au reste à livrer.", 400],
        PRODUCT_NOT_FOUND: ["Produit introuvable.", 404],
      };
      const hit = map[error.message];
      if (hit) return NextResponse.json({ error: hit[0] }, { status: hit[1] });
    }
    console.error("[PATCH /api/purchases/:id]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour." }, { status: 500 });
  }
}
