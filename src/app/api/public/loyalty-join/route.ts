import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { createGoogleWalletSaveUrl } from "@/lib/loyalty/google-wallet";
import { requestCardOrigin } from "@/lib/loyalty/public-origin";
import {
  enrollFromJoinQr,
  JOIN_FORM_IP_LIMIT_PER_HOUR,
  joinCreationRateLimits,
  previewJoinQr,
} from "@/lib/loyalty/join-qr";
import {
  MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE,
  parseMarketingWhatsappConsent,
} from "@/lib/loyalty/card-review";
import { LOYALTY_PHONE_ALREADY_KNOWN_CODE, LOYALTY_PHONE_ALREADY_KNOWN_MESSAGE } from "@/lib/loyalty/profile-input";
import { consumeDimensions } from "@/lib/rate-limit";
import { publicRoute } from "@/lib/http/route-scope";

function publicError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "JOIN_QR_INVALID") {
    return NextResponse.json({ error: "Ce QR n'est plus valable." }, { status: 404 });
  }
  if (code === "PROGRAM_DISABLED") {
    return NextResponse.json({ error: "Le programme de fidélité est désactivé." }, { status: 400 });
  }
  if (code === "INVALID_PHONE") {
    return NextResponse.json({ error: "Indiquez un téléphone de 8 à 10 chiffres." }, { status: 400 });
  }
  if (code === LOYALTY_PHONE_ALREADY_KNOWN_CODE) {
    return NextResponse.json(
      { error: LOYALTY_PHONE_ALREADY_KNOWN_MESSAGE, code: LOYALTY_PHONE_ALREADY_KNOWN_CODE },
      { status: 409 },
    );
  }
  if (code === "INVALID_NAME") {
    return NextResponse.json({ error: "Indiquez le prénom et le nom." }, { status: 400 });
  }
  return null;
}

export const GET = publicRoute(async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const qr = await previewJoinQr(token);
  if (!qr) return NextResponse.json({ error: "Ce QR n'est plus valable." }, { status: 404 });
  return NextResponse.json({
    organizationName: qr.organizationName,
    programName: qr.programName,
    visitsPerReward: qr.visitsPerReward,
    rewardLabel: qr.rewardLabel,
    active: qr.active,
  });
});

export const POST = publicRoute(async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    phone?: unknown;
    email?: unknown;
    marketingWhatsappConsent?: unknown;
  } | null;

  // IP inchangée à 20/h (saisie manuelle, pas de scan en rafale) ; le compteur par QR (400/h) est partagé avec le scan.
  const limited = await consumeDimensions(joinCreationRateLimits(ip, body?.token, JOIN_FORM_IP_LIMIT_PER_HOUR));
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 3600) } },
    );
  }

  if (typeof body?.token !== "string" || !body.token) return NextResponse.json({ error: "QR manquant." }, { status: 400 });
  const consent = parseMarketingWhatsappConsent(body.marketingWhatsappConsent);
  if (!consent.ok) return NextResponse.json({ error: MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE }, { status: 400 });

  try {
    const created = await enrollFromJoinQr({
      token: body.token,
      firstName: typeof body.firstName === "string" ? body.firstName : "",
      lastName: typeof body.lastName === "string" ? body.lastName : "",
      phone: typeof body.phone === "string" ? body.phone : "",
      email: typeof body.email === "string" ? body.email : undefined,
      marketingWhatsappConsent: consent.value,
    });
    let googleWalletUrl: string | null = null;
    try {
      googleWalletUrl = await createGoogleWalletSaveUrl(created.cardToken, requestCardOrigin(request));
    } catch (walletError) {
      console.error("[POST /api/public/loyalty-join] google wallet", walletError instanceof Error ? walletError.message : "objet");
    }
    return NextResponse.json({
      ok: true,
      cardPath: `/carte/${created.cardToken}/`,
      googleWalletUrl,
    });
  } catch (error) {
    const known = publicError(error);
    if (known) return known;
    console.error("[POST /api/public/loyalty-join]", error);
    return NextResponse.json({ error: "Impossible de créer la carte." }, { status: 500 });
  }
});
