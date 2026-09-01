import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { closeCashRegister } from "@/lib/db/finance";
import { validateCloseCash } from "@/lib/validation/finance";

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCloseCash(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const state = await closeCashRegister(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NO_OPEN_SESSION") {
        return NextResponse.json({ error: "Aucune caisse ouverte." }, { status: 400 });
      }
      if (error.message === "ALREADY_CLOSED") {
        return NextResponse.json({ error: "Caisse déjà fermée." }, { status: 409 });
      }
    }
    console.error("[POST /api/cash-register/close]", error);
    return NextResponse.json({ error: "Impossible de fermer la caisse." }, { status: 500 });
  }
}
