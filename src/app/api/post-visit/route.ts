import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  listPostVisitItems,
  skipPostVisitTask,
  syncPostVisitTasks,
  updatePostVisitSettings,
} from "@/lib/db/post-visit";
import { canWriteFeature } from "@/lib/rbac";
import { parsePostVisitAction } from "@/lib/validation/post-visit";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "marketing");
  if (!auth.ok) return auth.response;
  try {
    const result = await listPostVisitItems(auth.session.organizationId, { sync: true });
    return NextResponse.json({
      data: result.items,
      kpis: result.kpis,
      settings: result.settings,
    });
  } catch (error) {
    console.error("[GET /api/post-visit]", error);
    return NextResponse.json({ error: "Impossible de charger les relances." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const parsed = parsePostVisitAction(raw);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (parsed.action === "invalid") {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (parsed.action === "updateSettings") {
      if (!canWriteFeature(auth.session.role, "marketing")) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const settings = await updatePostVisitSettings(
        auth.session.organizationId,
        parsed.data,
        actor,
      );
      return NextResponse.json(settings);
    }

    if (parsed.action === "skip") {
      await skipPostVisitTask(auth.session.organizationId, parsed.appointmentId, actor);
      return NextResponse.json({ ok: true });
    }

    if (parsed.action === "sync") {
      const result = await syncPostVisitTasks(auth.session.organizationId);
      return NextResponse.json({ ok: true, created: result.created });
    }

    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/post-visit]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
