import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  processWhatsAppWebhookEvent,
  verifyMetaSignature,
  verifyMetaWebhookChallenge,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp/webhook";

/**
 * GET /api/whatsapp/webhook
 * Vérification du webhook par Meta (WhatsApp Cloud API).
 * Paramètres query : hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  const result = verifyMetaWebhookChallenge(request.nextUrl.searchParams);
  if (!result.ok) {
    return new Response(result.status === 500 ? "Configuration error" : "Forbidden", {
      status: result.status,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Meta attend impérativement le challenge en texte brut (Content-Type: text/plain) avec HTTP 200
  return new Response(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * POST /api/whatsapp/webhook
 * Réception des événements WhatsApp (messages entrants, statuts delivered/read/failed).
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // 1. Vérification de la signature HMAC SHA-256 si le secret d'application Meta est configuré
    const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
    if (appSecret) {
      const signatureHeader = request.headers.get("x-hub-signature-256");
      const isValid = verifyMetaSignature(rawBody, signatureHeader, appSecret);
      if (!isValid) {
        console.warn("[POST /api/whatsapp/webhook] Signature Meta invalide");
        return new Response("Invalid signature", {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    // 2. Parsing du corps JSON
    let payload: WhatsAppWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    // 3. Traitement asynchrone des événements (messages entrants, statuts, clients rattachés)
    await processWhatsAppWebhookEvent(payload);

    // Meta requiert un HTTP 200 rapide pour acquitter la réception
    return new Response("EVENT_RECEIVED", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("[POST /api/whatsapp/webhook]", error);
    // On renvoie tout de même 200 pour éviter que Meta ne coupe le webhook en cas de parsing partiel
    return new Response("EVENT_RECEIVED", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
