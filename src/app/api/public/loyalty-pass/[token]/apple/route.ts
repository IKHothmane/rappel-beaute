import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAppleWalletPass } from "@/lib/loyalty/apple-wallet";
import { appleWalletConfigured, readCardToken, walletUnavailable } from "@/lib/loyalty/wallet-config";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = readCardToken(request, params.token);
  if (!token.ok) return token.response;
  if (!appleWalletConfigured()) return walletUnavailable("apple");
  try {
    const pass = await createAppleWalletPass(token.token);
    if (!pass) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    return new NextResponse(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'inline; filename="fidelite.pkpass"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/public/loyalty-pass/apple]", error instanceof Error ? error.message : "signature");
    return NextResponse.json(
      { error: "Apple Wallet n'a pas pu préparer la carte." },
      { status: 503 },
    );
  }
}
