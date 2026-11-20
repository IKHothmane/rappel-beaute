import { runInScope } from "@/lib/db/tenant-context";
import { resendEmailSignup, startEmailSignup } from "@/lib/db/email-signup";
import { requestEmailChange } from "@/lib/db/account-security";
import { sendTransactionalEmail } from "@/lib/email/send";
import { alreadyHaveAccountEmail, emailChangeVerificationEmail, signupVerificationEmail } from "@/lib/email/auth-emails";
import { appLinkOrigin, canonicalAuthOrigin } from "@/lib/auth/auth-hosts";
import { logger } from "@/lib/logger";

/**
 * Traitements d'e-mails d'authentification exécutés APRÈS la réponse (même principe que password-reset-task) : la
 * route répond à l'identique et dans le même temps que l'adresse existe ou non ; la recherche, les écritures et
 * l'envoi ne se voient pas de l'extérieur. Toute erreur est journalisée sans adresse ; rien ne remonte.
 * Le jeton n'apparaît que dans le lien envoyé : il n'est jamais journalisé.
 */
const pending = new Set<Promise<void>>();

function schedule(reason: string, label: string, work: () => Promise<void>): void {
  // Portée « public » explicite : la tâche survit au contexte de la requête.
  const task = runInScope({ kind: "public", reason }, async () => {
    try {
      await work();
    } catch (error) {
      logger.error(`${label} task failed`, { route: label, error: error instanceof Error ? error.name : "unknown" });
    }
  });
  pending.add(task);
  void task.finally(() => pending.delete(task));
}

const verifyLink = (origin: string, token: string, type?: "change") =>
  `${origin}/verify-email/?token=${encodeURIComponent(token)}${type ? `&type=${type}` : ""}`;

async function sendAlreadyHaveAccount(to: string, requestOrigin: string) {
  const mail = alreadyHaveAccountEmail({
    loginLink: `${canonicalAuthOrigin(requestOrigin)}/connexion/`,
    resetLink: `${appLinkOrigin(requestOrigin)}/forgot-password/`,
  });
  await sendTransactionalEmail({ to, ...mail });
}

/** Inscription : e-mail de vérification, ou « vous avez déjà un compte » (rien n'est créé), ou rien (PlatformUser). */
export function scheduleEmailSignup(input: { email: string; name: string; passwordHash: string; requestOrigin: string }): void {
  schedule("inscription e-mail", "/api/auth/signup/email", async () => {
    const result = await startEmailSignup({ email: input.email, name: input.name, passwordHash: input.passwordHash });
    if (result.kind === "created") {
      const mail = signupVerificationEmail({ name: input.name, link: verifyLink(canonicalAuthOrigin(input.requestOrigin), result.token) });
      await sendTransactionalEmail({ to: input.email, ...mail });
    } else if (result.kind === "existing") {
      await sendAlreadyHaveAccount(input.email, input.requestOrigin);
    }
  });
}

/** Renvoi du lien : mêmes branches que l'inscription ; sans inscription ouverte, aucun effet. */
export function scheduleEmailResend(input: { email: string; requestOrigin: string }): void {
  schedule("renvoi e-mail d'inscription", "/api/auth/signup/email/resend", async () => {
    const result = await resendEmailSignup(input.email);
    if (result.kind === "created") {
      const mail = signupVerificationEmail({ name: result.name, link: verifyLink(canonicalAuthOrigin(input.requestOrigin), result.token) });
      await sendTransactionalEmail({ to: input.email, ...mail });
    } else if (result.kind === "existing") {
      await sendAlreadyHaveAccount(input.email, input.requestOrigin);
    }
  });
}

/** Changement ou vérification d'adresse d'un compte connecté : le lien part vers la NOUVELLE adresse seulement. */
export function scheduleEmailChange(input: { userId: string; organizationId: string; email: string; requestOrigin: string }): void {
  schedule("changement d'e-mail", "/api/auth/account-security/email", async () => {
    const result = await requestEmailChange({ userId: input.userId, organizationId: input.organizationId, email: input.email });
    if (result.kind !== "created") return;
    const mail = emailChangeVerificationEmail({
      name: result.firstName,
      link: verifyLink(appLinkOrigin(input.requestOrigin), result.token, "change"),
      sameAddress: result.sameAddress,
    });
    await sendTransactionalEmail({ to: input.email, ...mail });
  });
}

/** Attend les tâches en cours (tests). */
export async function flushAuthEmailTasks(): Promise<void> {
  await Promise.all([...pending]);
}
