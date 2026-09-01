import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { resetOwnerAccess } from "@/lib/db/admin-organizations";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    const access = await resetOwnerAccess(auth.session, id);
    return adminJson({ ok: true, ...access });
  } catch (e) {
    if (e instanceof Error && e.message === "OWNER_NOT_FOUND") {
      return adminError("Propriétaire introuvable.", 404);
    }
    return adminError("Réinitialisation impossible.", 500);
  }
}
