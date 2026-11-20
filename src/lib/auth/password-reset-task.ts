import { runInScope } from "@/lib/db/tenant-context";
import { issuePasswordResetToken } from "@/lib/db/activation";
import { sendTransactionalEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { publicAppOrigin, SITE } from "@/lib/site";

/**
 * Traitement d'une demande de réinitialisation, exécuté APRÈS la réponse : la route répond à l'identique et dans
 * le même temps que le compte existe ou non (la recherche, l'insertion du jeton et l'envoi ne se voient pas de
 * l'extérieur). Toute erreur est journalisée sans adresse e-mail ; rien ne remonte à l'appelant.
 */
const pending = new Set<Promise<void>>();

function appBase(requestOrigin: string): string {
  return publicAppOrigin() || requestOrigin.replace(/\/$/, "");
}

async function processResetRequest(email: string, requestOrigin: string): Promise<void> {
  try {
    const token = await issuePasswordResetToken(email);
    if (!token) return;
    const link = `${appBase(requestOrigin)}/activate/?token=${token}`;
    await sendTransactionalEmail({
      to: email,
      subject: `Réinitialisation du mot de passe — ${SITE.name}`,
      text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.\n`,
      html: `<p>Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure)&nbsp;:</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
    });
  } catch (error) {
    logger.error("forgot-password task failed", {
      route: "/api/auth/forgot-password",
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** Lance le traitement en tâche détachée (non attendue par la route). */
export function scheduleResetRequest(email: string, requestOrigin: string): void {
  // Portée « public » explicite : la tâche survit au contexte de la requête.
  const task = runInScope({ kind: "public", reason: "réinitialisation du mot de passe" }, () =>
    processResetRequest(email, requestOrigin),
  );
  pending.add(task);
  void task.finally(() => pending.delete(task));
}

/** Attend les tâches en cours (tests). */
export async function flushResetRequests(): Promise<void> {
  await Promise.all([...pending]);
}
