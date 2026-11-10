import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  reactivateOrganization,
} from "@/lib/db/admin-organizations";
import { platformRoute } from "@/lib/http/route-scope";

type Ctx = { params: Promise<{ id: string }> };

export const POST = platformRoute(async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    await reactivateOrganization(auth.session, id);
    return adminJson({ ok: true, status: "ACTIVE" });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return adminError("Institut introuvable.", 404);
    }
    return adminError("Réactivation impossible.", 500);
  }
});
