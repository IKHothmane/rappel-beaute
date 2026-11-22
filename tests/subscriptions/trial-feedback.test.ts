import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, claim } = vi.hoisted(() => ({ send: vi.fn(), claim: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn() } }));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: () => true, sendTransactionalEmail: send }));
vi.mock("@/lib/rate-limit", () => ({
  consumeDimensions: async () => ({ allowed: true }),
  claimIdempotency: claim,
  releaseIdempotency: async () => undefined,
}));

import { POST } from "@/app/api/public/trial-feedback/route";
import { buildTrialReminder } from "@/lib/subscriptions/trial-reminders";
import { signTrialFeedbackToken, trialFeedbackUrl, verifyTrialFeedbackToken } from "@/lib/subscriptions/trial-feedback";

const subject = { subscriptionId: "sub_abc123def456", orgName: "Institut Royal" };

function post(body: unknown) {
  return POST(new NextRequest("https://rappelbeauty.com/api/public/trial-feedback/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { params: {} } as never);
}

describe("jeton du lien d'avis", () => {
  it("se vérifie et restitue l'abonnement et l'institut", () => {
    expect(verifyTrialFeedbackToken(signTrialFeedbackToken(subject))).toEqual(subject);
  });

  it("refuse un jeton modifié, tronqué ou inventé", () => {
    const token = signTrialFeedbackToken(subject);
    const [payload, sig] = token.split(".");
    const other = Buffer.from(JSON.stringify({ i: "sub_autre123456", o: "Autre" })).toString("base64url");
    expect(verifyTrialFeedbackToken(`${other}.${sig}`)).toBeNull();
    expect(verifyTrialFeedbackToken(`${payload}.${sig.slice(0, -2)}AA`)).toBeNull();
    expect(verifyTrialFeedbackToken(payload)).toBeNull();
    expect(verifyTrialFeedbackToken("")).toBeNull();
    expect(verifyTrialFeedbackToken(null)).toBeNull();
    expect(verifyTrialFeedbackToken("x".repeat(500))).toBeNull();
  });

  it("ne met ni e-mail ni téléphone dans l'adresse", () => {
    const url = decodeURIComponent(trialFeedbackUrl(subject));
    expect(url).toContain("/avis-essai/?t=");
    expect(url).not.toMatch(/@|\+212|0[67]\d{8}/);
  });
});

describe("e-mail de fin d'essai", () => {
  const base = { firstName: "Nadia", orgName: "Institut Royal", trialEndsAt: new Date("2026-11-20T00:00:00Z"), now: new Date("2026-11-21T00:00:00Z") };

  it("remercie et propose de donner son avis, avec le lien signé", () => {
    const feedbackUrl = trialFeedbackUrl(subject);
    const mail = buildTrialReminder({ ...base, stage: "EXPIRED", feedbackUrl });
    expect(mail.subject).toContain("Merci");
    expect(mail.subject).toContain("terminé");
    expect(mail.text).toContain("Donner mon avis");
    expect(mail.text).toContain(feedbackUrl);
    expect(mail.html).toContain("Donner mon avis");
    expect(mail.html).toContain("Institut Royal");
  });

  it("n'ajoute pas ce lien aux relances J-5 et J-1", () => {
    for (const stage of ["D5", "D1"] as const) {
      const mail = buildTrialReminder({ ...base, stage, trialEndsAt: new Date("2026-11-23T00:00:00Z"), feedbackUrl: "https://x/avis" });
      expect(mail.text).not.toContain("Donner mon avis");
      expect(mail.html).not.toContain("Donner mon avis");
    }
  });
});

describe("POST /api/public/trial-feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claim.mockResolvedValue(true);
    send.mockResolvedValue({ messageId: "m1" });
  });
  const token = () => signTrialFeedbackToken(subject);

  it("transmet l'avis à l'équipe avec le nom de l'institut", async () => {
    const res = await post({ token: token(), rating: 4, liked: "Agenda clair", improve: "Plus de rapports" });
    expect(res.status).toBe(200);
    const mail = send.mock.calls[0][0];
    expect(mail.subject).toContain("Institut Royal");
    expect(mail.subject).toContain("4/5");
    expect(mail.text).toContain("Agenda clair");
  });

  it("refuse un lien invalide, une note hors 1 à 5 et un texte trop long", async () => {
    expect((await post({ token: "faux.jeton", rating: 5 })).status).toBe(400);
    expect((await post({ token: token(), rating: 0 })).status).toBe(400);
    expect((await post({ token: token(), rating: 6 })).status).toBe(400);
    expect((await post({ token: token(), rating: 3, liked: "a".repeat(1001) })).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("échappe le HTML saisi et ignore les robots", async () => {
    await post({ token: token(), rating: 5, liked: "<img src=x onerror=alert(1)>" });
    expect(send.mock.calls[0][0].html).not.toContain("<img src=x");
    send.mockClear();
    const bot = await post({ token: token(), rating: 5, website: "http://spam" });
    expect(bot.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("n'envoie pas deux fois le même avis", async () => {
    claim.mockResolvedValue(false);
    expect((await post({ token: token(), rating: 5 })).status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });
});
