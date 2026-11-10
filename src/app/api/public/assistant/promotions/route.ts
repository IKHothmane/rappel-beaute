import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import { listCatalogPromotions } from "@/lib/db/assistant-catalog";
import { publicRoute } from "@/lib/http/route-scope";

export const GET = publicRoute(async function GET(request: NextRequest) {
  const session = await requireWidgetOrganization(request);
  if (session instanceof NextResponse) return session;
  const promotions = await listCatalogPromotions(session.organizationId);
  return NextResponse.json({ promotions });
});
