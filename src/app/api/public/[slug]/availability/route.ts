import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getPublicAvailabilitySlots,
  getPublicAvailableDates,
  resolveOrganizationBySlug,
} from "@/lib/db/public-booking";
import {
  PUBLIC_RATE_LIMITS,
  checkRateLimit,
  publicRateLimitKey,
} from "@/lib/rate-limit";
import { clientIp } from "@/lib/public-booking/validation";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const ip = clientIp(request);
  const rl = await checkRateLimit({
    key: publicRateLimitKey(ip, slug, "availability"),
    ...PUBLIC_RATE_LIMITS.availability,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans quelques instants." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  const sp = new URL(request.url).searchParams;
  sp.delete("organizationId");
  const serviceId = sp.get("serviceId")?.trim();
  const staffId = sp.get("staffId")?.trim() || null;
  const date = sp.get("date")?.trim();
  const from = sp.get("from")?.trim();
  const to = sp.get("to")?.trim();

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId requis." }, { status: 400 });
  }

  try {
    const org = await resolveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "Institut introuvable." }, { status: 404 });
    }

    if (from && to) {
      const dates = await getPublicAvailableDates(org.id, {
        serviceId,
        from,
        to,
        staffId: staffId === "any" ? null : staffId,
      });
      return NextResponse.json({ dates });
    }

    if (!date) {
      return NextResponse.json({ error: "date ou from/to requis." }, { status: 400 });
    }

    const slots = await getPublicAvailabilitySlots(org.id, {
      serviceId,
      date,
      staffId: staffId === "any" ? null : staffId,
    });
    return NextResponse.json({ slots });
  } catch (error) {
    console.error("[GET /api/public/[slug]/availability]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
