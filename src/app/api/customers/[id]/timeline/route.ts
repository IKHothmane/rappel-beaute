import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { getCustomerTimeline } from "@/lib/db/customer-360";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureRead(request, "customers");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const timeline = await getCustomerTimeline(id, auth.session.organizationId);
    if (!timeline) {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    return NextResponse.json({ data: timeline });
  } catch (error) {
    console.error("[GET /api/customers/[id]/timeline]", error);
    return NextResponse.json({ error: "Erreur timeline." }, { status: 500 });
  }
}
