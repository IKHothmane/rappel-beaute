import { describe, expect, it } from "vitest";
import type { TutorialSnapshot } from "@/components/tutorial/api";
import { isTourLockAvailable, acquireTourLock, releaseTourLock } from "@/components/tutorial/lock";
import {
  decideNavigation,
  emptyNavState,
  LOCK_BUSY_MESSAGE,
  NAV_FAILED_MESSAGE,
  onboardingAccess,
  shouldReleaseExternal,
  startOutcome,
  trackPush,
  type NavState,
} from "@/components/tutorial/logic";

/**
 * Règles de décision de TutorialHost, sans navigateur : navigation (pushedFor / retour navigateur / échec),
 * attente et reprise de la visite externe, démarrage après un 409, accès à la page de configuration.
 */
const nav = (patch: Partial<NavState> = {}): NavState => ({ ...emptyNavState(), ...patch });
const snapshot = (status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"): TutorialSnapshot => ({
  tutorial: { status, lastStep: null, version: 1 },
  progress: { services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0 },
  eligible: true,
});

describe("trackPush : une poussée n'est suivie que si le pathname change", () => {
  it("suit la navigation vers une autre page", () => {
    expect(trackPush("services", "/dashboard/", "/services/")).toEqual({ stepId: "services", from: "/dashboard/" });
  });

  it("ne suit rien quand seule la query change (équipe -> planning) : rien à attendre, rien de périmé", () => {
    expect(trackPush("planning", "/staff/", "/staff/")).toBeNull();
  });
});

describe("decideNavigation", () => {
  const base = { stepId: "services", stepPath: "/services/" };

  it("sur la page de l'étape : arrivée, quel que soit l'état de navigation précédent", () => {
    const stale = nav({ pending: { stepId: "services", from: "/dashboard/" }, blocked: "services", shownOn: "staff" });
    expect(decideNavigation({ ...base, path: "/services/", nav: stale })).toBe("on-route");
  });

  it("nous naviguons nous-mêmes vers l'étape : on attend, sans relancer la poussée (plusieurs rendus pendant un push lent)", () => {
    const state = nav({ pending: { stepId: "services", from: "/dashboard/" } });
    for (let render = 0; render < 5; render += 1) {
      expect(decideNavigation({ ...base, path: "/dashboard/", nav: state })).toBe("wait");
    }
  });

  it("la poussée a abouti sur une autre page (redirection) : la page n'a pas pu s'afficher", () => {
    const state = nav({ pending: { stepId: "services", from: "/dashboard/" } });
    expect(decideNavigation({ ...base, path: "/abonnement/", nav: state })).toBe("failed");
  });

  it("un échec déjà signalé n'est pas relancé tant que l'utilisatrice n'a pas choisi", () => {
    expect(decideNavigation({ ...base, path: "/dashboard/", nav: nav({ blocked: "services" }) })).toBe("blocked");
    // Le blocage d'une autre étape ne gêne pas celle-ci.
    expect(decideNavigation({ ...base, path: "/dashboard/", nav: nav({ blocked: "staff" }) })).toBe("push");
  });

  it("retour navigateur / lien hors parcours depuis la page affichée : pause, pas une erreur ni un forfait refusé", () => {
    expect(decideNavigation({ ...base, path: "/dashboard/", nav: nav({ shownOn: "services" }) })).toBe("left");
  });

  it("rien n'est en cours et l'étape n'a jamais été affichée : l'hôte navigue lui-même", () => {
    expect(decideNavigation({ ...base, path: "/dashboard/", nav: nav() })).toBe("push");
    // Une poussée périmée d'une autre étape ne bloque pas celle-ci.
    expect(decideNavigation({ ...base, path: "/dashboard/", nav: nav({ pending: { stepId: "staff", from: "/dashboard/" } }) })).toBe("push");
  });

  it("scénario équipe -> planning : même pathname, jamais d'attente ni de poussée périmée", () => {
    // goTo(planning) depuis /staff/ : trackPush renvoie null, l'état reste vierge, puis l'étape est affichée.
    const state = nav({ pending: trackPush("planning", "/staff/", "/staff/") });
    expect(decideNavigation({ stepId: "planning", stepPath: "/staff/", path: "/staff/", nav: state })).toBe("on-route");
    // Après affichage, une navigation hors de la page est une pause (et non « avalée » par un suivi resté en place).
    const shown = nav({ shownOn: "planning" });
    expect(decideNavigation({ stepId: "planning", stepPath: "/staff/", path: "/services/", nav: shown })).toBe("left");
  });
});

