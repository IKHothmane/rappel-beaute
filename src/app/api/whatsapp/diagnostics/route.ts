import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { diagnoseMetaWhatsAppConnection } from "@/lib/whatsapp/send";

/**
 * GET /api/whatsapp/diagnostics
 * Effectue un diagnostic temps réel de la configuration Meta WhatsApp Cloud API.
 * Accessible aux utilisateurs connectés autorisés WhatsApp.
 */
export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "whatsapp");
  if (!auth.ok) return auth.response;

  try {
    const report = await diagnoseMetaWhatsAppConnection();
    return NextResponse.json(report);
  } catch (error) {
    console.error("[GET /api/whatsapp/diagnostics]", error);
    return NextResponse.json(
      { error: "Impossible d'exécuter le diagnostic WhatsApp." },
      { status: 500 },
    );
  }
}
