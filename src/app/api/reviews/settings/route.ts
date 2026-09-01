import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite } from "@/lib/auth/api-guard";
import { getOrCreateReviewSettings } from "@/lib/db/reviews";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "reviews");
  if (!auth.ok) return auth.response;
  try {
    const settings = await getOrCreateReviewSettings(auth.session.organizationId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[GET /api/reviews/settings]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "reviews");
  if (!auth.ok) return auth.response;
  const { updateReviewSettings } = await import("@/lib/db/reviews");
  const { canManageReviewSettings } = await import("@/lib/rbac");
  const { validateUpdateReviewSettings } = await import("@/lib/validation/review");
  const { stripOrganizationId } = await import("@/lib/auth/api-guard");

  if (!canManageReviewSettings(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateUpdateReviewSettings(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };
    const settings = await updateReviewSettings(
      auth.session.organizationId,
      validated.data,
      actor,
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[PATCH /api/reviews/settings]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
