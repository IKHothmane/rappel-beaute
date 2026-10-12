import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite } from "@/lib/auth/api-guard";
import {
  getOrganizationWhatsappFrom,
  setOrganizationWhatsappFrom,
} from "@/lib/db/organization";
import { parseInstituteWhatsappNumber } from "@/lib/whatsapp/twilio";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;
  const whatsappFrom = await getOrganizationWhatsappFrom(auth.session.organizationId);
  return NextResponse.json({ whatsappFrom });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "settings");
  if (!auth.ok) return auth.response;

  let body: { whatsappFrom?: unknown };
  try {
    body = (await request.json()) as { whatsappFrom?: unknown };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (typeof body.whatsappFrom !== "string") {
    return NextResponse.json({ error: "Indiquez le numéro WhatsApp." }, { status: 400 });
  }

  const parsed = parseInstituteWhatsappNumber(body.whatsappFrom);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await setOrganizationWhatsappFrom(auth.session.organizationId, parsed.value);
  return NextResponse.json({ whatsappFrom: parsed.value });
}
