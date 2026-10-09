import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAppleWalletPass } from "@/lib/loyalty/apple-wallet";
import { createGoogleWalletSaveUrl } from "@/lib/loyalty/google-wallet";
import { appleWalletConfigured, googleWalletConfigured } from "@/lib/loyalty/wallet-config";
import { SITE } from "@/lib/site";

const TOKEN = /^RBLOY_[A-Z2-9]{8,32}$/;

function isApplePhone(request: NextRequest) {
  return /iPhone|iPad|iPod/i.test(request.headers.get("user-agent") || "");
}

/** Scan du QR : iPhone reçoit le .pkpass, les autres téléphones ouvrent Google Wallet. */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token.trim().toUpperCase();
  const fallback = `${SITE.url}/carte/${token}/`;
  if (!TOKEN.test(token)) return NextResponse.redirect(fallback);
  if (isApplePhone(request) && appleWalletConfigured()) {
    try {
      const pass = await createAppleWalletPass(token);
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
      console.error("[GET /carte/google] apple", error instanceof Error ? error.message : "signature");
    }
    return NextResponse.redirect(`${SITE.url}/carte/${token}/`);
  }
  if (!googleWalletConfigured()) return NextResponse.redirect(fallback);
  try {
    const requestOrigin = new URL(request.url).origin;
    const publicOrigin = /localhost|127\.0\.0\.1/.test(requestOrigin) ? SITE.url : requestOrigin;
    const save = await createGoogleWalletSaveUrl(token, publicOrigin);
    if (save?.startsWith("https://pay.google.com/gp/v/save/")) {
      return NextResponse.redirect(save);
    }
  } catch (error) {
    console.error("[GET /carte/google]", error instanceof Error ? error.message : "wallet");
  }
  return NextResponse.redirect(fallback);
}
