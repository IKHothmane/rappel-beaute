import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  changePlatformPassword,
  updatePlatformProfile,
} from "@/lib/db/platform-settings";

export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      locale?: string;
      timezone?: string;
    };

    const profile = await updatePlatformProfile({
      id: auth.session.id,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      locale: body.locale,
      timezone: body.timezone,
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });

    return adminJson({ profile });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") return adminError("Profil introuvable.", 404);
      if (error.message === "INVALID_INPUT") return adminError("Champs invalides.", 400);
      if (error.message === "EMAIL_TAKEN") return adminError("E-mail déjà utilisé.", 409);
    }
    console.error("[PATCH /api/admin/settings/profile]", error);
    return adminError("Impossible de mettre à jour le profil.", 500);
  }
}
