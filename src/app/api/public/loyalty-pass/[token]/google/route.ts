import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createGoogleWalletSaveUrl } from "@/lib/loyalty/google-wallet";
import { requestCardOrigin } from "@/lib/loyalty/public-origin";
import { googleWalletConfigured, readCardToken, walletUnavailable } from "@/lib/loyalty/wallet-config";
import { publicRoute } from "@/lib/http/route-scope";
import { getLoyaltyCardSession } from "@/lib/loyalty/customer-session";

export const GET = publicRoute(async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = readCardToken(request, params.token);
  if (!token.ok) return token.response;
  const session = await getLoyaltyCardSession(request, token.token);
  if (!session) {
    return NextResponse.json({ error: "Vérification en institut requise." }, { status: 401 });
  }
  if (!googleWalletConfigured()) return walletUnavailable("google");
  try {
    const url = await createGoogleWalletSaveUrl(token.token, requestCardOrigin(request), session.customerId);
    if (!url) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[GET /api/public/loyalty-pass/google]", error);
    return NextResponse.json(
      { error: "Google Wallet n'a pas pu préparer la carte." },
      { status: 503 },
    );
  }
});
