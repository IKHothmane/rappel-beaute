import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { canManageGoogleCalendar } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/db/audit";
import { deleteGoogleCalendarConnection } from "@/lib/db/google-calendar";
import { revokeGoogleToken } from "@/lib/google/calendar";

export async function POST(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;

  if (!canManageGoogleCalendar(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const refresh = await deleteGoogleCalendarConnection(auth.session.organizationId);
    if (refresh) await revokeGoogleToken(refresh);

    try {
      await writeAuditLog({
        organizationId: auth.session.organizationId,
        actorId: auth.session.id,
        actorName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
        entityType: "GoogleCalendarConnection",
        entityId: auth.session.organizationId,
        action: "GOOGLE_CALENDAR_DISCONNECTED",
      });
    } catch (e) {
      console.error("[google-calendar disconnect] audit", e);
    }

    return NextResponse.json({ ok: true, connected: false });
  } catch (error) {
    console.error("[POST /api/integrations/google-calendar/disconnect]", error);
    return NextResponse.json(
      { error: "Impossible de déconnecter Google Calendar." },
      { status: 500 },
    );
  }
}
