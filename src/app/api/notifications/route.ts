import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/api-guard";
import { listNotifications } from "@/lib/db/notifications";
import { parseNotificationListParams } from "@/lib/validation/notifications";

export async function GET(request: NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const sp = new URL(request.url).searchParams;
  const { page, limit, category } = parseNotificationListParams(sp);

  try {
    const data = await listNotifications(auth.session.organizationId, auth.session.id, {
      page,
      limit,
      category,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "Erreur notifications." }, { status: 500 });
  }
}
