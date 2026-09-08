import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  resolveOrganizationBySlug,
  resolvePublicServiceRef,
  resolvePublicStaffRef,
} from "@/lib/db/public-booking";
import { recordPublicBookingEvent } from "@/lib/db/public-booking-events";
import {
  checkRateLimit,
  publicRateLimitKey,
  PUBLIC_RATE_LIMITS,
} from "@/lib/rate-limit";
import { clientIp } from "@/lib/public-booking/validation";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { slug } = await context.params;
  const ip = clientIp(request);
  const rl = await checkRateLimit({
    key: publicRateLimitKey(ip, slug, "events"),
    ...PUBLIC_RATE_LIMITS.availability,
  });
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

    const body = (await request.json()) as {
      eventType?: string;
      source?: string;
      service?: string;
      staff?: string;
    };

    if (body.eventType !== "VIEW") {
      return NextResponse.json({ error: "Type d'événement invalide." }, { status: 400 });
    }

    let serviceId: string | null = null;
    let staffId: string | null = null;

    if (body.service) {
      const svc = await resolvePublicServiceRef(org.id, body.service);
      if (!svc) {
        return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
      }
      serviceId = svc.id;
    }

    if (body.staff) {
      const st = await resolvePublicStaffRef(org.id, body.staff, serviceId);
      if (!st) {
        return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
      }
      staffId = st.id;
    }

    await recordPublicBookingEvent({
      organizationId: org.id,
      eventType: "VIEW",
      source: body.source ?? null,
      serviceId,
      staffId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/public/[slug]/events]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
