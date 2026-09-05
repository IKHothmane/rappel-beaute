import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  endSupportSession,
  getSupportSessionById,
  listSupportSessions,
  startSupportSession,
} from "@/lib/db/admin-organizations";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const id = sp.get("id");
  if (id) {
    const item = await getSupportSessionById(id);
    if (!item) return adminError("Session introuvable.", 404);
    return adminJson({ item });
  }

  const items = await listSupportSessions({
    openOnly: sp.get("open") === "1",
    limit: parseInt(sp.get("limit") ?? "50", 10),
  });
  const openOnly = await listSupportSessions({ openOnly: true, limit: 200 });
  return adminJson({
    items,
    openCount: openOnly.length,
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    organizationId?: string;
    reason?: string;
    sessionId?: string;
    action?: string;
  };

  if (body.organizationId) {
    try {
      const result = await startSupportSession(
        auth.session,
        body.organizationId,
        body.reason,
      );
      return adminJson(result, 201);
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        return adminError("Institut introuvable.", 404);
      }
      return adminError("Impossible de démarrer la session support.", 500);
    }
  }

  if (body.sessionId && body.action === "end") {
    try {
      await endSupportSession(auth.session, body.sessionId);
      return adminJson({ ok: true });
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        return adminError("Session introuvable.", 404);
      }
      return adminError("Impossible de terminer la session.", 500);
    }
  }

  return adminError("Requête invalide.", 400);
}
