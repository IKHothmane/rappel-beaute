import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import {
  cardTokenForJoinQr,
  enrollAnonymousFromJoinQr,
  JOIN_SCAN_IP_LIMIT_PER_HOUR,
  joinCreationRateLimits,
  previewJoinQr,
} from "@/lib/loyalty/join-qr";
import {
  INVALID_QR_PAGE,
  PROGRAM_DISABLED_PAGE,
  RESOLVE_PAGE,
  TECHNICAL_ERROR_PAGE,
  tooManyRequestsPage,
} from "./join-pages";
import { loyaltyCardUrl, loyaltyPreviewUrl } from "@/lib/loyalty/public-origin";
import { consumeDimensions } from "@/lib/rate-limit";
import { publicRoute } from "@/lib/http/route-scope";

const COOKIE = "rb_join_card";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };

function page(body: string, status: number, headers?: Record<string, string>) {
  return new NextResponse(body, { status, headers: { ...HTML_HEADERS, ...headers } });
}

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
export const GET = publicRoute(async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const joinToken = params.token.trim().toUpperCase();
  const preview = await previewJoinQr(joinToken);
  if (!preview) {
    return page(INVALID_QR_PAGE, 404);
  }
  if (!preview.active) {
    return page(PROGRAM_DISABLED_PAGE, 400);
  }

  const saved = request.cookies.get(COOKIE)?.value ?? "";
  let cardToken = saved ? await cardTokenForJoinQr(joinToken, saved) : null;

  // Cookie absent : on regarde si le navigateur a gardé une carte de cet institut (localStorage).
  const url = request.nextUrl;
  if (!cardToken) {
    const candidates = (url.searchParams.get("c") ?? "").split(",").slice(0, 5);
    for (const candidate of candidates) {
      if (!candidate.trim()) continue;
      cardToken = await cardTokenForJoinQr(joinToken, candidate);
      if (cardToken) break;
    }
  }
  if (!cardToken && !url.searchParams.has("c") && !url.searchParams.has("n")) {
    return page(RESOLVE_PAGE, 200);
  }

  if (!cardToken) {
    const ip = clientIp(request);
    // 60/h par IP (Wi-Fi partagé du salon) + borne globale par QR d'inscription.
    const limited = await consumeDimensions(joinCreationRateLimits(ip, joinToken, JOIN_SCAN_IP_LIMIT_PER_HOUR));
    if (!limited.allowed) {
      const retryAfterSec = limited.retryAfterSec ?? 3600;
      return page(tooManyRequestsPage(retryAfterSec), 429, {
        "Retry-After": String(retryAfterSec),
      });
    }

    try {
      const created = await enrollAnonymousFromJoinQr(joinToken);
      cardToken = created.cardToken;
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "JOIN_QR_INVALID") {
        return page(INVALID_QR_PAGE, 404);
      }
      if (code === "PROGRAM_DISABLED") {
        return page(PROGRAM_DISABLED_PAGE, 400);
      }
      console.error("[GET /carte/rejoindre]", error);
      return page(TECHNICAL_ERROR_PAGE, 500);
    }
  }

  const response = NextResponse.redirect(
    loyaltyPreviewUrl(loyaltyCardUrl(cardToken), request.nextUrl.origin),
  );
  // Un cookie « secure » n'est jamais enregistré en http (dev local, tunnel http) :
  // chaque re-scan créait alors une nouvelle carte à 0 passage.
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return remember(response, cardToken, proto === "https");
});
