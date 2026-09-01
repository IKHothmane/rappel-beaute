import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { getInvoiceById, voidInvoice } from "@/lib/db/invoices";
import { validateVoidInvoice } from "@/lib/validation/invoice";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "cash-register", "invoices");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const invoice = await getInvoiceById(auth.session.organizationId, id);
    if (!invoice) {
      return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (error) {
    console.error("[GET /api/invoices/:id]", error);
    return NextResponse.json({ error: "Impossible de charger la facture." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "cash-register", "invoices");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);

    if (raw.action === "void") {
      const validated = validateVoidInvoice(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Motif d'annulation requis.", details: validated.errors },
          { status: 400 },
        );
      }
      const invoice = await voidInvoice(
        auth.session.organizationId,
        id,
        validated.data,
      );
      return NextResponse.json(invoice);
    }

    return NextResponse.json({ error: "Action non supportée." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/invoices/:id]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour." }, { status: 500 });
  }
}
