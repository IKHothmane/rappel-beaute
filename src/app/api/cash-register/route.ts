import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite } from "@/lib/auth/api-guard";
import { getCashRegisterState, listCashTransactions } from "@/lib/db/finance";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get("transactions") === "1") {
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      const txns = await listCashTransactions(auth.session.organizationId, {
        sessionId,
        limit: Number(url.searchParams.get("limit")) || 80,
      });
      return NextResponse.json({ data: txns });
    }

    const state = await getCashRegisterState(auth.session.organizationId);
    return NextResponse.json(state);
  } catch (error) {
    console.error("[GET /api/cash-register]", error);
    return NextResponse.json({ error: "Impossible de charger la caisse." }, { status: 500 });
  }
}
