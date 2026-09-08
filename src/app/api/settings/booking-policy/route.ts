import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  getOrCreateBookingPolicy,
  updateBookingPolicy,
} from "@/lib/db/booking-policy";
import { validateUpdateBookingPolicy } from "@/lib/validation/booking-policy";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;
  try {
    const settings = await getOrCreateBookingPolicy(auth.session.organizationId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[GET /api/settings/booking-policy]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "settings");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateUpdateBookingPolicy(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    const settings = await updateBookingPolicy(
      auth.session.organizationId,
      validated.data,
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[PATCH /api/settings/booking-policy]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
