import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import {
  MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE,
  parseMarketingWhatsappConsent,
  saveLoyaltyCardProfile,
} from "@/lib/loyalty/card-review";
import { LOYALTY_PHONE_ALREADY_KNOWN_CODE } from "@/lib/loyalty/profile-input";
import { consumeDimensions } from "@/lib/rate-limit";
import { publicRoute } from "@/lib/http/route-scope";
import { getLoyaltyCardSession } from "@/lib/loyalty/customer-session";

export const POST = publicRoute(async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    marketingWhatsappConsent?: unknown;
  } | null;
  if (typeof body?.token !== "string") return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  const session = await getLoyaltyCardSession(request, body.token);
  if (!session) {
    return NextResponse.json({ error: "Vérification en institut requise." }, { status: 401 });
  }
  if (body.phone) {
    return NextResponse.json({ error: "Le changement de numéro doit être vérifié par votre institut." }, { status: 400 });
  }

  const limited = await consumeDimensions([
    { key: `loyalty:profile:ip:${ip}`, limit: 15, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
    {
      key: `loyalty:profile:token:${body.token.trim().toUpperCase()}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
      sensitivity: "sensitive",
    },
  ]);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 3600) } },
    );
  }

  const consent = parseMarketingWhatsappConsent(body.marketingWhatsappConsent);
  if (!consent.ok) return NextResponse.json({ error: MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE }, { status: 400 });

  const result = await saveLoyaltyCardProfile({
    cardToken: body.token,
    expectedCustomerId: session.customerId,
    firstName: String(body.firstName ?? ""),
    lastName: String(body.lastName ?? ""),
    phone: "",
    marketingWhatsappConsent: consent.value,
  });
  if (!result.ok) {
    if (result.code === LOYALTY_PHONE_ALREADY_KNOWN_CODE) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 409 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, code: result.code });
});
