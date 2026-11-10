import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { invalidateUserSessions } from "@/lib/db/admin-users";
import { platformRoute } from "@/lib/http/route-scope";

type Ctx = { params: Promise<{ id: string }> };

export const POST = platformRoute(async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    await invalidateUserSessions(auth.session, id);
    return adminJson({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return adminError("Utilisateur introuvable.", 404);
    }
    return adminError("Impossible d’invalider les sessions.", 500);
  }
});
