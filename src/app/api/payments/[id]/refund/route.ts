import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { refundPayment } from "@/lib/db/finance";
import { canCreateRefund } from "@/lib/rbac";
import { validateRefund } from "@/lib/validation/finance";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "cash-register");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateRefund(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    if (!canCreateRefund(auth.session.role, validated.data.amount)) {
      return NextResponse.json(
        {
          error:
            "Remboursement au-dessus du seuil autorisé — validation OWNER/MANAGER requise.",
        },
        { status: 403 },
      );
    }

    const payment = await refundPayment(
      auth.session.organizationId,
      id,
      validated.data,
      auth.session.id,
    );
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number]> = {
        NOT_FOUND: ["Paiement introuvable.", 404],
        CANNOT_REFUND_REFUND: ["Impossible de rembourser un remboursement.", 400],
        NOT_REFUNDABLE: ["Paiement non remboursable.", 400],
        OVER_REFUND: ["Montant supérieur au remboursable.", 400],
        NO_OPEN_SESSION: ["Ouvrez la caisse pour un remboursement espèces.", 400],
      };
      const hit = map[error.message];
      if (hit) return NextResponse.json({ error: hit[0] }, { status: hit[1] });
    }
    console.error("[POST /api/payments/:id/refund]", error);
    return NextResponse.json({ error: "Impossible de rembourser." }, { status: 500 });
  }
}
