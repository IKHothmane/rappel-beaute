import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite, stripOrganizationId } from "@/lib/auth/api-guard";
import { getAppointmentById } from "@/lib/db/appointments";
import { consumeProductsForAppointment } from "@/lib/db/inventory";
import { consoFromNotes } from "@/components/agenda/service-notes";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "agenda");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const appointment = await getAppointmentById(id, auth.session.organizationId);
    if (!appointment) {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }

    const body = stripOrganizationId(
      (await request.json().catch(() => ({}))) as Record<string, unknown>,
    ) as {
      products?: { productId: string; quantity: number }[];
    };

    const fromBody = Array.isArray(body.products)
      ? body.products
          .map((p) => ({
            productId: String(p.productId ?? "").trim(),
            quantity: Math.max(0, Math.round(Number(p.quantity) || 0)),
          }))
          .filter((p) => p.productId && p.quantity > 0)
      : [];
    const products = fromBody.length > 0 ? fromBody : consoFromNotes(appointment.notes);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Sélectionnez au moins un produit à déduire." },
        { status: 400 },
      );
    }

    const result = await consumeProductsForAppointment({
      organizationId: auth.session.organizationId,
      appointmentId: appointment.id,
      products,
      userId: auth.session.id,
    });

    if (result.created === 0 && result.skipped > 0) {
      return NextResponse.json({
        ok: true,
        ...result,
        message: "Ces produits ont déjà été déduits pour ce rendez-vous.",
      });
    }

    if (result.created === 0) {
      return NextResponse.json(
        { error: "Aucun produit valide à déduire du stock." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...result,
      message: `${result.created} produit${result.created > 1 ? "s" : ""} déduit${result.created > 1 ? "s" : ""} du stock.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    console.error(`[POST /api/appointments/${id}/consume]`, error);
    return NextResponse.json(
      { error: "Impossible de déduire le stock." },
      { status: 500 },
    );
  }
}
