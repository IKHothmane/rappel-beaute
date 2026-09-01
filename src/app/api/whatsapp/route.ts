import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  listSentWhatsAppTasks,
  listWhatsAppTasks,
  markWhatsAppTaskSent,
  recordWhatsAppOutcome,
  skipWhatsAppTask,
} from "@/lib/db/whatsapp";
import { canSendWhatsapp } from "@/lib/rbac";
import { parseWhatsAppAction, parseWhatsAppListQuery } from "@/lib/validation/whatsapp";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "whatsapp");
  if (!auth.ok) return auth.response;
  try {
    const q = parseWhatsAppListQuery(new URL(request.url).searchParams);
    if (q.view === "sent") {
      const [items, pending] = await Promise.all([
        listSentWhatsAppTasks(auth.session.organizationId),
        listWhatsAppTasks(auth.session.organizationId, { status: "PENDING" }),
      ]);
      return NextResponse.json({ data: items, kpis: pending.kpis });
    }
    const { items, kpis } = await listWhatsAppTasks(auth.session.organizationId, {
      status: q.status,
      type: q.type,
    });
    return NextResponse.json({ data: items, kpis });
  } catch (error) {
    console.error("[GET /api/whatsapp]", error);
    return NextResponse.json({ error: "Impossible de charger WhatsApp." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "whatsapp");
  if (!auth.ok) return auth.response;
  if (!canSendWhatsapp(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const parsed = parseWhatsAppAction(raw);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (parsed.action === "invalid") {
      return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    }

    if (parsed.action === "markSent") {
      const task = await markWhatsAppTaskSent(
        auth.session.organizationId,
        parsed.taskId,
        actor,
      );
      if (!task) {
        return NextResponse.json({ error: "Tâche introuvable ou déjà traitée." }, { status: 404 });
      }
      return NextResponse.json(task);
    }

    if (parsed.action === "skip") {
      const ok = await skipWhatsAppTask(auth.session.organizationId, parsed.taskId, actor);
      if (!ok) {
        return NextResponse.json({ error: "Tâche introuvable ou déjà traitée." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    if (parsed.action === "recordOutcome") {
      const ok = await recordWhatsAppOutcome(
        auth.session.organizationId,
        parsed.taskId,
        parsed.outcome,
        actor,
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Tâche introuvable — marquez d'abord comme envoyée." },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action non supportée sur cette route." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/whatsapp]", error);
    return NextResponse.json({ error: "Action WhatsApp impossible." }, { status: 500 });
  }
}
