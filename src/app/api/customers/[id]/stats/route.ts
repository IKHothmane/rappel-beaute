import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { getCustomer360Stats } from "@/lib/db/customer-360";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureRead(request, "customers");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const stats = await getCustomer360Stats(id, auth.session.organizationId);
    if (!stats) {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/customers/[id]/stats]", error);
    return NextResponse.json({ error: "Erreur stats." }, { status: 500 });
  }
}
