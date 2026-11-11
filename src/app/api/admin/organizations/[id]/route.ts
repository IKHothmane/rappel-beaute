import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  getOrganizationById,
  updateOrganization,
} from "@/lib/db/admin-organizations";
import { getOrganizationInsights } from "@/lib/db/admin-org-cards";
import { platformRoute } from "@/lib/http/route-scope";

type Ctx = { params: Promise<{ id: string }> };

export const GET = platformRoute(async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const [org, insights] = await Promise.all([getOrganizationById(id), getOrganizationInsights(id)]);
  if (!org) return adminError("Institut introuvable.", 404);
  return adminJson({ organization: org, insights });
});

export const PATCH = platformRoute(async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;
  if (body.organizationId) return adminError("Paramètre organizationId interdit.", 400);

  try {
    await updateOrganization(auth.session, id, {
      name: body.name != null ? String(body.name) : undefined,
      phone: body.phone != null ? String(body.phone) : undefined,
      email: body.email != null ? String(body.email) : undefined,
      address: body.address != null ? String(body.address) : undefined,
      city: body.city != null ? String(body.city) : undefined,
    });
    const org = await getOrganizationById(id);
    return adminJson({ organization: org });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return adminError("Institut introuvable.", 404);
    }
    return adminError("Mise à jour impossible.", 500);
  }
});
