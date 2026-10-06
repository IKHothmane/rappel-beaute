import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireWidgetOrganization } from "@/lib/assistant/widget-request";
import { listCatalogServices } from "@/lib/db/assistant-catalog";

export async function GET(request: NextRequest) {
  const session = await requireWidgetOrganization(request);
  if (session instanceof NextResponse) return session;
  const services = await listCatalogServices(session.organizationId);
  return NextResponse.json({ services });
}
