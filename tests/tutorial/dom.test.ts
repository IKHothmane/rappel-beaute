import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyInverseZoom,
  findVisibleTarget,
  isDesktopNav,
  isModalOpen,
  isVisibleInViewport,
  normalizeAppPath,
  rootZoom,
  TARGET_TIMEOUT_MS,
  TargetUnavailableError,
  waitForVisibleTarget,
} from "@/components/tutorial/dom";

/**
 * dom.ts sans navigateur (le projet n'embarque pas jsdom) : un mini DOM factice reproduit seulement ce que lit le
 * module (rects, styles calculés, querySelectorAll, matchMedia, rAF). Les rendus réels sont couverts par Playwright.
 */
const VIEWPORT = { width: 390, height: 800 };

type Box = { left: number; top: number; width: number; height: number };
type FakeEl = HTMLElement & {
  box: Box;
  rendered: boolean;
  style: { visibility: string; display: string };
  scrolls: number;
  onScroll?: (el: FakeEl) => void;
  matchesClosest: string[];
};

function el(box: Box, over: Partial<{ rendered: boolean; visibility: string; display: string; closest: string[]; dialog: boolean }> = {}): FakeEl {
  const fake = {
    box,
    rendered: over.rendered ?? true,
    style: { visibility: over.visibility ?? "visible", display: over.display ?? "block" },
    scrolls: 0,
    matchesClosest: over.closest ?? [],
    getClientRects() {
      return this.rendered ? [{}] : [];
    },
    getBoundingClientRect() {
      const b = this.box as Box;
      return { x: b.left, y: b.top, left: b.left, top: b.top, width: b.width, height: b.height, right: b.left + b.width, bottom: b.top + b.height };
    },
    scrollIntoView() {
      this.scrolls += 1;
      this.onScroll?.(this as unknown as FakeEl);
    },
    closest(selector: string) {
      return (this.matchesClosest as string[]).includes(selector) ? this : null;
    },
  };
  return fake as unknown as FakeEl;
}

const inView: Box = { left: 20, top: 100, width: 120, height: 40 };
const drawerClosed: Box = { left: -300, top: 0, width: 280, height: 800 }; // translaté hors écran à gauche

let registry: Record<string, FakeEl[]>;
let clock: number;
let frames: Array<() => void>;
const rootStyle = { zoom: "0.8" };
const bodyVars = new Map<string, string>();

function runFrame(ms = 16) {
  clock += ms;
  const pending = frames;
  frames = [];
  pending.forEach((cb) => cb());
}

beforeEach(() => {
  registry = {};
  clock = 0;
  frames = [];
  rootStyle.zoom = "0.8";
  bodyVars.clear();
  const documentElement = { style: rootStyle };
  vi.stubGlobal("document", {
    documentElement,
    body: {
      style: {
        getPropertyValue: (name: string) => bodyVars.get(name) ?? "",
        setProperty: (name: string, value: string) => void bodyVars.set(name, value),
        removeProperty: (name: string) => void bodyVars.delete(name),
      },
    },
    querySelectorAll: (selector: string) => registry[selector] ?? [],
  });
  vi.stubGlobal("window", {
    innerWidth: VIEWPORT.width,
    innerHeight: VIEWPORT.height,
    matchMedia: (query: string) => ({ matches: query === "(min-width: 1024px)" && VIEWPORT.width >= 1024 }),
    location: { pathname: "/domains/app/services" },
  });
  vi.stubGlobal("getComputedStyle", (node: unknown) => (node === documentElement ? rootStyle : (node as FakeEl).style));
  vi.stubGlobal("performance", { now: () => clock });
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
});
afterEach(() => vi.unstubAllGlobals());

describe("isVisibleInViewport", () => {
  it("accepte une cible dans l'écran, y compris partiellement visible", () => {
    expect(isVisibleInViewport(el(inView))).toBe(true);
    expect(isVisibleInViewport(el({ left: -60, top: 100, width: 120, height: 40 }))).toBe(true);
  });

  it("refuse le tiroir mobile fermé : rendu mais translaté hors de l'écran", () => {
    const drawer = el(drawerClosed);
    expect(drawer.getClientRects().length).toBe(1); // rendu...
    expect(isVisibleInViewport(drawer)).toBe(false); // ...mais pas visible
    expect(isVisibleInViewport(el({ left: VIEWPORT.width + 10, top: 0, width: 100, height: 40 }))).toBe(false);
    expect(isVisibleInViewport(el({ left: 0, top: VIEWPORT.height + 5, width: 100, height: 40 }))).toBe(false);
    expect(isVisibleInViewport(el({ left: 0, top: -200, width: 100, height: 100 }))).toBe(false);
  });

  it("refuse display:none, visibility:hidden, absence de boîte et taille nulle", () => {
    expect(isVisibleInViewport(el(inView, { display: "none" }))).toBe(false);
    expect(isVisibleInViewport(el(inView, { visibility: "hidden" }))).toBe(false);
    expect(isVisibleInViewport(el(inView, { rendered: false }))).toBe(false);
    expect(isVisibleInViewport(el({ left: 10, top: 10, width: 0, height: 40 }))).toBe(false);
    expect(isVisibleInViewport(el({ left: 10, top: 10, width: 40, height: 0 }))).toBe(false);
  });
});

