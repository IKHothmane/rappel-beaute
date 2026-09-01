import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  adjustLoyaltyPoints,
  createPackage,
  createReward,
  getOrCreateLoyaltyProgram,
  listLoyaltyLeaderboard,
  listPackages,
  redeemReward,
  updateLoyaltyProgram,
} from "@/lib/db/loyalty";
import { canRedeemLoyalty, canWriteLoyalty } from "@/lib/rbac";
import {
  validateAdjustment,
  validateCreatePackage,
  validateCreateReward,
  validateRedeem,
  validateUpdateProgram,
} from "@/lib/validation/loyalty";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "loyalty");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "dashboard";

    if (view === "packages") {
      const customerId = url.searchParams.get("customerId") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const packages = await listPackages(auth.session.organizationId, {
        customerId,
        status: status || undefined,
      });
      return NextResponse.json({ data: packages });
    }

    if (view === "program") {
      const program = await getOrCreateLoyaltyProgram(auth.session.organizationId);
      return NextResponse.json(program);
    }

    const data = await listLoyaltyLeaderboard(auth.session.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/loyalty]", error);
    return NextResponse.json({ error: "Impossible de charger la fidélité." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "loyalty");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.action === "redeem") {
      if (!canRedeemLoyalty(auth.session.role)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const validated = validateRedeem(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const result = await redeemReward(
        auth.session.organizationId,
        validated.data,
        actor,
      );
      return NextResponse.json(result, { status: 201 });
    }

    if (raw.action === "adjust") {
      if (!canWriteLoyalty(auth.session.role)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const validated = validateAdjustment(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const account = await adjustLoyaltyPoints(
        auth.session.organizationId,
        validated.data.customerId,
        validated.data.points,
        validated.data.reason,
        actor,
      );
      return NextResponse.json(account);
    }

    if (raw.action === "createReward") {
      if (!canWriteLoyalty(auth.session.role)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const validated = validateCreateReward(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const reward = await createReward(
        auth.session.organizationId,
        validated.data,
        actor,
      );
      return NextResponse.json(reward, { status: 201 });
    }

    if (raw.action === "createPackage") {
      if (!canWriteLoyalty(auth.session.role)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const validated = validateCreatePackage(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const pkg = await createPackage(
        auth.session.organizationId,
        validated.data,
        actor,
      );
      return NextResponse.json(pkg, { status: 201 });
    }

    if (raw.action === "updateProgram") {
      const write = await requireFeatureWrite(request, "loyalty");
      if (!write.ok) return write.response;
      if (!canWriteLoyalty(auth.session.role)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const validated = validateUpdateProgram(raw);
      if (!validated.ok) {
        return NextResponse.json(
          { error: "Données invalides.", details: validated.errors },
          { status: 400 },
        );
      }
      const program = await updateLoyaltyProgram(
        auth.session.organizationId,
        validated.data,
        actor,
      );
      return NextResponse.json(program);
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number]> = {
        INSUFFICIENT_POINTS: ["Solde points insuffisant.", 400],
        REWARD_NOT_FOUND: ["Récompense introuvable.", 404],
        REWARD_INACTIVE: ["Récompense inactive.", 400],
        REWARD_EXHAUSTED: ["Récompense épuisée.", 400],
      };
      const hit = map[error.message];
      if (hit) return NextResponse.json({ error: hit[0] }, { status: hit[1] });
    }
    console.error("[POST /api/loyalty]", error);
    return NextResponse.json({ error: "Impossible d'exécuter l'action." }, { status: 500 });
  }
}
