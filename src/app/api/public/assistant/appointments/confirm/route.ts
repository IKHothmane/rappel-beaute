import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import { assistantBookingError } from "@/lib/assistant/booking-http";
import {
  clientAuthorityKey,
  closeAssistantProposal,
  confirmAssistantAppointment,
} from "@/lib/db/assistant-booking";
import { RATE_POLICIES } from "@/lib/rate-limit";

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
    key: "assistant:confirm",
    ...RATE_POLICIES.booking.ip,
  });
  if (session instanceof NextResponse) return session;

  const actionId =
    body && typeof body === "object" && "actionId" in body && typeof body.actionId === "string"
      ? body.actionId.trim()
      : "";
  if (!actionId) {
    return NextResponse.json({ error: "Proposition requise." }, { status: 400 });
  }

  try {
    const proposal = await confirmAssistantAppointment({ session, actionId });
    return NextResponse.json(proposal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SLOT_UNAVAILABLE" || message === "SLOT_CONFLICT" || message === "SLOT_PAST") {
      await closeAssistantProposal(actionId, session.organizationId, "FAILED");
    }
    if (message === "ACTION_EXPIRED") {
      await closeAssistantProposal(actionId, session.organizationId, "EXPIRED");
    }
    if (message === "APPOINTMENT_CLOSED" || message === "APPOINTMENT_NOT_FOUND") {
      await closeAssistantProposal(actionId, session.organizationId, "FAILED");
    }
    const mapped = assistantBookingError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
