import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { deleteOrganization } from "@/lib/db/admin-organizations";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    await deleteOrganization(auth.session, id);
    return adminJson({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return adminError("Institut introuvable.", 404);
    }
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "23503") {
      return adminError("Suppression impossible : des données liées bloquent encore cet institut.", 409);
    }
    return adminError("Suppression impossible.", 500);
  }
}
