import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/api-guard";
import { markAllNotificationsRead } from "@/lib/db/notifications";

export async function POST(request: NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const count = await markAllNotificationsRead(
      auth.session.organizationId,
      auth.session.id,
    );
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    console.error("[POST /api/notifications/read-all]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
