import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { cardTokenForJoinQr, enrollAnonymousFromJoinQr, previewJoinQr } from "@/lib/loyalty/join-qr";
import { loyaltyCardUrl } from "@/lib/loyalty/public-origin";
import { consumeDimensions } from "@/lib/rate-limit";

const COOKIE = "rb_join_card";

/** Page intermédiaire : envoie les cartes mémorisées par le navigateur, sinon demande une nouvelle carte. */
const RESOLVE_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Ma carte de fidélité</title>
<noscript><meta http-equiv="refresh" content="0;url=?n=1"></noscript></head>
<body style="font-family:sans-serif;text-align:center;padding:48px;color:#43293A">
<p>Chargement de votre carte…</p>
<script>
(function () {
  var list = [];
  try { list = JSON.parse(localStorage.getItem("rb_cards") || "[]"); } catch (e) {}
  if (!Array.isArray(list)) list = [];
  list = list.filter(function (t) { return typeof t === "string" && /^RBLOY_[A-Z2-9]{8,32}$/.test(t); }).slice(0, 5);
  location.replace(list.length ? "?c=" + encodeURIComponent(list.join(",")) : "?n=1");
})();
</script></body></html>`;

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
    return new NextResponse(RESOLVE_PAGE, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

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

  const response = NextResponse.redirect(loyaltyCardUrl(cardToken));
  // Un cookie « secure » n'est jamais enregistré en http (dev local, tunnel http) :
  // chaque re-scan créait alors une nouvelle carte à 0 passage.
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return remember(response, cardToken, proto === "https");
}
