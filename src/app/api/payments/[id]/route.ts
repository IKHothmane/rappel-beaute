import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { getPaymentById } from "@/lib/db/finance";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const payment = await getPaymentById(auth.session.organizationId, id);
    if (!payment) {
      return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
    }
    return NextResponse.json(payment);
  } catch (error) {
    console.error("[GET /api/payments/:id]", error);
    return NextResponse.json({ error: "Impossible de charger le paiement." }, { status: 500 });
  }
}
