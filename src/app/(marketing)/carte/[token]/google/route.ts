import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createGoogleWalletSaveUrl } from "@/lib/loyalty/google-wallet";
import { googleWalletConfigured } from "@/lib/loyalty/wallet-config";

const TOKEN = /^RBLOY_[A-Z2-9]{8,32}$/;

/** Scan du QR : le téléphone ouvre cette adresse, qui envoie tout de suite vers Google Wallet. */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token.trim().toUpperCase();
  const fallback = new URL(`/carte/${token}/`, request.url);
  if (!TOKEN.test(token) || !googleWalletConfigured()) {
    return NextResponse.redirect(fallback);
  }
  try {
    const save = await createGoogleWalletSaveUrl(token, new URL(request.url).origin);
    if (save?.startsWith("https://pay.google.com/gp/v/save/")) {
      return NextResponse.redirect(save);
    }
  } catch (error) {
    console.error("[GET /carte/google]", error instanceof Error ? error.message : "wallet");
  }
  return NextResponse.redirect(fallback);
}
