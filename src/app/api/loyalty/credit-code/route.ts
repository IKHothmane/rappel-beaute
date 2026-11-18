import { NextResponse, type NextRequest } from "next/server";
import { requireFeatureWrite } from "@/lib/auth/api-guard";
import { tenantRoute } from "@/lib/http/route-scope";

async function retiredCreditCode(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "loyalty");
  if (!auth.ok) return auth.response;
  return NextResponse.json(
    { error: "Scannez le QR code de la carte pour confirmer un passage." },
    { status: 410 },
  );
}

export const GET = tenantRoute(retiredCreditCode);
export const POST = tenantRoute(retiredCreditCode);
