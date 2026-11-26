import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearTutorialDeferral,
  TUTORIAL_REFRESH_EVENT,
  tutorialDeferralKey,
} from "@/components/tutorial/events";
import { notifyTutorialRefresh } from "@/lib/tutorial-events";
import { acquireTourLock, isTourLockAvailable, releaseTourLock } from "@/components/tutorial/lock";

afterEach(() => {
  vi.unstubAllGlobals();
  releaseTourLock("onboarding");
  releaseTourLock("agenda");
});

describe("report « Plus tard » (sessionStorage)", () => {
  it("la clé est propre à l'utilisatrice (deux comptes sur un même onglet ne se mélangent pas)", () => {
    expect(tutorialDeferralKey("u1")).toBe("rb:tutorial-later:u1");
    expect(tutorialDeferralKey("u1")).not.toBe(tutorialDeferralKey("u2"));
  });

  it("la déconnexion efface le report de l'utilisatrice, et seulement le sien", () => {
    const removeItem = vi.fn();
    vi.stubGlobal("sessionStorage", { removeItem });
    clearTutorialDeferral("u1");
    expect(removeItem).toHaveBeenCalledExactlyOnceWith("rb:tutorial-later:u1");
  });

  it("ne lève jamais quand removeItem échoue (quota, mode privé)", () => {
    vi.stubGlobal("sessionStorage", {
      removeItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    });
    expect(() => clearTutorialDeferral("u1")).not.toThrow();
  });

  it("ne lève jamais quand l'accès à sessionStorage lui-même est interdit", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
    try {
      expect(() => clearTutorialDeferral("u1")).not.toThrow();
    } finally {
      // @ts-expect-error nettoyage de la propriété de test
      delete globalThis.sessionStorage;
    }
  });
});

describe("événements du tutoriel", () => {
  it("notifyTutorialRefresh émet rb:tutorial-refresh (action utile réussie)", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    notifyTutorialRefresh();
    expect((dispatchEvent.mock.calls[0][0] as Event).type).toBe(TUTORIAL_REFRESH_EVENT);
    expect(TUTORIAL_REFRESH_EVENT).toBe("rb:tutorial-refresh");
  });

  it("sont sans effet ni erreur côté serveur (pas de window)", () => {
    expect(() => notifyTutorialRefresh()).not.toThrow();
  });
});

describe("verrou de visite guidée", () => {
  it("une seule visite à la fois : le parcours et l'agenda s'excluent", () => {
    expect(isTourLockAvailable("agenda")).toBe(true);
    expect(acquireTourLock("onboarding")).toBe(true);
    expect(acquireTourLock("onboarding")).toBe(true); // ré-entrant pour le même propriétaire
    expect(acquireTourLock("agenda")).toBe(false);
    expect(isTourLockAvailable("agenda")).toBe(false);
  });

  it("seul le propriétaire peut libérer le verrou", () => {
    acquireTourLock("onboarding");
    releaseTourLock("agenda");
    expect(isTourLockAvailable("agenda")).toBe(false);
    releaseTourLock("onboarding");
    expect(isTourLockAvailable("agenda")).toBe(true);
    expect(acquireTourLock("agenda")).toBe(true);
  });
});
