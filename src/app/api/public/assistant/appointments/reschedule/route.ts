import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { assistantBookingError } from "@/lib/assistant/booking-http";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import { clientAuthorityKey, proposeAssistantReschedule } from "@/lib/db/assistant-booking";
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
    key: "assistant:reschedule",
    ...RATE_POLICIES.booking.ip,
  });
  if (session instanceof NextResponse) return session;
  try {
    const proposal = await proposeAssistantReschedule({
      session,
      body,
      idempotencyKey: request.headers.get("idempotency-key"),
    });
    return NextResponse.json(proposal, { status: proposal.status === "PENDING_CONFIRMATION" ? 201 : 200 });
  } catch (error) {
    const mapped = assistantBookingError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
