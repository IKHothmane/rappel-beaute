import { describe, expect, it } from "vitest";
import { describeSubscription } from "@/lib/subscriptions/status-display";

const now = new Date("2026-11-21T12:00:00Z");

describe("affichage de l'abonnement", () => {
  it("Actif avant l'échéance", () => {
    const d = describeSubscription({ status: "ACTIVE", currentPeriodEnd: "2026-12-08T00:00:00Z", trialEndsAt: null }, now);
    expect(d).toMatchObject({ badge: "Actif", tone: "ok", overdue: false });
    expect(d.line).toContain("Renouvellement le 08/12/2026");
  });

  it("n'affiche plus « Actif » quand la période est échue (cas 08/11/2026)", () => {
    const d = describeSubscription({ status: "ACTIVE", currentPeriodEnd: "2026-11-08T00:00:00Z", trialEndsAt: null }, now);
    expect(d).toMatchObject({ badge: "Renouvellement en retard", tone: "warn", overdue: true });
    expect(d.line).toContain("08/11/2026");
    expect(d.line).toContain("13 jours");
    expect(d.line).not.toContain("Renouvellement le");
  });

  it("PAST_DUE est toujours signalé en retard", () => {
    expect(describeSubscription({ status: "PAST_DUE", currentPeriodEnd: "2026-12-08T00:00:00Z", trialEndsAt: null }, now).overdue).toBe(true);
  });

  it("essai en cours puis terminé", () => {
    expect(describeSubscription({ status: "TRIAL", currentPeriodEnd: "2026-11-25T00:00:00Z", trialEndsAt: "2026-11-25T00:00:00Z" }, now)).toMatchObject({ badge: "Essai gratuit", overdue: false });
    expect(describeSubscription({ status: "TRIAL", currentPeriodEnd: "2026-11-10T00:00:00Z", trialEndsAt: "2026-11-10T00:00:00Z" }, now)).toMatchObject({ badge: "Essai terminé", overdue: true });
  });

  it.each([
    ["CANCELLED", "Annulé"],
    ["EXPIRED", "Expiré"],
    ["PAUSED", "En pause"],
  ] as const)("%s", (status, badge) => {
    expect(describeSubscription({ status, currentPeriodEnd: "2026-11-08T00:00:00Z", trialEndsAt: null }, now).badge).toBe(badge);
  });
});
