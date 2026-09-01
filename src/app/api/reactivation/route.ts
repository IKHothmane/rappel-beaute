import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  listReactivationCustomers,
  prepareReactivationWhatsApp,
  snoozeReactivationCustomer,
  updateReactivationSettings,
} from "@/lib/db/reactivation";
import { canSendReactivation, canWriteReactivationSettings } from "@/lib/rbac";
import { parseReactivationAction, parseReactivationListQuery } from "@/lib/validation/reactivation";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "reactivation");
  if (!auth.ok) return auth.response;
  try {
    const q = parseReactivationListQuery(new URL(request.url).searchParams);
    const result = await listReactivationCustomers(auth.session.organizationId, {
      bucket: q.bucket,
      relanceOnly: q.relanceOnly,
    });
    return NextResponse.json({
      data: result.items,
      kpis: result.kpis,
      settings: result.settings,
    });
  } catch (error) {
    console.error("[GET /api/reactivation]", error);
    return NextResponse.json({ error: "Impossible de charger la réactivation." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "reactivation");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const parsed = parseReactivationAction(raw);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (parsed.action === "invalid") {
      return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    }

    if (parsed.action === "updateSettings") {
      if (!canWriteReactivationSettings(auth.session.role)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const settings = await updateReactivationSettings(
        auth.session.organizationId,
        parsed.data,
        actor,
      );
      return NextResponse.json(settings);
    }

    if (!canSendReactivation(auth.session.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    if (parsed.action === "prepareWhatsApp") {
      const result = await prepareReactivationWhatsApp(
        auth.session.organizationId,
        parsed.customerId,
        actor,
      );
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (parsed.action === "snooze") {
      await snoozeReactivationCustomer(
        auth.session.organizationId,
        parsed.customerId,
        parsed.days,
        actor,
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action non supportée." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/reactivation]", error);
    return NextResponse.json({ error: "Action réactivation impossible." }, { status: 500 });
  }
}
