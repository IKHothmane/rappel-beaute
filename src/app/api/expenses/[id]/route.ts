import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { getExpenseById, updateExpense, voidExpense } from "@/lib/db/expenses";
import { validateUpdateExpense } from "@/lib/validation/expense";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "expenses");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const expense = await getExpenseById(auth.session.organizationId, id);
    if (!expense) {
      return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
    }
    return NextResponse.json(expense);
  } catch (error) {
    console.error("[GET /api/expenses/:id]", error);
    return NextResponse.json({ error: "Impossible de charger la dépense." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "expenses");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.action === "void") {
      const expense = await voidExpense(
        auth.session.organizationId,
        id,
        actor,
        typeof raw.reason === "string" ? raw.reason : undefined,
      );
      return NextResponse.json(expense);
    }

    const validated = validateUpdateExpense(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const expense = await updateExpense(
      auth.session.organizationId,
      id,
      validated.data,
      actor,
    );
    return NextResponse.json(expense);
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number]> = {
        NOT_FOUND: ["Dépense introuvable.", 404],
        VOIDED: ["Dépense déjà annulée.", 400],
        NO_OPEN_SESSION: ["Ouvrez la caisse pour ajuster une dépense espèces.", 400],
      };
      const hit = map[error.message];
      if (hit) return NextResponse.json({ error: hit[0] }, { status: hit[1] });
    }
    console.error("[PATCH /api/expenses/:id]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour." }, { status: 500 });
  }
}
