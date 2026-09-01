import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  endSupportSession,
  startSupportSession,
} from "@/lib/db/admin-organizations";

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
