import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { platformResetUserPassword } from "@/lib/db/admin-users";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    const result = await platformResetUserPassword(auth.session, id);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "https://app.rappelbeauty.com";

    return adminJson({
      ...result,
      mustChangePassword: true,
      loginUrl: `${appUrl}/login/`,
      messageTemplate: [
        `Bonjour${result.firstName ? ` ${result.firstName}` : ""},`,
        ``,
        `Votre accès Rappel Beauty a été réinitialisé.`,
        ``,
        `Email : ${result.email}`,
        `Mot de passe temporaire : ${result.temporaryPassword}`,
        ``,
        `Connectez-vous ici :`,
        `${appUrl}/login/`,
        ``,
        `⚠️ À votre première connexion, vous devrez obligatoirement`,
        `choisir un nouveau mot de passe.`,
      ].join("\n"),
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") return adminError("Utilisateur introuvable.", 404);
    if (code === "USER_DISABLED") {
      return adminError("Impossible de réinitialiser un compte désactivé.", 400);
    }
    console.error("[POST /api/admin/users/:id/reset-password]", e);
    return adminError("Réinitialisation impossible.", 500);
  }
}
