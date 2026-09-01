import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createExpense, listExpenses } from "@/lib/db/expenses";
import {
  parseExpenseListQuery,
  validateCreateExpense,
} from "@/lib/validation/expense";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "expenses");
  if (!auth.ok) return auth.response;

  try {
    const q = parseExpenseListQuery(new URL(request.url).searchParams);
    const { items, total, kpis } = await listExpenses(auth.session.organizationId, {
      ...q,
      search: q.search || undefined,
    });
    return NextResponse.json({
      data: items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
      kpis,
    });
  } catch (error) {
    console.error("[GET /api/expenses]", error);
    return NextResponse.json({ error: "Impossible de charger les dépenses." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "expenses");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreateExpense(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const expense = await createExpense(auth.session.organizationId, validated.data, {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_OPEN_SESSION") {
      return NextResponse.json(
        { error: "Ouvrez la caisse avant une dépense en espèces." },
        { status: 400 },
      );
    }
    console.error("[POST /api/expenses]", error);
    return NextResponse.json({ error: "Impossible de créer la dépense." }, { status: 500 });
  }
}
