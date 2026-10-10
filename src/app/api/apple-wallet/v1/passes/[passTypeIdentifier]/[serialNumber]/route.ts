import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { appleAuthorizationToken, passChangedSince } from "@/lib/loyalty/apple-passkit";
import { authorizedPassUpdatedAt } from "@/lib/loyalty/apple-wallet-store";
import { createAppleWalletPass } from "@/lib/loyalty/apple-wallet";

export async function GET(
  request: NextRequest,
  { params }: { params: { passTypeIdentifier: string; serialNumber: string } },
) {
  const token = appleAuthorizationToken(request.headers.get("authorization"));
  if (!token) return new NextResponse(null, { status: 401 });
  const updatedAt = await authorizedPassUpdatedAt(params.serialNumber, token, params.passTypeIdentifier);
  if (!updatedAt) return new NextResponse(null, { status: 401 });
  if (!passChangedSince(updatedAt, request.headers.get("if-modified-since"))) {
    return new NextResponse(null, { status: 304 });
  }
  const pass = await createAppleWalletPass(params.serialNumber);
  if (!pass) return new NextResponse(null, { status: 401 });
  return new NextResponse(new Uint8Array(pass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": updatedAt.toUTCString(),
      "Cache-Control": "no-store",
    },
  });
}
