import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePosRead } from "@/lib/auth/api-guard";
import { getPosSaleById } from "@/lib/db/pos";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requirePosRead(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const sale = await getPosSaleById(auth.session.organizationId, id);
    if (!sale) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }
    return NextResponse.json(sale);
  } catch (error) {
    console.error("[GET /api/pos/sales/[id]]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
