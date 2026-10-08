import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite } from "@/lib/auth/api-guard";
import { getActiveJoinQr, regenerateJoinQr, revokeJoinQr } from "@/lib/loyalty/join-qr";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "loyalty");
  if (!auth.ok) return auth.response;
  const qr = await getActiveJoinQr(auth.session.organizationId);
  return NextResponse.json({ qr });
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "loyalty");
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "revoke") {
    await revokeJoinQr(auth.session.organizationId);
    return NextResponse.json({ qr: null });
  }
  const qr = await regenerateJoinQr(auth.session.organizationId);
  return NextResponse.json({ qr });
}
