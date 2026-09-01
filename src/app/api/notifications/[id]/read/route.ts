import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/api-guard";
import {
  getNotificationForUser,
  markNotificationRead,
} from "@/lib/db/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const existing = await getNotificationForUser(
      auth.session.organizationId,
      auth.session.id,
      id,
    );
    if (!existing) {
      return NextResponse.json({ error: "Notification introuvable." }, { status: 404 });
    }

    await markNotificationRead(auth.session.organizationId, auth.session.id, id);
    const updated = await getNotificationForUser(
      auth.session.organizationId,
      auth.session.id,
      id,
    );
    return NextResponse.json({ ok: true, notification: updated });
  } catch (error) {
    console.error("[POST /api/notifications/:id/read]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
