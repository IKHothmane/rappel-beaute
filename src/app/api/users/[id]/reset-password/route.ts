import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite } from "@/lib/auth/api-guard";
import { adminResetTemporaryPassword } from "@/lib/db/users";

/**
 * POST /api/users/[id]/reset-password
 * Génère un mot de passe temporaire (hashé en DB). OWNER uniquement.
 * Le clair n'est renvoyé qu'une fois dans la réponse JSON.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFeatureWrite(request, "settings");
  if (!auth.ok) return auth.response;

  const { id: targetUserId } = await context.params;
  if (!targetUserId?.trim()) {
    return NextResponse.json({ error: "Utilisateur invalide." }, { status: 400 });
  }

  try {
    const result = await adminResetTemporaryPassword({
      organizationId: auth.session.organizationId,
      targetUserId: targetUserId.trim(),
      actor: {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.rappelbeauty.com";

    return NextResponse.json({
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      temporaryPassword: result.temporaryPassword,
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
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if (code === "USER_DISABLED") {
      return NextResponse.json(
        { error: "Impossible de réinitialiser un compte désactivé." },
        { status: 400 },
      );
    }
    console.error("[POST /api/users/:id/reset-password]", error);
    return NextResponse.json({ error: "Réinitialisation impossible." }, { status: 500 });
  }
}
