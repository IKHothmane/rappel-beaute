import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createPayments,
  getAppointmentPaymentSummary,
  listBillableAppointments,
  listPayments,
} from "@/lib/db/finance";
import { validateCreatePayments } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get("billable") === "1") {
      const data = await listBillableAppointments(auth.session.organizationId);
      return NextResponse.json({ data });
    }
    const appointmentId = url.searchParams.get("appointmentId");
    if (appointmentId && url.searchParams.get("summary") === "1") {
      const summary = await getAppointmentPaymentSummary(
        auth.session.organizationId,
        appointmentId,
      );
      if (!summary) {
        return NextResponse.json({ error: "RDV introuvable." }, { status: 404 });
      }
      return NextResponse.json(summary);
    }

    const data = await listPayments(auth.session.organizationId, {
      appointmentId: appointmentId || null,
      customerId: url.searchParams.get("customerId"),
      limit: Number(url.searchParams.get("limit")) || 40,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/payments]", error);
    return NextResponse.json({ error: "Impossible de charger les paiements." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreatePayments(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const result = await createPayments(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number]> = {
        APPOINTMENT_NOT_FOUND: ["Rendez-vous introuvable.", 404],
        NO_OPEN_SESSION: ["Ouvrez la caisse avant un encaissement espèces.", 400],
        OVERPAY: ["Le montant dépasse le reste à payer.", 400],
        GIFT_CARD_NOT_FOUND: ["Carte cadeau introuvable.", 404],
        GIFT_CARD_INACTIVE: ["Carte cadeau inactive.", 400],
        GIFT_CARD_EXPIRED: ["Carte cadeau expirée.", 400],
        GIFT_CARD_EMPTY: ["Solde carte cadeau insuffisant.", 400],
      };
      const hit = map[error.message];
      if (hit) return NextResponse.json({ error: hit[0] }, { status: hit[1] });
    }
    console.error("[POST /api/payments]", error);
    return NextResponse.json({ error: "Impossible d'enregistrer le paiement." }, { status: 500 });
  }
}
