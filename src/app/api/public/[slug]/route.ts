import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveOrganizationBySlug } from "@/lib/db/public-booking";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const org = await resolveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "Institut introuvable." }, { status: 404 });
    }
    return NextResponse.json(org);
  } catch (error) {
    console.error("[GET /api/public/[slug]]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
