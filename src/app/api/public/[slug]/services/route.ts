import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicServices, resolveOrganizationBySlug } from "@/lib/db/public-booking";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const org = await resolveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "Institut introuvable." }, { status: 404 });
    }
    const services = await getPublicServices(org.id);
    return NextResponse.json({ data: services });
  } catch (error) {
    console.error("[GET /api/public/[slug]/services]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
