import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPublicBooking } from "@/lib/db/public-booking";
import {
  claimIdempotency,
  consumeDimensions,
  identityHash,
  phoneKey,
  RATE_POLICIES,
  releaseIdempotency,
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
  const ipRl = await consumeDimensions([
    {
      key: `booking:ip:${slug}:${ip}`,
      ...RATE_POLICIES.booking.ip,
      sensitivity: "sensitive",
    },
  ]);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Trop de réservations. Réessayez dans quelques instants." },
      { status: 429, headers: { "Retry-After": String(ipRl.retryAfterSec ?? 60) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = parsePublicBookingBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const phone = phoneKey(parsed.data.customer.phone);
    const phoneRl = await consumeDimensions([
      { key: `booking:phone:${phone}`, ...RATE_POLICIES.booking.phone, sensitivity: "sensitive" },
      {
        key: `booking:ip-phone:${ip}:${phone}`,
        ...RATE_POLICIES.booking.pair,
        sensitivity: "sensitive",
      },
    ]);
    if (!phoneRl.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives pour ce numéro. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(phoneRl.retryAfterSec ?? 3600) } },
      );
    }

    const headerKey = request.headers.get("idempotency-key")?.trim();
    const idem =
      headerKey && headerKey.length <= 80
        ? identityHash(`${slug}:${headerKey}`)
        : identityHash(
            `${slug}:${phone}:${parsed.data.serviceId}:${parsed.data.date}:${parsed.data.time}`,
          );
    const fresh = await claimIdempotency(`booking:${idem}`, 120);
    if (!fresh) {
      return NextResponse.json(
        { error: "Cette réservation a déjà été envoyée." },
        { status: 409 },
      );
    }

    try {
      const result = await createPublicBooking(slug, parsed.data);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      await releaseIdempotency(`booking:${idem}`);
      throw error;
    }
  } catch (error) {
    const mapped = bookingError(error);
    if (mapped.status >= 500) {
      logger.error("public booking failed", { route: "/api/public/bookings", status: mapped.status });
    }
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
