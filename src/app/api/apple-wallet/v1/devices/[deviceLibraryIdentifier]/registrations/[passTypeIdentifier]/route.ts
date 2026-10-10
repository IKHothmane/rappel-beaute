import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { appleDeviceId } from "@/lib/loyalty/apple-passkit";
import { listUpdatedSerials } from "@/lib/loyalty/apple-wallet-store";

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceLibraryIdentifier: string; passTypeIdentifier: string } },
) {
  const device = appleDeviceId(params.deviceLibraryIdentifier);
  if (!device) return new NextResponse(null, { status: 401 });
  const found = await listUpdatedSerials(
    device,
    params.passTypeIdentifier,
    request.nextUrl.searchParams.get("passesUpdatedSince"),
  );
  if (!found || found.serialNumbers.length === 0) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ serialNumbers: found.serialNumbers, lastUpdated: found.lastUpdated });
}