describe("findVisibleTarget", () => {
  it("ignore le doublon mobile/desktop non visible et renvoie la copie affichée", () => {
    const hidden = el(drawerClosed);
    const shown = el(inView);
    registry['[data-tour="nav-services"]'] = [hidden, shown];
    expect(findVisibleTarget(['[data-tour="nav-services"]'])).toBe(shown);
  });

  it("respecte l'ordre des sélecteurs : le premier sélecteur visible l'emporte", () => {
    const first = el(inView);
    const second = el({ left: 30, top: 300, width: 80, height: 30 });
    registry["#a"] = [first];
    registry["#b"] = [second];
    expect(findVisibleTarget(["#b", "#a"])).toBe(second);
    expect(findVisibleTarget(["#a", "#b"])).toBe(first);
  });

  it("passe au sélecteur suivant quand le premier n'a que des cibles invisibles", () => {
    registry["#a"] = [el(drawerClosed), el(inView, { display: "none" })];
    const fallback = el(inView);
    registry["#b"] = [fallback];
    expect(findVisibleTarget(["#a", "#b"])).toBe(fallback);
  });

  it("renvoie undefined sans correspondance visible", () => {
    registry["#a"] = [el(drawerClosed)];
    expect(findVisibleTarget(["#a", "#missing"])).toBeUndefined();
    expect(findVisibleTarget([])).toBeUndefined();
  });

  it("avec canScroll, une cible rendue hors écran (page à défiler) est acceptée", () => {
    const below = el({ left: 20, top: VIEWPORT.height + 900, width: 120, height: 40 });
    registry["#a"] = [below];
    expect(findVisibleTarget(["#a"], false)).toBeUndefined();
    expect(findVisibleTarget(["#a"], true)).toBe(below);
    // ...mais jamais un élément non rendu.
    expect(findVisibleTarget(["#a"], true)).not.toBeUndefined();
    registry["#b"] = [el(inView, { display: "none" })];
    expect(findVisibleTarget(["#b"], true)).toBeUndefined();
  });
});

describe("compensation du zoom (html { zoom: 0.8 })", () => {
  it("lit le zoom racine et retombe à 1 sur une valeur absente ou invalide", () => {
    expect(rootZoom()).toBe(0.8);
    for (const bad of ["", "normal", "0", "-1", "NaN"]) {
      rootStyle.zoom = bad;
      expect(rootZoom(), `zoom=${JSON.stringify(bad)}`).toBe(1);
    }
    rootStyle.zoom = "1";
    expect(rootZoom()).toBe(1);
  });

  it("renvoie 1 hors navigateur (rendu serveur)", () => {
    vi.stubGlobal("document", undefined);
    expect(rootZoom()).toBe(1);
  });

  it("pose l'inverse du zoom sur le body puis le retire à la restauration", () => {
    const restore = applyInverseZoom();
    expect(Number(bodyVars.get("--agenda-tour-inverse-zoom"))).toBeCloseTo(1.25, 10);
    restore();
    expect(bodyVars.has("--agenda-tour-inverse-zoom")).toBe(false);
  });

  it("restaure la valeur précédente (visite de l'agenda déjà active) au lieu de la supprimer", () => {
    bodyVars.set("--agenda-tour-inverse-zoom", "2");
    const restore = applyInverseZoom();
    expect(bodyVars.get("--agenda-tour-inverse-zoom")).not.toBe("2");
    restore();
    expect(bodyVars.get("--agenda-tour-inverse-zoom")).toBe("2");
  });
});

describe("isDesktopNav", () => {
  it("suit le breakpoint lg (1024px)", () => {
    expect(isDesktopNav()).toBe(false);
    vi.stubGlobal("window", { ...window, matchMedia: (q: string) => ({ matches: q === "(min-width: 1024px)" }) });
    expect(isDesktopNav()).toBe(true);
  });
});

