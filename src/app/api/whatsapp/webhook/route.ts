import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  processWhatsAppWebhookEvent,
  verifyMetaSignature,
  verifyMetaWebhookChallenge,
  whatsappSignatureRequired,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp/webhook";
import { publicRoute } from "@/lib/http/route-scope";
import { logger } from "@/lib/logger";

const ROUTE = "/api/whatsapp/webhook";

function plainText(body: string, status: number): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

/**
 * GET /api/whatsapp/webhook
 * Vérification du webhook par Meta (WhatsApp Cloud API).
 * Paramètres query : hub.mode, hub.verify_token, hub.challenge
 */
export const GET = publicRoute(async function GET(request: NextRequest) {
  const result = verifyMetaWebhookChallenge(request.nextUrl.searchParams);
  if (!result.ok) {
    return plainText(result.message ?? "Forbidden", result.status);
  }

  // Meta attend impérativement le challenge en texte brut (Content-Type: text/plain) avec HTTP 200
  return plainText(result.challenge, 200);
});

/**
 * POST /api/whatsapp/webhook
 * Réception des événements WhatsApp (messages entrants, statuts delivered/read/failed).
 *
 * Signature X-Hub-Signature-256 vérifiée dès que WHATSAPP_APP_SECRET est défini. En production ou staging,
 * un secret absent rend tout événement invérifiable : il est refusé (503) avant la lecture du corps.
 * En développement et en test, l'absence de secret garde l'ancien comportement (événement traité).
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret && whatsappSignatureRequired()) {
    logger.error("whatsapp webhook app secret missing, event refused", { route: ROUTE, status: 503 });
    return plainText("Service Unavailable", 503);
  }

  try {
    const rawBody = await request.text();

    // 1. Vérification de la signature HMAC SHA-256 (temps constant)
    if (appSecret && !verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
      logger.warn("whatsapp webhook invalid signature", { route: ROUTE, status: 401 });
      return plainText("Unauthorized", 401);
    }

    // 2. Parsing du corps JSON
    let payload: WhatsAppWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    // 3. Traitement des événements (messages entrants, statuts, clientes rattachées)
    await processWhatsAppWebhookEvent(payload);

    // Meta requiert un HTTP 200 rapide pour acquitter la réception
    return plainText("EVENT_RECEIVED", 200);
  } catch (error) {
    logger.error("whatsapp webhook processing failed", {
      route: ROUTE,
      error: error instanceof Error ? error.name : "unknown",
    });
    // On renvoie tout de même 200 pour éviter que Meta ne coupe le webhook en cas de parsing partiel
    return plainText("EVENT_RECEIVED", 200);
  }
});
