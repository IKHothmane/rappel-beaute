import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { canManageGoogleCalendar } from "@/lib/rbac";
import { getGoogleCalendarConnection } from "@/lib/db/google-calendar";
import { isGoogleCalendarConfigured } from "@/lib/google/calendar";
import type { GoogleCalendarStatus } from "@/types/google-calendar";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const conn = await getGoogleCalendarConnection(auth.session.organizationId);
    const payload: GoogleCalendarStatus = {
      configured: isGoogleCalendarConfigured(),
      connected: Boolean(conn),
      email: conn?.googleEmail ?? null,
      calendarId: conn?.calendarId ?? null,
      calendarName: conn?.calendarName ?? null,
      orgName: auth.session.orgName,
      connectedAt: conn?.connectedAt.toISOString() ?? null,
      canManage: canManageGoogleCalendar(auth.session.role),
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/integrations/google-calendar/status]", error);
    return NextResponse.json(
      { error: "Impossible de lire le statut Google Calendar." },
      { status: 500 },
    );
  }
}
