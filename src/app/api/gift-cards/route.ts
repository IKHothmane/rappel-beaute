import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  cancelGiftCard,
  getGiftCardByCode,
  getGiftCardById,
  issueGiftCard,
  listGiftCardJournal,
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
    const [listed, journal] = await Promise.all([
      listGiftCards(auth.session.organizationId, {
        ...q,
        search: q.search || undefined,
      }),
      listGiftCardJournal(auth.session.organizationId, 24),
    ]);
    return NextResponse.json({
      data: listed.items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total: listed.total,
        totalPages: Math.max(1, Math.ceil(listed.total / q.limit)),
      },
      kpis: listed.kpis,
      journal,
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
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.action === "cancel") {
      const id = typeof raw.id === "string" ? raw.id.trim() : "";
      if (!id) {
        return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
      }
      try {
        const card = await cancelGiftCard(auth.session.organizationId, id, actor);
        return NextResponse.json(card);
      } catch (error) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
        }
        if (error instanceof Error && error.message === "GIFT_CARD_INACTIVE") {
          return NextResponse.json(
            { error: "Seule une carte active peut être suspendue." },
            { status: 409 },
          );
        }
        throw error;
      }
    }

    const validated = validateCreateGiftCard(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }
    const card = await issueGiftCard(auth.session.organizationId, validated.data, actor);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("[POST /api/gift-cards]", error);
    return NextResponse.json({ error: "Impossible de traiter la carte." }, { status: 500 });
  }
}
