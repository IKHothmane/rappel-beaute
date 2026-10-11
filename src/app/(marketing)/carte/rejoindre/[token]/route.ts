import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { createAppleWalletPass } from "@/lib/loyalty/apple-wallet";
import { createGoogleWalletSaveUrl } from "@/lib/loyalty/google-wallet";
import { cardTokenForJoinQr, enrollAnonymousFromJoinQr, previewJoinQr } from "@/lib/loyalty/join-qr";
import { appleWalletConfigured, googleWalletConfigured } from "@/lib/loyalty/wallet-config";
import { consumeDimensions } from "@/lib/rate-limit";
import { requestCardOrigin } from "@/lib/loyalty/public-origin";

const COOKIE = "rb_join_card";

function isApplePhone(request: NextRequest) {
  return /iPhone|iPad|iPod/i.test(request.headers.get("user-agent") || "");
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

async function walletResponse(request: NextRequest, cardToken: string) {
  const origin = requestCardOrigin(request);
  const fallback = `${origin}/carte/${cardToken}/`;
  if (isApplePhone(request) && appleWalletConfigured()) {
    try {
      const pass = await createAppleWalletPass(cardToken);
      if (pass) {
        return new NextResponse(new Uint8Array(pass), {
          headers: {
            "Content-Type": "application/vnd.apple.pkpass",
            "Content-Disposition": 'inline; filename="fidelite.pkpass"',
            "Cache-Control": "no-store",
          },
        });
      }
    } catch (error) {
      console.error("[GET /carte/rejoindre] apple", error instanceof Error ? error.message : "signature");
    }
  }
  if (googleWalletConfigured()) {
    try {
      const save = await createGoogleWalletSaveUrl(cardToken, origin);
      if (save?.startsWith("https://pay.google.com/gp/v/save/")) {
        return NextResponse.redirect(save);
      }
    } catch (error) {
      console.error("[GET /carte/rejoindre] google", error instanceof Error ? error.message : "wallet");
    }
  }
  return NextResponse.redirect(fallback);
}

/** Scan du QR institut : carte à 0 passage, ajout direct au Wallet du téléphone. */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const joinToken = params.token.trim().toUpperCase();
  const preview = await previewJoinQr(joinToken);
  if (!preview) return NextResponse.json({ error: "Ce QR n'est plus valable." }, { status: 404 });
  if (!preview.active) {
    return NextResponse.json({ error: "Le programme de fidélité est désactivé." }, { status: 400 });
  }

  const saved = request.cookies.get(COOKIE)?.value ?? "";
  const existing = saved ? await cardTokenForJoinQr(joinToken, saved) : null;
  let cardToken = existing;
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

  const response = await walletResponse(request, cardToken);
  return remember(response, cardToken, request.url.startsWith("https:"));
}
