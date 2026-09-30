import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getPublicStaffForService,
  resolveOrganizationBySlug,
} from "@/lib/db/public-booking";
import { getClientIp } from "@/lib/http/client-ip";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const ip = getClientIp(request);
  const rl = await consumeDimensions([
    { key: `public:staff:${ip}`, ...RATE_POLICIES.publicRead },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }
  const sp = new URL(request.url).searchParams;
  sp.delete("organizationId");
  const serviceId = sp.get("serviceId")?.trim();
  const date = sp.get("date")?.trim() ?? undefined;

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId requis." }, { status: 400 });
  }

  try {
    const org = await resolveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "Institut introuvable." }, { status: 404 });
    }
    const data = await getPublicStaffForService(org.id, serviceId, date);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/public/[slug]/staff]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
