import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { getSalon3dSnapshot } from "@/lib/salon-3d/snapshot";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const snapshot = await getSalon3dSnapshot(auth.session.organizationId);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GET /api/salon-3d]", error);
    return NextResponse.json(
      { error: "Impossible de charger le plan 3D." },
      { status: 500 },
    );
  }
}
