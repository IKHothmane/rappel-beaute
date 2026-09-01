import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  issueInvoiceFromAppointment,
  listInvoices,
} from "@/lib/db/invoices";
import {
  parseInvoiceListQuery,
  validateCreateFromAppointment,
} from "@/lib/validation/invoice";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "cash-register", "invoices");
  if (!auth.ok) return auth.response;

  try {
    const q = parseInvoiceListQuery(new URL(request.url).searchParams);
    const { items, total, kpis } = await listInvoices(auth.session.organizationId, {
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
    console.error("[GET /api/invoices]", error);
    return NextResponse.json({ error: "Impossible de charger les factures." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "cash-register", "invoices");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateCreateFromAppointment(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const result = await issueInvoiceFromAppointment(
      auth.session.organizationId,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "APPOINTMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }
    console.error("[POST /api/invoices]", error);
    return NextResponse.json({ error: "Impossible de créer la facture." }, { status: 500 });
  }
}
