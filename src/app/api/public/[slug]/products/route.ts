import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicProducts } from "@/lib/db/public-shop";
import { resolveOrganizationBySlug } from "@/lib/db/public-booking";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const org = await resolveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "Institut introuvable." }, { status: 404 });
    }
    const products = await getPublicProducts(org.id);
    return NextResponse.json({ data: products });
  } catch (error) {
    console.error("[GET /api/public/[slug]/products]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
