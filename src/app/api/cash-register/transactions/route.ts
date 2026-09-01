import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createManualCashTxn, listCashTransactions } from "@/lib/db/finance";
import { validateManualCashTxn } from "@/lib/validation/finance";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const data = await listCashTransactions(auth.session.organizationId, {
      sessionId: url.searchParams.get("sessionId") ?? undefined,
      limit: Number(url.searchParams.get("limit")) || 80,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/cash-register/transactions]", error);
    return NextResponse.json({ error: "Impossible de charger les mouvements." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateManualCashTxn(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const txn = await createManualCashTxn(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(txn, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_OPEN_SESSION") {
      return NextResponse.json({ error: "Aucune caisse ouverte." }, { status: 400 });
    }
    console.error("[POST /api/cash-register/transactions]", error);
    return NextResponse.json({ error: "Impossible d'enregistrer le mouvement." }, { status: 500 });
  }
}
