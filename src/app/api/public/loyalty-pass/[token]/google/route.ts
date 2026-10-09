import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createGoogleWalletSaveUrl } from "@/lib/loyalty/google-wallet";
import { googleWalletConfigured, readCardToken, walletUnavailable } from "@/lib/loyalty/wallet-config";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = readCardToken(request, params.token);
  if (!token.ok) return token.response;
  if (!googleWalletConfigured()) return walletUnavailable("google");
  try {
    const url = await createGoogleWalletSaveUrl(token.token, new URL(request.url).origin);
    if (!url) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[GET /api/public/loyalty-pass/google]", error);
    return NextResponse.json(
      { error: "Google Wallet n'a pas pu préparer la carte." },
      { status: 503 },
    );
  }
}
