import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { cardTokenForJoinQr, enrollAnonymousFromJoinQr, previewJoinQr } from "@/lib/loyalty/join-qr";
import { consumeDimensions } from "@/lib/rate-limit";

const COOKIE = "rb_join_card";

function remember(response: NextResponse, cardToken: string, secure: boolean) {
  response.cookies.set(COOKIE, cardToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

/**
 * Journey after scanning the institute's join QR:
 * issue/reuse one anonymous card, remember it on the device, then show the
 * customer-facing card page. Wallet installation is deliberately an explicit
 * action on that page, instead of skipping directly to a wallet app.
 */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const joinToken = params.token.trim().toUpperCase();
  const preview = await previewJoinQr(joinToken);
  if (!preview) {
    return NextResponse.json({ error: "Ce QR n'est plus valable." }, { status: 404 });
  }
  if (!preview.active) {
    return NextResponse.json({ error: "Le programme de fidélité est désactivé." }, { status: 400 });
  }

  const saved = request.cookies.get(COOKIE)?.value ?? "";
  let cardToken = saved ? await cardTokenForJoinQr(joinToken, saved) : null;

  if (!cardToken) {
    const ip = clientIp(request);
    const limited = await consumeDimensions([
      { key: `loyalty:join:ip:${ip}`, limit: 20, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
    ]);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 3600) } },
      );
    }

    try {
      const created = await enrollAnonymousFromJoinQr(joinToken);
      cardToken = created.cardToken;
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "JOIN_QR_INVALID") {
        return NextResponse.json({ error: "Ce QR n'est plus valable." }, { status: 404 });
      }
      if (code === "PROGRAM_DISABLED") {
        return NextResponse.json({ error: "Le programme de fidélité est désactivé." }, { status: 400 });
      }
      console.error("[GET /carte/rejoindre]", error);
      return NextResponse.json({ error: "Impossible de créer la carte." }, { status: 500 });
    }
  }

  const response = NextResponse.redirect(new URL(`/carte/${cardToken}/`, request.url));
  return remember(response, cardToken, request.url.startsWith("https:"));
}
