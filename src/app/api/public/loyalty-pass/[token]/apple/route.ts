import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { appleWalletConfigured, readCardToken, walletUnavailable } from "@/lib/loyalty/wallet-config";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = readCardToken(request, params.token);
  if (!token.ok) return token.response;
  if (!appleWalletConfigured()) return walletUnavailable("apple");
  return NextResponse.json(
    { error: "Le certificat Apple Wallet est indiqué, mais le fichier .pkpass n'est pas encore signé." },
    { status: 503 },
  );
}
