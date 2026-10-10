import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { appleAuthorizationToken, appleDeviceId } from "@/lib/loyalty/apple-passkit";
import { registerAppleDevice, unregisterAppleDevice } from "@/lib/loyalty/apple-wallet-store";

type Params = {
  params: {
    deviceLibraryIdentifier: string;
    passTypeIdentifier: string;
    serialNumber: string;
  };
};

export async function POST(request: NextRequest, { params }: Params) {
  const device = appleDeviceId(params.deviceLibraryIdentifier);
  const token = appleAuthorizationToken(request.headers.get("authorization"));
  if (!device || !token) return new NextResponse(null, { status: 401 });
  let body: { pushToken?: unknown } = {};
  try {
    body = (await request.json()) as { pushToken?: unknown };
  } catch {
    return new NextResponse(null, { status: 401 });
  }
  if (typeof body.pushToken !== "string") return new NextResponse(null, { status: 401 });
  const status = await registerAppleDevice({
    deviceLibraryIdentifier: device,
    passTypeIdentifier: params.passTypeIdentifier,
    serialNumber: params.serialNumber,
    authenticationToken: token,
    pushToken: body.pushToken,
  });
  return new NextResponse(null, { status });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const device = appleDeviceId(params.deviceLibraryIdentifier);
  const token = appleAuthorizationToken(request.headers.get("authorization"));
  if (!device || !token) return new NextResponse(null, { status: 401 });
  const status = await unregisterAppleDevice({
    deviceLibraryIdentifier: device,
    passTypeIdentifier: params.passTypeIdentifier,
    serialNumber: params.serialNumber,
    authenticationToken: token,
  });
  return new NextResponse(null, { status });
}
