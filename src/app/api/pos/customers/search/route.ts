import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePosRead } from "@/lib/auth/api-guard";
import { searchPosCustomers } from "@/lib/db/pos";

export async function GET(request: NextRequest) {
  const auth = await requirePosRead(request);
  if (!auth.ok) return auth.response;

  try {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const data = await searchPosCustomers(auth.session.organizationId, q);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/pos/customers/search]", error);
    return NextResponse.json({ error: "Erreur recherche." }, { status: 500 });
  }
}
