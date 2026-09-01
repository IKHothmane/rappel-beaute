import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { openCashRegister } from "@/lib/db/finance";
import { validateOpenCash } from "@/lib/validation/finance";

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateOpenCash(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const state = await openCashRegister(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(state, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_OPEN") {
      return NextResponse.json(
        { error: "Une caisse est déjà ouverte." },
        { status: 409 },
      );
    }
    console.error("[POST /api/cash-register/open]", error);
    return NextResponse.json({ error: "Impossible d'ouvrir la caisse." }, { status: 500 });
  }
}
