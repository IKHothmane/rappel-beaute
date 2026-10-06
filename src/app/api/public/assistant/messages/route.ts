import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { assistantBookingError } from "@/lib/assistant/booking-http";
import { orchestrateWidgetMessage } from "@/lib/assistant/orchestrator";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import { clientAuthorityKey } from "@/lib/db/assistant-booking";
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
    key: "assistant:message",
    ...RATE_POLICIES.ai.ip,
  });
  if (session instanceof NextResponse) return session;
  const message =
    body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : "";
  try {
    const result = await orchestrateWidgetMessage({ session, message });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "QUOTA") {
      return NextResponse.json(
        { error: "Le quota de messages de l'assistant est atteint pour ce mois." },
        { status: 429 },
      );
    }
    if (code === "MESSAGE") {
      return NextResponse.json({ error: "Écrivez un message." }, { status: 400 });
    }
    const mapped = assistantBookingError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
