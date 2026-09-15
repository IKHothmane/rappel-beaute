import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  getPlatformWideUser,
  isOrgUserRole,
  listUserActivity,
  setPlatformWideUserRole,
  setPlatformWideUserStatus,
  updatePlatformWideUserProfile,
} from "@/lib/db/admin-users";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const user = await getPlatformWideUser(id);
  if (!user) return adminError("Utilisateur introuvable.", 404);

  const activity = await listUserActivity({
    userId: id,
    organizationId: user.organizationId ?? undefined,
    limit: 30,
  });

  return adminJson({ user, activity });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    status?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    delete?: boolean;
  };

  try {
    if (body.status === "ACTIVE" || body.status === "DISABLED") {
      await setPlatformWideUserStatus(auth.session, id, body.status, {
        asDelete: body.status === "DISABLED" && body.delete === true,
      });
    }
    if (body.role) {
      if (!isOrgUserRole(body.role)) {
        return adminError("Rôle invalide.", 400);
      }
      await setPlatformWideUserRole(auth.session, id, body.role);
    }
    if (
      body.firstName != null ||
      body.lastName != null ||
      body.email != null ||
      body.phone !== undefined
    ) {
      await updatePlatformWideUserProfile(auth.session, id, {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
      });
    }

    const user = await getPlatformWideUser(id);
    return adminJson({ user });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return adminError("Utilisateur introuvable.", 404);
    }
    console.error("[PATCH /api/admin/users/:id]", e);
    return adminError("Mise à jour impossible.", 500);
  }
}
