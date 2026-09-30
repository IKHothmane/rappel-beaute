import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicServices, resolveOrganizationBySlug } from "@/lib/db/public-booking";
import { getClientIp } from "@/lib/http/client-ip";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const ip = getClientIp(request);
  const rl = await consumeDimensions([
    { key: `public:services:${ip}`, ...RATE_POLICIES.publicRead },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }
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
