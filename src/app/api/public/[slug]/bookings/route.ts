import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPublicBooking } from "@/lib/db/public-booking";
import {
  PUBLIC_RATE_LIMITS,
  bookingCompositeRateLimitKey,
  checkRateLimit,
  publicRateLimitKey,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { clientIp, parsePublicBookingBody } from "@/lib/public-booking/validation";

type RouteContext = { params: Promise<{ slug: string }> };

function bookingError(error: unknown): { status: number; message: string } {
  if (!(error instanceof Error)) {
    return { status: 500, message: "Impossible de confirmer le rendez-vous." };
  }
  const map: Record<string, { status: number; message: string }> = {
    ORG_NOT_FOUND: { status: 404, message: "Institut introuvable." },
    SERVICE_NOT_FOUND: { status: 404, message: "Prestation introuvable." },
    SLOT_UNAVAILABLE: {
      status: 409,
      message: "Ce créneau n'est plus disponible. Veuillez choisir un autre horaire.",
    },
    SLOT_CONFLICT: {
      status: 409,
      message: "Ce créneau vient d'être réservé. Veuillez choisir un autre horaire.",
    },
    SLOT_PAST: { status: 400, message: "Ce créneau est dans le passé." },
    FEATURE_NOT_INCLUDED: {
      status: 403,
      message: "La réservation en ligne n'est pas incluse dans l'abonnement de cet institut.",
    },
    LIMIT_REACHED: {
      status: 403,
      message: "Limite de rendez-vous mensuelle atteinte pour cet institut.",
    },
    SUBSCRIPTION_INACTIVE: {
      status: 403,
      message: "Les réservations en ligne sont temporairement indisponibles.",
    },
  };
  return map[error.message] ?? { status: 500, message: "Impossible de confirmer le rendez-vous." };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const ip = clientIp(request);
  const rl = await checkRateLimit({
    key: publicRateLimitKey(ip, slug, "bookings"),
    ...PUBLIC_RATE_LIMITS.bookings,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de réservations. Réessayez dans quelques instants." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = parsePublicBookingBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const phoneRl = await checkRateLimit({
      key: bookingCompositeRateLimitKey(ip, slug, parsed.data.phone),
      ...PUBLIC_RATE_LIMITS.bookingsPerPhone,
    });
    if (!phoneRl.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives pour ce numéro. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(phoneRl.retryAfterSec ?? 3600) } },
      );
    }

    const result = await createPublicBooking(slug, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const mapped = bookingError(error);
    if (mapped.status >= 500) {
      logger.error("public booking failed", { route: "/api/public/bookings", status: mapped.status });
    }
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
