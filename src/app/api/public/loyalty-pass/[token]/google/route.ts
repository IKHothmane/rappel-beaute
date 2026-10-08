import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { googleWalletConfigured, readCardToken, walletUnavailable } from "@/lib/loyalty/wallet-config";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = readCardToken(request, params.token);
  if (!token.ok) return token.response;
  if (!googleWalletConfigured()) return walletUnavailable("google");
  return NextResponse.json(
    { error: "Le compte Google Wallet est indiqué, mais le lien d'enregistrement n'est pas encore signé." },
    { status: 503 },
  );
}
