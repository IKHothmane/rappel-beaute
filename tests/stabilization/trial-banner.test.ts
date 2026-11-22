import { describe, expect, it } from "vitest";
import { trialBanner } from "@/lib/subscriptions/trial-banner";

const now = new Date("2026-11-22T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const trial = (daysFromNow: number, total = 15) => {
  const end = new Date(now.getTime() + daysFromNow * day);
  return { status: "TRIAL", startedAt: new Date(end.getTime() - total * day).toISOString(), trialEndsAt: end.toISOString() };
};

describe("bandeau de période d'essai", () => {
  it("affiche les jours restants d'un essai de 15 jours", () => {
    expect(trialBanner(trial(9), now)).toMatchObject({ kind: "running", totalDays: 15, daysLeft: 9 });
  });

  it("passe en alerte à 3 jours ou moins", () => {
    expect(trialBanner(trial(3), now)).toMatchObject({ kind: "ending", daysLeft: 3 });
    expect(trialBanner(trial(0.4), now)).toMatchObject({ kind: "ending", daysLeft: 1 });
  });

  it("signale la fin des 15 jours", () => {
    expect(trialBanner(trial(-0.1), now)).toMatchObject({ kind: "ended", totalDays: 15, daysLeft: 0 });
    expect(trialBanner(trial(-20), now)?.kind).toBe("ended");
    expect(trialBanner({ ...trial(5), status: "EXPIRED" }, now)?.kind).toBe("ended");
  });

  it("ne montre rien pour un abonnement payé ou sans essai", () => {
    expect(trialBanner({ ...trial(5), status: "ACTIVE" }, now)).toBeNull();
    expect(trialBanner({ ...trial(5), status: "PAST_DUE" }, now)).toBeNull();
    expect(trialBanner({ status: "TRIAL", startedAt: null, trialEndsAt: null }, now)).toBeNull();
    expect(trialBanner(null, now)).toBeNull();
  });

  it("reprend la durée réelle de l'essai, sinon 15 jours", () => {
    expect(trialBanner(trial(4, 7), now)?.totalDays).toBe(7);
    expect(trialBanner({ status: "TRIAL", startedAt: null, trialEndsAt: trial(4).trialEndsAt }, now)?.totalDays).toBe(15);
  });
});
