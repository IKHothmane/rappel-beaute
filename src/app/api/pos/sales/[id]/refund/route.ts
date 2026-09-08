import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePosWrite } from "@/lib/auth/api-guard";
import { getPosSaleById, refundPosSale } from "@/lib/db/pos";
import { canCreateRefund } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requirePosWrite(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const existing = await getPosSaleById(auth.session.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }
    if (!canCreateRefund(auth.session.role, existing.total)) {
      return NextResponse.json(
        { error: "Remboursement non autorisé pour votre rôle / montant." },
        { status: 403 },
      );
    }

    const sale = await refundPosSale(auth.session.organizationId, id, {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });
    return NextResponse.json(sale);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NO_OPEN_SESSION") {
      return NextResponse.json(
        { error: "Ouvrez la caisse pour rembourser en espèces." },
        { status: 409 },
      );
    }
    if (code === "SALE_NOT_REFUNDABLE" || code === "SALE_NOT_FOUND") {
      return NextResponse.json({ error: "Vente non remboursable." }, { status: 409 });
    }
    console.error("[POST /api/pos/sales/[id]/refund]", error);
    return NextResponse.json({ error: "Erreur remboursement." }, { status: 500 });
  }
}
