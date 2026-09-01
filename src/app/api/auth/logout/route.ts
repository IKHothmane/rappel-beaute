import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/db/audit";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());

  if (session?.scope === "app" && session.organizationId) {
    await writeAuditLog({
      organizationId: session.organizationId,
      actorId: session.id,
      actorName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "User",
      entityId: session.id,
      action: "LOGOUT",
    }).catch(() => undefined);
  }

  return res;
}
