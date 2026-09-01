import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  getGiftCardByCode,
  getGiftCardById,
  issueGiftCard,
  listGiftCards,
} from "@/lib/db/gift-cards";
import { canWritePromotions } from "@/lib/rbac";
import {
  parseGiftCardListQuery,
  validateCreateGiftCard,
} from "@/lib/validation/promo";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "promotions");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const id = url.searchParams.get("id");

    if (code) {
      const card = await getGiftCardByCode(auth.session.organizationId, code);
      if (!card) {
        return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
      }
      return NextResponse.json(card);
    }
    if (id) {
      const card = await getGiftCardById(auth.session.organizationId, id);
      if (!card) {
        return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
      }
      return NextResponse.json(card);
    }

    const q = parseGiftCardListQuery(url.searchParams);
    const { items, total, kpis } = await listGiftCards(auth.session.organizationId, {
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
    console.error("[GET /api/gift-cards]", error);
    return NextResponse.json(
      { error: "Impossible de charger les cartes cadeaux." },
      { status: 500 },
    );
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
    const validated = validateCreateGiftCard(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const card = await issueGiftCard(auth.session.organizationId, validated.data, {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("[POST /api/gift-cards]", error);
    return NextResponse.json({ error: "Impossible de créer la carte." }, { status: 500 });
  }
}
