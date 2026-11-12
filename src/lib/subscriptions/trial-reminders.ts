import { randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { formatPrice, PUBLIC_OFFER, publicAppOrigin, SITE } from "@/lib/site";

const DAY_MS = 86_400_000;

type TrialReminderStage = "D5" | "D1" | "EXPIRED";

/**
 * Étape de relance selon le temps restant avant la fin de l'essai.
 * Basée sur des seuils (et non sur « exactement J-5 ») : un cron manqué un jour
 * n'empêche pas la relance, et la clé d'idempotence garantit un seul envoi par étape.
 */
export function trialReminderStage(trialEndsAt: Date, now: Date = new Date()): TrialReminderStage | null {
  const msLeft = trialEndsAt.getTime() - now.getTime();
  if (msLeft <= 0) return -msLeft <= 3 * DAY_MS ? "EXPIRED" : null;
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  if (daysLeft <= 1) return "D1";
  if (daysLeft <= 5) return "D5";
  return null;
}

export function trialDaysLeft(trialEndsAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const frDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Casablanca" });

type TrialReminderContent = {
  subject: string;
  title: string;
  message: string;
  severity: "WARNING" | "CRITICAL";
  html: string;
  text: string;
};

export function buildTrialReminder(input: {
  stage: TrialReminderStage;
  firstName: string;
  orgName: string;
  trialEndsAt: Date;
  now?: Date;
}): TrialReminderContent {
  const { stage, orgName, trialEndsAt } = input;
  const firstName = input.firstName.trim() || "Bonjour";
  const days = trialDaysLeft(trialEndsAt, input.now);
  const endLabel = frDate(trialEndsAt);

  let subject: string;
  let title: string;
  let lead: string;
  if (stage === "D5") {
    subject = `Votre essai Rappel Beauty se termine dans ${days} jours`;
    title = `Votre essai se termine dans ${days} jours`;
    lead = `L'essai gratuit de ${orgName} se termine le ${endLabel}, soit dans ${days} jours.`;
  } else if (stage === "D1") {
    subject = "Dernier jour d'essai Rappel Beauty : continuez sans interruption";
    title = "Dernier jour d'essai";
    lead = `L'essai gratuit de ${orgName} se termine le ${endLabel}. Après cette date, l'accès à l'application sera suspendu.`;
  } else {
    subject = "Votre essai Rappel Beauty est terminé";
    title = "Votre essai est terminé";
    lead = `L'essai gratuit de ${orgName} s'est terminé le ${endLabel}, et l'accès à l'application est suspendu.`;
  }

  const price = `${PUBLIC_OFFER.monthlyPrice} DH par mois, ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH par an`;
  const cta =
    stage === "EXPIRED"
      ? "Pour retrouver votre accès, écrivez-nous : nous réactivons votre compte rapidement."
      : "Pour continuer sans interruption, écrivez-nous : nous activons votre abonnement.";
  const offer = `Une seule formule, tout inclus : ${price}. Sans engagement.`;

  const waText = encodeURIComponent(`Bonjour, je souhaite activer l'abonnement Rappel Beauty pour ${orgName}.`);
  const waLink = `https://wa.me/${SITE.phoneInternational.replace(/\D/g, "")}?text=${waText}`;
  const loginLink = `${publicAppOrigin()}/connexion/`;

  const text = [
    `Bonjour ${firstName},`,
    "",
    lead,
    cta,
    offer,
    "",
    `WhatsApp : ${waLink}`,
    `Téléphone : ${SITE.phone}`,
    `E-mail : ${SITE.email}`,
    `Connexion : ${loginLink}`,
    "",
    "L'équipe Rappel Beauty",
  ].join("\n");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f3f1;font-family:Arial,Helvetica,sans-serif;color:#1f1a1a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px;">
<tr><td>
<p style="margin:0 0 12px;font-size:13px;color:#8a7f7f;">Rappel Beauty</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${esc(title)}</h1>
<p style="margin:0 0 12px;line-height:1.55;">Bonjour ${esc(firstName)},</p>
<p style="margin:0 0 12px;line-height:1.55;">${esc(lead)}</p>
<p style="margin:0 0 12px;line-height:1.55;">${esc(cta)}</p>
<p style="margin:0 0 20px;line-height:1.55;">${esc(offer)}</p>
<p style="margin:0 0 20px;"><a href="${esc(waLink)}" style="display:inline-block;background:#B90058;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">Écrire sur WhatsApp</a></p>
<p style="margin:0 0 6px;font-size:14px;line-height:1.5;">Téléphone : ${esc(SITE.phone)}<br/>E-mail : ${esc(SITE.email)}</p>
<p style="margin:16px 0 0;font-size:13px;"><a href="${esc(loginLink)}" style="color:#B90058;">Se connecter à l'application</a></p>
</td></tr></table></td></tr></table></body></html>`;

  return {
    subject,
    title,
    message: stage === "EXPIRED" ? `${lead} Contactez-nous pour réactiver votre compte.` : `${lead} Contactez-nous pour activer votre abonnement.`,
    severity: stage === "D5" ? "WARNING" : "CRITICAL",
    html,
    text,
  };
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${(user ?? "").slice(0, 1)}***@${domain ?? "?"}`;
}

type TrialReminderResult = {
  dryRun: boolean;
  emailConfigured: boolean;
  considered: number;
  notified: number;
  emailed: number;
  alreadySent: number;
  failures: number;
  /** Uniquement en dryRun : ce qui serait envoyé (adresses masquées). */
  plan?: { organization: string; stage: TrialReminderStage; to: string }[];
};

type Row = {
  subscriptionId: string;
  organizationId: string;
  trialEndsAt: Date;
  orgName: string;
  userId: string;
  email: string | null;
  firstName: string;
};

/**
 * Relance les propriétaires d'instituts dont l'essai se termine (J-5, J-1) ou vient de se terminer.
 * Idempotent : une notification par (abonnement, étape, utilisatrice) sert de verrou d'envoi.
 * Si l'e-mail échoue, le verrou est retiré pour que le prochain passage réessaie.
 */
export async function sendTrialReminders(opts: { dryRun?: boolean; now?: Date } = {}): Promise<TrialReminderResult> {
  const dryRun = Boolean(opts.dryRun);
  const now = opts.now ?? new Date();
  const emailConfigured = isEmailConfigured();
  const result: TrialReminderResult = {
    dryRun, emailConfigured, considered: 0, notified: 0, emailed: 0, alreadySent: 0, failures: 0,
    ...(dryRun ? { plan: [] } : {}),
  };

  const { rows } = await pool.query<Row>(
    `SELECT s.id AS "subscriptionId", s."organizationId", s."trialEndsAt", o.name AS "orgName",
            u.id AS "userId", u.email, u."firstName"
     FROM "Subscription" s
     JOIN "Organization" o ON o.id = s."organizationId" AND o.status = 'ACTIVE'
     JOIN "User" u ON u."organizationId" = s."organizationId" AND u.role = 'OWNER' AND u.status = 'ACTIVE'
     WHERE s.status = 'TRIAL'
       AND s."trialEndsAt" IS NOT NULL
       AND s."trialEndsAt" > $1::timestamptz - INTERVAL '3 days'
       AND s."trialEndsAt" < $1::timestamptz + INTERVAL '6 days'`,
    [now.toISOString()],
  );

  for (const row of rows) {
    const trialEndsAt = new Date(row.trialEndsAt);
    const stage = trialReminderStage(trialEndsAt, now);
    if (!stage) continue;
    result.considered++;

    const key = `trial:${row.subscriptionId}:${stage}:${row.userId}`;
    const content = buildTrialReminder({ stage, firstName: row.firstName, orgName: row.orgName, trialEndsAt, now });

    if (dryRun) {
      const exists = await pool.query(`SELECT 1 FROM "Notification" WHERE "organizationId"=$1 AND "idempotencyKey"=$2`, [row.organizationId, key]);
      if (exists.rowCount) { result.alreadySent++; continue; }
      result.plan!.push({ organization: row.orgName, stage, to: row.email ? maskEmail(row.email) : "(pas d'e-mail)" });
      continue;
    }

    const notifId = `ntf_${randomBytes(8).toString("hex")}`;
    const ins = await pool.query(
      `INSERT INTO "Notification" (id, "organizationId", "userId", type, title, message, severity, "entityType", "entityId", "idempotencyKey", metadata)
       VALUES ($1,$2,$3,'SYSTEM'::"NotificationType",$4,$5,$6::"NotificationSeverity",'Subscription',$7,$8,$9::jsonb)
       ON CONFLICT ("organizationId","idempotencyKey") DO NOTHING
       RETURNING id`,
      [notifId, row.organizationId, row.userId, content.title, content.message, content.severity, row.subscriptionId, key,
       JSON.stringify({ href: "/settings/subscription/", stage })],
    );
    if (!ins.rowCount) { result.alreadySent++; continue; }
    result.notified++;

    if (!emailConfigured || !row.email) continue;
    try {
      await sendTransactionalEmail({ to: row.email, subject: content.subject, html: content.html, text: content.text });
      result.emailed++;
    } catch (e) {
      result.failures++;
      logger.error("trial reminder email failed", {
        route: "cron/trial-reminders", organizationId: row.organizationId, stage,
        detail: e instanceof Error ? e.message : String(e),
      });
      // Libère le verrou : le prochain passage retentera l'envoi.
      await pool.query(`DELETE FROM "Notification" WHERE id=$1`, [notifId]).catch(() => null);
      result.notified--;
    }
  }
  return result;
}
