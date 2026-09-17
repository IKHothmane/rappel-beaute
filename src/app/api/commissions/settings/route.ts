import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite, stripOrganizationId } from "@/lib/auth/api-guard";
import {
  getOrCreateCommissionSettings,
  updateCommissionSettings,
} from "@/lib/db/commissions";
import { canWriteCommissions } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "commissions");
  if (!auth.ok) return auth.response;
  try {
    const settings = await getOrCreateCommissionSettings(auth.session.organizationId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[GET /api/commissions/settings]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "commissions");
  if (!auth.ok) return auth.response;

  if (!canWriteCommissions(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const enabled =
      typeof raw.productCommissionEnabled === "boolean"
        ? raw.productCommissionEnabled
        : undefined;
    const rateRaw = raw.productCommissionRate;
    const rate =
      rateRaw === undefined || rateRaw === null
        ? undefined
        : Number(rateRaw);
    if (rate !== undefined && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
      return NextResponse.json({ error: "Taux invalide (0–100)." }, { status: 400 });
    }

    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };
    const settings = await updateCommissionSettings(
      auth.session.organizationId,
      {
        productCommissionEnabled: enabled,
        productCommissionRate: rate,
      },
      actor,
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[PATCH /api/commissions/settings]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
