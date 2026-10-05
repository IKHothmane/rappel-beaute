import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWriteLimited, stripOrganizationId } from "@/lib/auth/api-guard";
import { issueLoyaltyCard } from "@/lib/loyalty/cards";
import { SITE } from "@/lib/site";

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "loyalty");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const customerId = String(raw.customerId ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ error: "Choisissez une cliente." }, { status: 400 });
    }
    const card = await issueLoyaltyCard(auth.session.organizationId, customerId);
    return NextResponse.json({
      ...card,
      cardUrl: `${SITE.url}/carte/${card.publicToken}/`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    console.error("[POST /api/loyalty/cards]", error);
    return NextResponse.json({ error: "Impossible de créer la carte." }, { status: 500 });
  }
}
