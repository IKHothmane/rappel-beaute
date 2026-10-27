import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { isSalon3dEnabledForOrg } from "@/lib/salon-3d/access";
import { getSalon3dSnapshot } from "@/lib/salon-3d/snapshot";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "resources");
  if (!auth.ok) return auth.response;

  if (!isSalon3dEnabledForOrg(auth.session.orgSlug)) {
    return NextResponse.json(
      { error: "Le plan 3D n’est pas disponible pour cet institut." },
      { status: 403 },
    );
  }

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
