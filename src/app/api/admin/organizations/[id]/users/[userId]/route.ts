import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { setOrganizationUserStatus } from "@/lib/db/admin-organizations";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id, userId } = await ctx.params;
  const body = (await request.json()) as { status?: string };
  if (body.status !== "ACTIVE" && body.status !== "DISABLED") {
    return adminError("Statut invalide.", 400);
  }

  try {
    await setOrganizationUserStatus(auth.session, id, userId, body.status);
    return adminJson({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return adminError("Utilisateur introuvable.", 404);
    }
    return adminError("Mise à jour impossible.", 500);
  }
}
