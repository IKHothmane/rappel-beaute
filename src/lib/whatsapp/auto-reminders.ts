import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/logger";
import { syncWhatsAppTasks } from "@/lib/db/whatsapp";
import { isAutomaticWhatsAppEnabled, sendDirectWhatsAppTask } from "@/lib/whatsapp/send";
import { twilioCredentialsPresent } from "@/lib/whatsapp/twilio";
import { getOrganizationSubscription, isSubscriptionOperational } from "@/lib/subscriptions/subscription-service";

/** Au-delà de cet échec répété, une tâche n'est plus retentée automatiquement (reste envoyable à la main). */
const MAX_FAILED_ATTEMPTS = 2;
const DEFAULT_LIMIT_PER_ORG = 60;
const PAUSE_BETWEEN_SENDS_MS = 400;

/**
 * Instituts pour lesquels l'envoi automatique des rappels est activé : `AUTO_REMINDER_ORG_IDS=org_a,org_b`.
 * Volontairement explicite : un institut de démonstration ou de test n'envoie jamais rien tant qu'il n'est pas listé.
 * Le joker `*` est refusé.
 */
export function autoReminderOrgIds(): string[] {
  return (process.env.AUTO_REMINDER_ORG_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "*");
}

type AutoReminderOrgResult = {
  organizationId: string;
  skipped?: string;
  eligible: number;
  sent: number;
  failed: number;
};

type AutoReminderResult = {
  dryRun: boolean;
  enabled: boolean;
  reason?: string;
  organizations: AutoReminderOrgResult[];
  sent: number;
  failed: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Envoie par WhatsApp (Twilio / Meta) les rappels « RDV demain » déjà préparés par `syncWhatsAppTasks`.
 * Garde-fous : envoi automatique configuré, institut listé, abonnement actif, expéditeur WhatsApp de l'institut
 * défini, rendez-vous encore à venir et non annulé, 2 échecs maximum par tâche.
 */
export async function dispatchAutoAppointmentReminders(
  opts: { dryRun?: boolean; limitPerOrg?: number } = {},
): Promise<AutoReminderResult> {
  const dryRun = Boolean(opts.dryRun);
  const limit = opts.limitPerOrg ?? DEFAULT_LIMIT_PER_ORG;
  const base: AutoReminderResult = { dryRun, enabled: false, organizations: [], sent: 0, failed: 0 };

  if (!isAutomaticWhatsAppEnabled()) return { ...base, reason: "Envoi automatique WhatsApp non configuré (Twilio / Meta)." };
  const orgIds = autoReminderOrgIds();
  if (!orgIds.length) return { ...base, reason: "Aucun institut dans AUTO_REMINDER_ORG_IDS." };

  const result: AutoReminderResult = { ...base, enabled: true };

  for (const organizationId of orgIds) {
    const org: AutoReminderOrgResult = { organizationId, eligible: 0, sent: 0, failed: 0 };
    result.organizations.push(org);
    try {
      const { rows: orgRows } = await pool.query<{ status: string; whatsappFrom: string | null }>(
        `SELECT status::text, "whatsappFrom" FROM "Organization" WHERE id = $1`,
        [organizationId],
      );
      if (!orgRows[0]) { org.skipped = "institut introuvable"; continue; }
      if (orgRows[0].status !== "ACTIVE") { org.skipped = "institut inactif"; continue; }
      if (twilioCredentialsPresent() && !orgRows[0].whatsappFrom) { org.skipped = "numéro WhatsApp expéditeur non défini"; continue; }
      const sub = await getOrganizationSubscription(organizationId);
      if (!sub || !isSubscriptionOperational(sub)) { org.skipped = "abonnement inactif"; continue; }

      if (!dryRun) await syncWhatsAppTasks(organizationId);

      const { rows: tasks } = await pool.query<{ id: string }>(
        `SELECT t.id
         FROM "WhatsAppTask" t
         JOIN "Appointment" a ON a.id = t."appointmentId"
         WHERE t."organizationId" = $1
           AND t.type = 'APPOINTMENT_REMINDER'
           AND t.status = 'PENDING'
           AND t."scheduledFor" <= NOW()
           AND a.status IN ('PENDING','CONFIRMED')
           AND a."startAt" > (NOW() AT TIME ZONE 'Africa/Casablanca')
           AND (SELECT COUNT(*) FROM "AuditLog" l
                WHERE l."organizationId" = t."organizationId" AND l."entityId" = t.id
                  AND l.action = 'WHATSAPP_SEND_FAILED') < $2
         ORDER BY a."startAt"
         LIMIT $3`,
        [organizationId, MAX_FAILED_ATTEMPTS, limit],
      );
      org.eligible = tasks.length;
      if (dryRun) continue;

      for (const task of tasks) {
        try {
          await sendDirectWhatsAppTask(organizationId, task.id, { id: "system", name: "Rappel automatique" });
          org.sent++;
        } catch (e) {
          org.failed++;
          logger.error("auto reminder send failed", {
            route: "cron/appointment-reminders", organizationId, taskId: task.id,
            detail: e instanceof Error ? e.message : String(e),
          });
        }
        await sleep(PAUSE_BETWEEN_SENDS_MS);
      }
    } catch (e) {
      org.skipped = "erreur";
      logger.error("auto reminders org failed", {
        route: "cron/appointment-reminders", organizationId, detail: e instanceof Error ? e.message : String(e),
      });
    }
    result.sent += org.sent;
    result.failed += org.failed;
  }
  return result;
}
