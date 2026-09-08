import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePosRead } from "@/lib/auth/api-guard";
import { listPosProducts } from "@/lib/db/pos";

export async function GET(request: NextRequest) {
  const auth = await requirePosRead(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const data = await listPosProducts(auth.session.organizationId, {
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category"),
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/pos/products]", error);
    return NextResponse.json({ error: "Erreur produits." }, { status: 500 });
  }
}