describe("messages", () => {
  it("l'échec de navigation n'accuse ni le forfait ni les droits sans preuve", () => {
    expect(NAV_FAILED_MESSAGE).toBe("La page n’a pas pu s’afficher. Vous pouvez réessayer ou passer cette étape.");
    expect(NAV_FAILED_MESSAGE).not.toMatch(/forfait|droits/i);
  });

  it("le verrou occupé explique la situation et promet la reprise", () => {
    expect(LOCK_BUSY_MESSAGE).toMatch(/autre visite guidée/i);
    expect(LOCK_BUSY_MESSAGE).toMatch(/Réessayer/);
  });
});

describe("filet de la visite externe (agenda, équipe)", () => {
  it("reprend la main seulement si la visite n'est pas active et si le verrou est libre", () => {
    expect(shouldReleaseExternal({ externalActive: false, lockAvailable: true })).toBe(true);
  });

  it("ne reprend pas pendant que l'autre visite charge encore driver.js (verrou tenu) : pas de course", () => {
    expect(shouldReleaseExternal({ externalActive: false, lockAvailable: false })).toBe(false);
  });

  it("ne reprend jamais une visite active", () => {
    expect(shouldReleaseExternal({ externalActive: true, lockAvailable: true })).toBe(false);
    expect(shouldReleaseExternal({ externalActive: true, lockAvailable: false })).toBe(false);
  });

  it("le verrou reflète bien l'occupation par l'autre visite", () => {
    try {
      expect(isTourLockAvailable("onboarding")).toBe(true);
      expect(acquireTourLock("agenda")).toBe(true);
      expect(isTourLockAvailable("onboarding")).toBe(false);
      expect(isTourLockAvailable("agenda")).toBe(true); // ré-entrant pour son propriétaire
      expect(acquireTourLock("onboarding")).toBe(false); // l'hôte doit alors afficher « Réessayer », pas échouer en silence
      releaseTourLock("agenda");
      expect(isTourLockAvailable("onboarding")).toBe(true);
    } finally {
      releaseTourLock("agenda");
      releaseTourLock("onboarding");
    }
  });
});

describe("startOutcome : « Commencer » après un échec d'écriture", () => {
  it("écriture réussie : on démarre", () => {
    expect(startOutcome({ ok: true, snapshot: snapshot("IN_PROGRESS") })).toBe("begin");
  });

  it("409 mais le GET de rattrapage montre un tutoriel déjà démarré : on démarre, sans « indisponible »", () => {
    expect(startOutcome({ ok: false, snapshot: snapshot("IN_PROGRESS") })).toBe("begin");
  });

  it("409 car terminé ou ignoré ailleurs : on referme la carte, on ne lance rien", () => {
    expect(startOutcome({ ok: false, snapshot: snapshot("COMPLETED") })).toBe("close");
    expect(startOutcome({ ok: false, snapshot: snapshot("SKIPPED") })).toBe("close");
  });

  it("« indisponible » seulement quand le GET échoue aussi (ou que le serveur n'a rien démarré)", () => {
    expect(startOutcome({ ok: false, snapshot: null })).toBe("unavailable");
    expect(startOutcome({ ok: false, snapshot: snapshot("NOT_STARTED") })).toBe("unavailable");
    expect(startOutcome({ ok: false, snapshot: { ...snapshot("IN_PROGRESS"), tutorial: null } })).toBe("unavailable");
  });
});

describe("onboardingAccess : page réservée au propriétaire", () => {
  it("n'affiche ni refus ni progression tant que la session charge", () => {
    expect(onboardingAccess({ loading: true, role: null })).toBe("loading");
    expect(onboardingAccess({ loading: true, role: "OWNER" })).toBe("loading");
  });

  it("le propriétaire voit sa progression", () => {
    expect(onboardingAccess({ loading: false, role: "OWNER" })).toBe("owner");
  });

  it.each(["MANAGER", "STAFF", "RECEPTIONIST", null])("le rôle %s n'a pas de progression : accès réservé, jamais un faux 0 %%", (role) => {
    expect(onboardingAccess({ loading: false, role })).toBe("denied");
  });
});
