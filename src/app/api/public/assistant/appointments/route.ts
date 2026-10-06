import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { assistantBookingError } from "@/lib/assistant/booking-http";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import { lookupAssistantAppointment } from "@/lib/db/assistant-booking";
import { RATE_POLICIES } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await requireWidgetOrganization(request, {
    key: "assistant:appointments",
    ...RATE_POLICIES.availability,
  });
  if (session instanceof NextResponse) return session;

  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  const phone = request.nextUrl.searchParams.get("phone")?.trim() ?? "";
  if (!reference || !phone) {
    return NextResponse.json({ error: "Référence et téléphone requis." }, { status: 400 });
  }

  try {
    const appointment = await lookupAssistantAppointment({
      organizationId: session.organizationId,
      reference,
      phone,
    });
    return NextResponse.json({ appointment });
  } catch (error) {
    const mapped = assistantBookingError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
