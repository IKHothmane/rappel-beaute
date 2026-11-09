import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import { assistantAppointmentContext } from "@/lib/db/assistant-booking";
import { getPublicAvailabilitySlots } from "@/lib/db/public-booking";
import { RATE_POLICIES } from "@/lib/rate-limit";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export async function GET(request: NextRequest) {
  const session = await requireWidgetOrganization(request, {
    key: "assistant:availability",
    ...RATE_POLICIES.availability,
  });
  if (session instanceof NextResponse) return session;

  let serviceId = request.nextUrl.searchParams.get("serviceId")?.trim() ?? "";
  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";
  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  const phone = request.nextUrl.searchParams.get("phone")?.trim() ?? "";
  if (!isCalendarDate(date)) {
    return NextResponse.json({ error: "date requise (AAAA-MM-JJ)." }, { status: 400 });
  }

  let excludeAppointmentId: string | undefined;
  if (reference || phone) {
    if (!reference || !phone) {
      return NextResponse.json({ error: "Référence et téléphone requis." }, { status: 400 });
    }
    try {
      const owned = await assistantAppointmentContext({
        organizationId: session.organizationId,
        reference,
        phone,
      });
      if (serviceId && serviceId !== owned.serviceId) {
        return NextResponse.json({ error: "Paramètre non autorisé." }, { status: 403 });
      }
      serviceId = owned.serviceId;
      excludeAppointmentId = owned.id;
    } catch (error) {
      if (error instanceof Error && error.message === "APPOINTMENT_NOT_FOUND") {
        return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
      }
      return NextResponse.json({ error: "Créneaux indisponibles." }, { status: 500 });
    }
  }
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId requis." }, { status: 400 });
  }

  try {
    const slots = await getPublicAvailabilitySlots(session.organizationId, {
      serviceId,
      date,
      excludeAppointmentId,
    });
    return NextResponse.json({
      slots: slots.filter((slot) => slot.available).map((slot) => ({ time: slot.time })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SERVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
    }
    return NextResponse.json({ error: "Créneaux indisponibles." }, { status: 500 });
  }
}
