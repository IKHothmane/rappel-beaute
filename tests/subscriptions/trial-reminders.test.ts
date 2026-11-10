import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn() } }));
vi.mock("@/lib/db/whatsapp", () => ({ syncWhatsAppTasks: vi.fn() }));
vi.mock("@/lib/whatsapp/send", () => ({ isAutomaticWhatsAppEnabled: () => true, sendDirectWhatsAppTask: vi.fn() }));
vi.mock("@/lib/whatsapp/twilio", () => ({ twilioCredentialsPresent: () => false }));
vi.mock("@/lib/subscriptions/subscription-service", () => ({
  getOrganizationSubscription: vi.fn(),
  isSubscriptionOperational: vi.fn(),
}));

import { buildTrialReminder, trialDaysLeft, trialReminderStage } from "@/lib/subscriptions/trial-reminders";
import { autoReminderOrgIds, dispatchAutoAppointmentReminders } from "@/lib/whatsapp/auto-reminders";

const DAY = 86_400_000;
const now = new Date("2026-11-09T09:00:00Z");
const endIn = (ms: number) => new Date(now.getTime() + ms);

describe("trialReminderStage", () => {
  it("ne relance pas tant qu'il reste plus de 5 jours", () => {
    expect(trialReminderStage(endIn(15 * DAY), now)).toBeNull();
    expect(trialReminderStage(endIn(5 * DAY + 1), now)).toBeNull();
  });

  it("relance à J-5 puis à J-1", () => {
    expect(trialReminderStage(endIn(5 * DAY), now)).toBe("D5");
    expect(trialReminderStage(endIn(4.2 * DAY), now)).toBe("D5");
    expect(trialReminderStage(endIn(1.5 * DAY), now)).toBe("D5");
    expect(trialReminderStage(endIn(1 * DAY), now)).toBe("D1");
    expect(trialReminderStage(endIn(3 * 3_600_000), now)).toBe("D1");
  });

  it("prévient une fois l'essai terminé, mais seulement dans les 3 jours", () => {
    expect(trialReminderStage(endIn(-3_600_000), now)).toBe("EXPIRED");
    expect(trialReminderStage(endIn(-3 * DAY), now)).toBe("EXPIRED");
    expect(trialReminderStage(endIn(-3 * DAY - 1), now)).toBeNull();
  });

  it("compte les jours restants sans jamais descendre sous zéro", () => {
    expect(trialDaysLeft(endIn(4.2 * DAY), now)).toBe(5);
    expect(trialDaysLeft(endIn(-2 * DAY), now)).toBe(0);
  });
});

describe("buildTrialReminder", () => {
  const base = { firstName: "Nadia", orgName: "Institut Royal", trialEndsAt: endIn(4.2 * DAY), now };

  it("indique le nombre de jours, le prix et le lien WhatsApp", () => {
    const c = buildTrialReminder({ ...base, stage: "D5" });
    expect(c.subject).toContain("5 jours");
    expect(c.severity).toBe("WARNING");
    expect(c.text).toContain("599 DH par mois");
    expect(c.text).toMatch(/5\s990 DH par an/);
    expect(c.html).toContain("https://wa.me/212691567246");
  });

  it("passe en critique le dernier jour et après la fin de l'essai", () => {
    expect(buildTrialReminder({ ...base, stage: "D1" }).severity).toBe("CRITICAL");
    const expired = buildTrialReminder({ ...base, stage: "EXPIRED", trialEndsAt: endIn(-DAY) });
    expect(expired.severity).toBe("CRITICAL");
    expect(expired.subject).toContain("terminé");
  });

  it("échappe le HTML du nom d'institut et du prénom", () => {
    const c = buildTrialReminder({ ...base, stage: "D5", orgName: `<img src=x onerror=alert(1)>`, firstName: `<b>Eve</b>` });
    expect(c.html).not.toContain("<img src=x");
    expect(c.html).not.toContain("<b>Eve</b>");
    expect(c.html).toContain("&lt;img src=x");
  });
});

describe("rappels de rendez-vous automatiques", () => {
  const original = process.env.AUTO_REMINDER_ORG_IDS;
  afterEach(() => {
    if (original === undefined) delete process.env.AUTO_REMINDER_ORG_IDS;
    else process.env.AUTO_REMINDER_ORG_IDS = original;
  });

  it("n'active que les instituts listés explicitement et refuse le joker", () => {
    process.env.AUTO_REMINDER_ORG_IDS = " org_a , org_b ,, * ";
    expect(autoReminderOrgIds()).toEqual(["org_a", "org_b"]);
  });

  it("n'envoie rien quand aucun institut n'est listé", async () => {
    delete process.env.AUTO_REMINDER_ORG_IDS;
    const r = await dispatchAutoAppointmentReminders();
    expect(r.enabled).toBe(false);
    expect(r.sent).toBe(0);
    expect(r.organizations).toEqual([]);
  });
});
