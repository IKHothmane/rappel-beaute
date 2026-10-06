import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import {
  clientAuthorityKey,
  proposeAssistantAppointment,
} from "@/lib/db/assistant-booking";
import { consumeDimensions, phoneKey, RATE_POLICIES } from "@/lib/rate-limit";
import { assistantBookingError } from "@/lib/assistant/booking-http";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  if (clientAuthorityKey(body)) {
    return NextResponse.json({ error: "Paramètre non autorisé." }, { status: 403 });
  }

  const session = await requireWidgetOrganization(request, {
    key: "assistant:booking",
    ...RATE_POLICIES.booking.ip,
  });
  if (session instanceof NextResponse) return session;

  const phone = typeof body === "object" && body && "phone" in body ? String(body.phone ?? "") : "";
  const phoneRl = await consumeDimensions([
    { key: `assistant:booking:phone:${phoneKey(phone)}`, ...RATE_POLICIES.booking.phone },
  ]);
  if (!phoneRl.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives pour ce numéro. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(phoneRl.retryAfterSec ?? 3600) } },
    );
  }

  try {
    const proposal = await proposeAssistantAppointment({
      session,
      body,
      idempotencyKey: request.headers.get("idempotency-key"),
    });
    const status = proposal.status === "PENDING_CONFIRMATION" ? 201 : 200;
    return NextResponse.json(proposal, { status });
  } catch (error) {
    const mapped = assistantBookingError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
