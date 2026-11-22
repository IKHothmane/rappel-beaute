import { pool } from "@/lib/db/pool";
import { fetchAdminSubscription } from "@/lib/db/admin-subscriptions";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL } from "@/lib/email/signup-lead";
import { logger } from "@/lib/logger";
import { publicAppOrigin, SITE } from "@/lib/site";

const DAY_MS = 86_400_000;

export type PeriodSnapshot = { organizationId: string; organizationName: string; status: string; end: string };

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Essai gratuit",
  ACTIVE: "Abonnement actif",
  PAST_DUE: "Paiement en retard",
  PAUSED: "En pause",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
};

const frDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Casablanca" });

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Vrai si la fin de période ou le statut a changé : sinon (prix, paiement) il n'y a rien à annoncer. */
export function periodChanged(before: PeriodSnapshot | null, after: PeriodSnapshot): boolean {
  if (!before) return true;
  return new Date(before.end).getTime() !== new Date(after.end).getTime() || before.status !== after.status;
}

export function buildPeriodClientEmail(input: {
  firstName: string;
  orgName: string;
  status: string;
  end: string;
  now?: Date;
}): { subject: string; html: string; text: string } {
  const firstName = input.firstName.trim() || "Bonjour";
  const endLabel = frDate(input.end);
  const daysLeft = Math.max(0, Math.ceil((new Date(input.end).getTime() - (input.now ?? new Date()).getTime()) / DAY_MS));
  let subject: string;
  let lead: string;
  if (input.status === "TRIAL") {
    subject = "Votre période d'essai Rappel Beauty a été mise à jour";
    lead = `L'essai gratuit de ${input.orgName} est mis à jour : il se termine le ${endLabel}${daysLeft > 0 ? ` (${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""})` : ""}.`;
  } else if (input.status === "ACTIVE") {
    subject = "Votre abonnement Rappel Beauty est à jour";
    lead = `L'abonnement de ${input.orgName} est actif jusqu'au ${endLabel}.`;
  } else {
    subject = "Votre période Rappel Beauty a été mise à jour";
    lead = `La période de ${input.orgName} est mise à jour : elle court jusqu'au ${endLabel}.`;
  }
  const loginLink = `${publicAppOrigin()}/connexion/`;
  const closing = `Une question ? Écrivez-nous à ${SITE.email} ou appelez le ${SITE.phone}.`;
  const text = [`Bonjour ${firstName},`, "", lead, "", closing, `Connexion : ${loginLink}`, "", "L'équipe Rappel Beauty"].join("\n");
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f3f1;font-family:Arial,Helvetica,sans-serif;color:#1f1a1a;">
<table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" style="max-width:560px;background:#fff;border-radius:12px;padding:28px;"><tr><td>
<p style="margin:0 0 12px;font-size:13px;color:#8a7f7f;">Rappel Beauty</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${esc(subject)}</h1>
<p style="margin:0 0 12px;line-height:1.55;">Bonjour ${esc(firstName)},</p>
<p style="margin:0 0 12px;line-height:1.55;">${esc(lead)}</p>
<p style="margin:0 0 20px;line-height:1.55;">${esc(closing)}</p>
<p style="margin:0;font-size:13px;"><a href="${esc(loginLink)}" style="color:#B90058;">Se connecter à l'application</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}

export function buildPeriodAdminEmail(input: {
  orgName: string;
  action: string;
  actorName: string;
  before: PeriodSnapshot | null;
  after: PeriodSnapshot;
  ownerEmail: string | null;
  ownerEmailed: boolean;
}): { subject: string; html: string; text: string } {
  const describe = (s: PeriodSnapshot | null) =>
    s ? `${STATUS_LABEL[s.status] ?? s.status} · jusqu'au ${frDate(s.end)}` : "Aucune (nouvel abonnement)";
  const rows: Array<[string, string]> = [
    ["Institut", input.orgName],
    ["Modification", input.action],
    ["Avant", describe(input.before)],
    ["Après", describe(input.after)],
    ["Par", input.actorName || "—"],
    ["E-mail du propriétaire", input.ownerEmail || "Non renseigné"],
    ["Client prévenu par e-mail", input.ownerEmailed ? "Oui" : "Non"],
  ];
  const subject = `Période modifiée — ${input.orgName}`;
  const text = ["Une période d'abonnement vient d'être ajoutée ou modifiée.", "", ...rows.map(([l, v]) => `${l} : ${v}`)].join("\n");
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f6f3f1;font-family:Arial,Helvetica,sans-serif;color:#1f1a1a;">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;"><tr><td>
<p style="margin:0 0 8px;font-size:13px;color:#8a7f7f;">Rappel Beauty · interne</p>
<h1 style="margin:0 0 16px;font-size:20px;">Période modifiée : ${esc(input.orgName)}</h1>
<table role="presentation" style="width:100%;font-size:15px;line-height:1.45;">${rows
    .map(([l, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b635e;vertical-align:top;">${esc(l)}</td><td style="padding:6px 0;font-weight:700;">${esc(v)}</td></tr>`)
    .join("")}</table>
</td></tr></table></body></html>`;
  return { subject, html, text };
}

/** État de la période avant une modification (null si l'abonnement n'existe pas encore). */
export async function snapshotPeriod(subscriptionId: string): Promise<PeriodSnapshot | null> {
  try {
    const item = await fetchAdminSubscription(subscriptionId);
    return item
      ? { organizationId: item.organizationId, organizationName: item.organizationName, status: item.status, end: item.currentPeriodEnd }
      : null;
  } catch {
    return null;
  }
}

export type PeriodNoticeOutcome = {
  sentToOwner: boolean;
  sentToAdmin: boolean;
  /** Raison pour laquelle rien n'est parti (absent si au moins un e-mail a été envoyé). */
  skipped?: "not_configured" | "unchanged" | "error";
  /** Phrase prête à afficher à l'équipe, qui dit clairement ce qui a été envoyé ou pourquoi rien ne l'a été. */
  message: string;
};

function outcomeMessage(o: Omit<PeriodNoticeOutcome, "message">, ownerHasEmail: boolean): string {
  if (o.skipped === "not_configured") {
    return "Aucun e-mail envoyé : le service e-mail (clé RESEND_API_KEY) n'est pas configuré sur ce serveur.";
  }
  if (o.skipped === "unchanged") return "Aucun e-mail : la date de fin et le statut n'ont pas changé.";
  if (o.sentToOwner && o.sentToAdmin) return "E-mail envoyé au propriétaire, copie envoyée à l'équipe.";
  if (o.sentToAdmin) {
    return ownerHasEmail
      ? "Copie envoyée à l'équipe, mais l'e-mail au propriétaire a échoué (voir les journaux du serveur)."
      : "Copie envoyée à l'équipe. Le propriétaire n'a pas d'adresse e-mail : il n'a pas été prévenu.";
  }
  if (o.sentToOwner) return "E-mail envoyé au propriétaire, mais la copie à l'équipe a échoué (voir les journaux du serveur).";
  return "E-mail non envoyé : le service e-mail n'a pas répondu (voir les journaux du serveur).";
}

/**
 * Après un ajout ou un changement de période par l'équipe : e-mail au propriétaire de l'institut et copie à
 * l'équipe. Ne lève jamais : l'action d'administration est déjà enregistrée, l'e-mail est un plus.
 * Rien n'est envoyé si ni la fin de période ni le statut n'ont changé (simple modification de prix ou de paiement).
 * Le résultat dit ce qui est parti, pour que l'équipe le voie à l'écran au lieu de chercher dans les journaux.
 */
export async function notifyPeriodChange(input: {
  subscriptionId: string;
  action: string;
  actorName: string;
  before: PeriodSnapshot | null;
}): Promise<PeriodNoticeOutcome> {
  const flags: Omit<PeriodNoticeOutcome, "message"> = { sentToOwner: false, sentToAdmin: false };
  let ownerHasEmail = false;
  try {
    if (!isEmailConfigured()) {
      const skipped = { ...flags, skipped: "not_configured" as const };
      return { ...skipped, message: outcomeMessage(skipped, false) };
    }
    const after = await snapshotPeriod(input.subscriptionId);
    if (!after) {
      const skipped = { ...flags, skipped: "error" as const };
      return { ...skipped, message: outcomeMessage(skipped, false) };
    }
    if (!periodChanged(input.before, after)) {
      const skipped = { ...flags, skipped: "unchanged" as const };
      return { ...skipped, message: outcomeMessage(skipped, false) };
    }

    const { rows } = await pool.query<{ email: string | null; firstName: string }>(
      `SELECT email, "firstName" FROM "User"
       WHERE "organizationId" = $1 AND role = 'OWNER' AND status = 'ACTIVE'
       ORDER BY "createdAt" ASC LIMIT 1`,
      [after.organizationId],
    );
    const owner = rows[0];
    ownerHasEmail = Boolean(owner?.email);

    if (owner?.email) {
      try {
        const mail = buildPeriodClientEmail({
          firstName: owner.firstName, orgName: after.organizationName, status: after.status, end: after.end,
        });
        await sendTransactionalEmail({ to: owner.email, ...mail });
        flags.sentToOwner = true;
      } catch (error) {
        logger.error("period change owner email failed", {
          route: "admin/subscriptions", detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
    try {
      const mail = buildPeriodAdminEmail({
        orgName: after.organizationName, action: input.action, actorName: input.actorName, before: input.before, after,
        ownerEmail: owner?.email ?? null, ownerEmailed: flags.sentToOwner,
      });
      await sendTransactionalEmail({ to: PERIOD_CHANGE_NOTIFY_EMAIL, replyTo: owner?.email ?? undefined, ...mail });
      flags.sentToAdmin = true;
    } catch (error) {
      logger.error("period change admin email failed", {
        route: "admin/subscriptions", detail: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    logger.error("period change notice failed", {
      route: "admin/subscriptions", detail: error instanceof Error ? error.message : String(error),
    });
    const skipped = { ...flags, skipped: "error" as const };
    return { ...skipped, message: outcomeMessage(skipped, ownerHasEmail) };
  }
  const result = !flags.sentToOwner && !flags.sentToAdmin ? { ...flags, skipped: "error" as const } : flags;
  return { ...result, message: outcomeMessage(result, ownerHasEmail) };
}
/** Même adresse que les inscriptions et les fins d'essai. */
export const PERIOD_CHANGE_NOTIFY_EMAIL = PROFESSIONAL_SIGNUP_NOTIFY_EMAIL;

