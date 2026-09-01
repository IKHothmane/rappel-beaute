import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createPromotion,
  listPromotions,
  setPromotionStatus,
} from "@/lib/db/promotions";
import { canWritePromotions } from "@/lib/rbac";
import {
  parsePromotionListQuery,
  validateCreatePromotion,
} from "@/lib/validation/promo";
import type { PromotionStatus } from "@/types/promo";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "promotions");
  if (!auth.ok) return auth.response;
  try {
    const q = parsePromotionListQuery(new URL(request.url).searchParams);
    const { items, total, kpis } = await listPromotions(auth.session.organizationId, {
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
    console.error("[GET /api/promotions]", error);
    return NextResponse.json({ error: "Impossible de charger les promotions." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "promotions");
  if (!auth.ok) return auth.response;
  if (!canWritePromotions(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.action === "setStatus") {
      const id = typeof raw.id === "string" ? raw.id : "";
      const status = typeof raw.status === "string" ? (raw.status as PromotionStatus) : null;
      if (!id || !status) {
        return NextResponse.json({ error: "Données invalides." }, { status: 400 });
      }
      const promo = await setPromotionStatus(auth.session.organizationId, id, status, actor);
      return NextResponse.json(promo);
    }

    const validated = validateCreatePromotion(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const promo = await createPromotion(auth.session.organizationId, validated.data, actor);
    return NextResponse.json(promo, { status: 201 });
  } catch (error) {
    console.error("[POST /api/promotions]", error);
    return NextResponse.json({ error: "Impossible de créer la promotion." }, { status: 500 });
  }
}
