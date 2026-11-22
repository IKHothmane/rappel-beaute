import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, send } = vi.hoisted(() => ({ query: vi.fn(), send: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: () => true, sendTransactionalEmail: send }));

import { sendTrialReminders, TRIAL_END_NOTIFY_EMAIL } from "@/lib/subscriptions/trial-reminders";

const now = new Date("2026-11-22T09:00:00Z");
const row = (endsAt: string, email: string | null = "sara@exemple.ma") => ({
  subscriptionId: "sub_abc123def456", organizationId: "org1", trialEndsAt: new Date(endsAt), orgName: "Institut Royal",
  userId: "u1", email, firstName: "Sara", lastName: "Alami", orgPhone: "0612345678",
});

describe("e-mail à l'équipe à chaque fin d'essai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue({ messageId: "m" });
  });

  function mockDb(rows: unknown[], inserted = 1) {
    query.mockImplementation(async (sql: string) => (/FROM "Subscription"/.test(sql) ? { rows } : { rows: [], rowCount: inserted }));
  }

  it("écrit à ikhlef.othmane@gmail.com en plus du propriétaire", async () => {
    mockDb([row("2026-11-21T09:00:00Z")]);
    const result = await sendTrialReminders({ now });
    expect(result).toMatchObject({ emailed: 1, adminNotified: 1 });
    expect(TRIAL_END_NOTIFY_EMAIL).toBe("ikhlef.othmane@gmail.com");
    const [client, admin] = send.mock.calls.map(([mail]) => mail);
    expect(client.to).toBe("sara@exemple.ma");
    expect(client.text).toContain("Donner mon avis");
    expect(admin.to).toBe("ikhlef.othmane@gmail.com");
    expect(admin.subject).toBe("Fin d'essai — Institut Royal");
    expect(admin.text).toContain("sara@exemple.ma");
    expect(admin.text).toContain("0612345678");
    expect(admin.replyTo).toBe("sara@exemple.ma");
  });

  it("ne prévient l'équipe qu'une seule fois (même verrou que le propriétaire)", async () => {
    mockDb([row("2026-11-21T09:00:00Z")], 0);
    const result = await sendTrialReminders({ now });
    expect(result).toMatchObject({ alreadySent: 1, adminNotified: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("n'envoie rien à l'équipe pour les relances J-5 et J-1", async () => {
    mockDb([row("2026-11-26T09:00:00Z"), row("2026-11-22T20:00:00Z")]);
    const result = await sendTrialReminders({ now });
    expect(result.adminNotified).toBe(0);
    expect(send.mock.calls.every(([mail]) => mail.to === "sara@exemple.ma")).toBe(true);
  });

  it("prévient l'équipe même sans e-mail du propriétaire", async () => {
    mockDb([row("2026-11-21T09:00:00Z", null)]);
    const result = await sendTrialReminders({ now });
    expect(result).toMatchObject({ emailed: 0, adminNotified: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].text).toContain("Non envoyé");
  });

  it("si l'e-mail du propriétaire échoue, rien n'est envoyé à l'équipe et le prochain passage réessaie", async () => {
    mockDb([row("2026-11-21T09:00:00Z")]);
    send.mockRejectedValueOnce(new Error("resend down"));
    const result = await sendTrialReminders({ now });
    expect(result).toMatchObject({ failures: 1, adminNotified: 0, notified: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(query.mock.calls.some(([sql]) => /DELETE FROM "Notification"/.test(String(sql)))).toBe(true);
  });

  it("un échec d'envoi à l'équipe ne relance pas le propriétaire", async () => {
    mockDb([row("2026-11-21T09:00:00Z")]);
    send.mockResolvedValueOnce({ messageId: "client" }).mockRejectedValueOnce(new Error("boom"));
    const result = await sendTrialReminders({ now });
    expect(result).toMatchObject({ emailed: 1, adminNotified: 0, failures: 0 });
    expect(query.mock.calls.some(([sql]) => /DELETE FROM "Notification"/.test(String(sql)))).toBe(false);
  });
});
