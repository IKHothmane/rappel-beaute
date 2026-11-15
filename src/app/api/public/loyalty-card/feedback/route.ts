import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import {
  MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE,
  parseMarketingWhatsappConsent,
  submitLoyaltyCardFeedback,
} from "@/lib/loyalty/card-review";
import { LOYALTY_PHONE_ALREADY_KNOWN_CODE } from "@/lib/loyalty/profile-input";
import { consumeDimensions } from "@/lib/rate-limit";
import { publicRoute } from "@/lib/http/route-scope";

export const POST = publicRoute(async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    marketingWhatsappConsent?: unknown;
    rating?: number;
    comment?: string;
    staffId?: string;
    staffRating?: number;
    staffRatings?: { staffId: string; rating?: number | null }[];
  } | null;
  if (!body?.token) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

  const limited = await consumeDimensions([
    { key: `loyalty:feedback:ip:${ip}`, limit: 8, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
    {
      key: `loyalty:feedback:token:${body.token.trim().toUpperCase()}`,
      limit: 6,
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

  const result = await submitLoyaltyCardFeedback({
    cardToken: body.token,
    firstName: String(body.firstName ?? ""),
    lastName: String(body.lastName ?? ""),
    phone: String(body.phone ?? ""),
    marketingWhatsappConsent: consent.value,
    rating: body.rating == null ? undefined : Number(body.rating),
    comment: String(body.comment ?? ""),
    staffId: typeof body.staffId === "string" ? body.staffId : undefined,
    staffRating: body.staffRating == null ? undefined : Number(body.staffRating),
    staffRatings: body.staffRatings,
  });
  if (!result.ok) {
    if (result.code === LOYALTY_PHONE_ALREADY_KNOWN_CODE) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 409 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
});