describe("waitForVisibleTarget", () => {
  const settle = async <T,>(promise: Promise<T>, frameCount: number) => {
    for (let i = 0; i < frameCount; i += 1) runFrame();
    return promise;
  };

  it("résout une fois la position stable pendant 6 images et recentre la cible une seule fois", async () => {
    const target = el(inView);
    registry["#t"] = [target];
    const controller = new AbortController();
    const promise = waitForVisibleTarget(["#t"], controller.signal);
    await expect(settle(promise, 7)).resolves.toBe(target);
    expect(target.scrolls).toBe(1);
  });

  it("n'accepte pas une cible tant que sa position bouge (animation du panneau)", async () => {
    const target = el({ ...inView, left: -200 });
    registry["#t"] = [target];
    let resolved = false;
    const promise = waitForVisibleTarget(["#t"], new AbortController().signal).then((value) => {
      resolved = true;
      return value;
    });
    for (let i = 0; i < 12; i += 1) {
      target.box = { ...(target.box as Box), left: -200 + i * 30 }; // glisse à chaque image
      runFrame();
      await Promise.resolve();
    }
    expect(resolved).toBe(false);
    target.box = { ...inView };
    await settle(promise, 8);
    expect(resolved).toBe(true);
  });

  it("rejette avec TargetUnavailableError après le délai quand aucune cible n'est visible", async () => {
    registry["#t"] = [el(drawerClosed)];
    const promise = waitForVisibleTarget(["#t"], new AbortController().signal);
    const caught = promise.catch((error: unknown) => error);
    for (let elapsed = 0; elapsed <= TARGET_TIMEOUT_MS + 100; elapsed += 100) runFrame(100);
    const error = await caught;
    expect(error).toBeInstanceOf(TargetUnavailableError);
    expect((error as Error).name).toBe("TargetUnavailableError");
  });

  it("rejette en AbortError dès que le signal est annulé", async () => {
    registry["#t"] = [el(inView)];
    const controller = new AbortController();
    const promise = waitForVisibleTarget(["#t"], controller.signal);
    const caught = promise.catch((error: unknown) => error);
    runFrame();
    controller.abort();
    runFrame();
    const error = await caught;
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("en mode page (canScroll), recentre une cible hors écran puis la résout", async () => {
    const target = el({ left: 20, top: VIEWPORT.height + 900, width: 120, height: 40 });
    target.onScroll = (node) => {
      node.box = { ...inView };
    };
    registry["#t"] = [target];
    const promise = waitForVisibleTarget(["#t"], new AbortController().signal, true);
    await expect(settle(promise, 9)).resolves.toBe(target);
    expect(target.scrolls).toBe(1);
  });

  it("en mode page, échoue si le défilement ne rend jamais la cible visible", async () => {
    registry["#t"] = [el({ left: 20, top: VIEWPORT.height + 900, width: 120, height: 40 })];
    const caught = waitForVisibleTarget(["#t"], new AbortController().signal, true).catch((e: unknown) => e);
    for (let elapsed = 0; elapsed <= TARGET_TIMEOUT_MS + 100; elapsed += 100) runFrame(100);
    expect(await caught).toBeInstanceOf(TargetUnavailableError);
  });
});

describe("normalizeAppPath", () => {
  it.each([
    ["/domains/app/services", "/services/"],
    ["/domains/app/services/", "/services/"],
    ["/domains/app/staff", "/staff/"],
    ["/domains/app", "/"],
    ["/services/", "/services/"],
    ["/agenda", "/agenda/"],
    ["/", "/"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeAppPath(input)).toBe(expected);
  });
});

describe("isModalOpen", () => {
  const withDialogs = (...nodes: FakeEl[]) => {
    registry['[role="dialog"][aria-modal]'] = nodes;
  };

  it("détecte un panneau modal de l'application affiché", () => {
    withDialogs(el(inView));
    expect(isModalOpen()).toBe(true);
  });

  it("ignore les dialogues du tutoriel lui-même (bulle driver.js, carte de bienvenue)", () => {
    withDialogs(el(inView, { closest: [".driver-popover"] }), el(inView, { closest: ["[data-rb-tutorial]"] }));
    expect(isModalOpen()).toBe(false);
  });

  it("ignore un dialogue non rendu et l'absence de dialogue", () => {
    withDialogs(el(inView, { rendered: false }));
    expect(isModalOpen()).toBe(false);
    withDialogs();
    expect(isModalOpen()).toBe(false);
  });
});
