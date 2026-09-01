import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/api-guard";
import { getUnreadNotificationCount } from "@/lib/db/notifications";

export async function GET(request: NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const count = await getUnreadNotificationCount(
      auth.session.organizationId,
      auth.session.id,
    );
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[GET /api/notifications/unread-count]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
