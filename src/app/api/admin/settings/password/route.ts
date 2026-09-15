import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { changePlatformPassword } from "@/lib/db/platform-settings";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    await changePlatformPassword({
      id: auth.session.id,
      currentPassword: String(body.currentPassword ?? ""),
      newPassword: String(body.newPassword ?? ""),
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });
    return adminJson({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BAD_PASSWORD") {
        return adminError("Mot de passe actuel incorrect.", 400);
      }
      if (error.message === "WEAK_PASSWORD") {
        return adminError("Nouveau mot de passe trop court (8 min).", 400);
      }
    }
    console.error("[POST /api/admin/settings/password]", error);
    return adminError("Impossible de changer le mot de passe.", 500);
  }
}
