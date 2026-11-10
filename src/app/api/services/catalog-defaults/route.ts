import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { getServiceCatalogDefaultsMap } from "@/lib/db/service-catalog";
import { tenantRoute } from "@/lib/http/route-scope";

export const GET = tenantRoute(async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "services");
  if (!auth.ok) return auth.response;

  try {
    const defaults = await getServiceCatalogDefaultsMap();
    return NextResponse.json({ defaults });
  } catch (error) {
    console.error("[GET /api/services/catalog-defaults]", error);
    return NextResponse.json({ error: "Impossible de charger les images par défaut." }, { status: 500 });
  }
});
