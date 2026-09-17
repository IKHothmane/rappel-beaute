import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPublicProductOrder } from "@/lib/db/public-shop";
import type { PublicProductOrderInput } from "@/types/public-booking";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const body = (await request.json()) as PublicProductOrderInput;
    const result = await createPublicProductOrder(slug, body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible d’enregistrer la demande.";
    const status =
      message.includes("introuvable") || message.includes("disponibles")
        ? 404
        : message.includes("Stock") ||
            message.includes("Panier") ||
            message.includes("Téléphone") ||
            message.includes("Nom") ||
            message.includes("Quantité") ||
            message.includes("Trop")
          ? 400
          : 500;
    if (status === 500) {
      console.error("[POST /api/public/[slug]/product-orders]", error);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
