import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, send, fetchSub } = vi.hoisted(() => ({ query: vi.fn(), send: vi.fn(), fetchSub: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/db/admin-subscriptions", () => ({ fetchAdminSubscription: fetchSub }));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: () => true, sendTransactionalEmail: send }));

import {
  buildPeriodAdminEmail,
  buildPeriodClientEmail,
  notifyPeriodChange,
  periodChanged,
  type PeriodSnapshot,
} from "@/lib/subscriptions/period-change-notice";

const snap = (status: string, end: string): PeriodSnapshot => ({ organizationId: "org1", organizationName: "Institut Royal", status, end });
const item = (status: string, end: string) => ({ organizationId: "org1", organizationName: "Institut Royal", status, currentPeriodEnd: end });

describe("détection d'un changement de période", () => {
  it("compte une nouvelle fin de période ou un nouveau statut, pas un simple changement de prix", () => {
    expect(periodChanged(snap("TRIAL", "2026-12-01T00:00:00Z"), snap("TRIAL", "2026-12-16T00:00:00Z"))).toBe(true);
    expect(periodChanged(snap("TRIAL", "2026-12-01T00:00:00Z"), snap("ACTIVE", "2026-12-01T00:00:00Z"))).toBe(true);
    expect(periodChanged(snap("ACTIVE", "2026-12-01T00:00:00Z"), snap("ACTIVE", "2026-12-01T00:00:00.000Z"))).toBe(false);
    expect(periodChanged(null, snap("TRIAL", "2026-12-01T00:00:00Z"))).toBe(true);
  });
});

describe("e-mails de modification de période", () => {
  const now = new Date("2026-11-22T00:00:00Z");

  it("essai : annonce la date de fin et les jours restants au propriétaire", () => {
    const mail = buildPeriodClientEmail({ firstName: "Sara", orgName: "Institut Royal", status: "TRIAL", end: "2026-12-07T00:00:00Z", now });
    expect(mail.subject).toContain("essai");
    expect(mail.text).toContain("Sara");
    expect(mail.text).toContain("7 décembre 2026");
    expect(mail.text).toContain("15 jours restants");
  });

  it("abonnement actif : annonce la date jusqu'à laquelle il court", () => {
    const mail = buildPeriodClientEmail({ firstName: "Sara", orgName: "Institut Royal", status: "ACTIVE", end: "2027-01-10T00:00:00Z", now });
    expect(mail.subject).toContain("abonnement");
    expect(mail.text).toContain("actif jusqu'au 10 janvier 2027");
  });

  it("échappe le HTML du nom de l'institut", () => {
    const mail = buildPeriodClientEmail({ firstName: "<b>x</b>", orgName: "<img src=x onerror=1>", status: "ACTIVE", end: "2027-01-10T00:00:00Z", now });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).not.toContain("<b>x</b>");
  });

  it("copie interne : avant, après, auteur et si le client a été prévenu", () => {
    const mail = buildPeriodAdminEmail({
      orgName: "Institut Royal", action: "Période offerte de 30 jours", actorName: "Othmane",
      before: snap("TRIAL", "2026-11-20T00:00:00Z"), after: snap("ACTIVE", "2026-12-20T00:00:00Z"),
      ownerEmail: "sara@exemple.ma", ownerEmailed: true,
    });
    expect(mail.subject).toBe("Période modifiée — Institut Royal");
    for (const part of ["Essai gratuit", "20 novembre 2026", "Abonnement actif", "20 décembre 2026", "Othmane", "sara@exemple.ma", "Oui"]) {
      expect(mail.text).toContain(part);
    }
  });
});

describe("notifyPeriodChange", () => {
  it("dit clairement que rien n'est parti quand le service e-mail n'est pas configuré", async () => {
    vi.resetModules();
    vi.doMock("@/lib/email/send", () => ({ isEmailConfigured: () => false, sendTransactionalEmail: send }));
    const { notifyPeriodChange: notify } = await import("@/lib/subscriptions/period-change-notice");
    const out = await notify({ subscriptionId: "sub1", action: "x", actorName: "y", before: null });
    expect(out).toMatchObject({ skipped: "not_configured", sentToOwner: false, sentToAdmin: false });
    expect(out.message).toContain("RESEND_API_KEY");
    vi.doUnmock("@/lib/email/send");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue({ messageId: "m" });
    query.mockResolvedValue({ rows: [{ email: "sara@exemple.ma", firstName: "Sara" }] });
  });
  const base = { subscriptionId: "sub1", action: "Période offerte de 30 jours", actorName: "Othmane" };

  it("écrit au propriétaire puis envoie la copie à ikhlef.othmane@gmail.com", async () => {
    fetchSub.mockResolvedValue(item("ACTIVE", "2026-12-30T00:00:00Z"));
    const out = await notifyPeriodChange({ ...base, before: snap("TRIAL", "2026-11-20T00:00:00Z") });
    expect(out).toMatchObject({ sentToOwner: true, sentToAdmin: true });
    expect(send.mock.calls.map(([mail]) => mail.to)).toEqual(["sara@exemple.ma", "ikhlef.othmane@gmail.com"]);
  });

  it("n'envoie rien si ni la date ni le statut n'ont changé (prix ou paiement)", async () => {
    fetchSub.mockResolvedValue(item("ACTIVE", "2026-12-30T00:00:00Z"));
    const out = await notifyPeriodChange({ ...base, before: snap("ACTIVE", "2026-12-30T00:00:00Z") });
    expect(out).toMatchObject({ sentToOwner: false, sentToAdmin: false });
    expect(send).not.toHaveBeenCalled();
  });

  it("prévient l'équipe même sans e-mail de propriétaire", async () => {
    query.mockResolvedValue({ rows: [{ email: null, firstName: "Sara" }] });
    fetchSub.mockResolvedValue(item("TRIAL", "2026-12-30T00:00:00Z"));
    const out = await notifyPeriodChange({ ...base, before: null });
    expect(out).toMatchObject({ sentToOwner: false, sentToAdmin: true });
    expect(send.mock.calls[0][0].text).toContain("Client prévenu par e-mail : Non");
  });

  it("ne lève jamais : un échec d'envoi ne casse pas l'action d'administration", async () => {
    fetchSub.mockResolvedValue(item("ACTIVE", "2026-12-30T00:00:00Z"));
    send.mockRejectedValue(new Error("resend down"));
    await expect(notifyPeriodChange({ ...base, before: null })).resolves.toMatchObject({ sentToOwner: false, sentToAdmin: false });
    fetchSub.mockRejectedValue(new Error("db down"));
    await expect(notifyPeriodChange({ ...base, before: null })).resolves.toMatchObject({ sentToOwner: false, sentToAdmin: false });
  });
});
