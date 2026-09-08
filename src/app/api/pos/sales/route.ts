import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requirePosRead,
  requirePosWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createPosSale, listPosSales } from "@/lib/db/pos";
import type { PaymentMethod } from "@/types/finance";
import { PAYMENT_METHODS } from "@/types/finance";

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  EMPTY_CART: { status: 400, message: "Panier vide." },
  IDEMPOTENCY_REQUIRED: { status: 400, message: "Clé d'idempotence requise." },
  INVALID_LINE: { status: 400, message: "Ligne panier invalide." },
  ONLINE_NOT_ALLOWED: { status: 400, message: "Paiement en ligne non disponible." },
  NO_OPEN_SESSION: { status: 409, message: "Ouvrez la caisse pour encaisser en espèces." },
  CUSTOMER_NOT_FOUND: { status: 404, message: "Cliente introuvable." },
  PRODUCT_NOT_FOUND: { status: 404, message: "Produit introuvable ou non vendable." },
  PRODUCT_NO_PRICE: { status: 400, message: "Produit sans prix de vente." },
  INSUFFICIENT_STOCK: { status: 409, message: "Stock insuffisant." },
  INVALID_TOTAL: { status: 400, message: "Total invalide." },
};

export async function GET(request: NextRequest) {
  const auth = await requirePosRead(request);
  if (!auth.ok) return auth.response;
  try {
    const data = await listPosSales(auth.session.organizationId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/pos/sales]", error);
    return NextResponse.json({ error: "Erreur liste." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePosWrite(request);
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const method = String(raw.paymentMethod ?? "") as PaymentMethod;
    if (!PAYMENT_METHODS.includes(method) || method === "ONLINE") {
      return NextResponse.json({ error: "Moyen de paiement invalide." }, { status: 400 });
    }

    const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
    const lines = linesRaw.map((l) => {
      const item = l as Record<string, unknown>;
      return {
        productId: String(item.productId ?? ""),
        quantity: Number(item.quantity),
      };
    });

    const sale = await createPosSale(
      auth.session.organizationId,
      {
        lines,
        paymentMethod: method,
        customerId: raw.customerId ? String(raw.customerId) : null,
        discountTotal: raw.discountTotal != null ? Number(raw.discountTotal) : 0,
        notes: raw.notes != null ? String(raw.notes) : null,
        idempotencyKey: String(raw.idempotencyKey ?? ""),
      },
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const mapped = ERROR_MAP[code];
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    console.error("[POST /api/pos/sales]", error);
    return NextResponse.json({ error: "Erreur vente POS." }, { status: 500 });
  }
}
