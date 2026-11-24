import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGuideSession, waitUntilReady } from "@/components/services/guide-core";

/**
 * Cycle de vie d'une visite guidée (verrou, événement d'état, formulaire de démonstration, indicateur « visite active »)
 * et attente bornée des données secondaires : logique pure, sans React, sans DOM ni driver.js.
 */

function harness(options: { lockFree?: boolean; withActive?: boolean } = {}) {
  const log: string[] = [];
  let locked = false;
  const lockFree = options.lockFree ?? true;
  const session = createGuideSession({
    acquire: () => {
      if (!lockFree) return false;
      locked = true;
      log.push("lock");
      return true;
    },
    release: () => {
      locked = false;
      log.push("unlock");
    },
    onDemoChange: (demo) => log.push(`demo:${demo}`),
    announce: (active) => log.push(`event:${active}`),
    onActiveChange: options.withActive === false ? undefined : (active) => log.push(`active:${active}`),
  });
  return { session, log, isLocked: () => locked };
}

describe("visite guidée : indicateur « visite active » et sortie", () => {
  it("pose l'indicateur dès la prise du verrou, avant tout chargement ni démarrage de la visite", () => {
    const { session, log } = harness();
    expect(session.begin()).toBe(true);
    expect(log).toEqual(["lock", "active:true"]);
    expect(session.active).toBe(true);
  });

  it("verrou déjà pris par une autre visite : rien n'est posé, aucune sortie à nettoyer", () => {
    const { session, log } = harness({ lockFree: false });
    expect(session.begin()).toBe(false);
    expect(session.active).toBe(false);
    session.end();
    expect(log).toEqual([]);
  });

  it("à la fin : ferme la démonstration, relâche le verrou, émet active:false, retire l'indicateur en dernier", () => {
    const { session, log, isLocked } = harness();
    session.begin();
    session.announceStart();
    session.setDemo("service-form");
    log.length = 0;
    session.end();
    expect(log).toEqual(["demo:null", "unlock", "event:false", "active:false"]);
    expect(isLocked()).toBe(false);
    expect(session.active).toBe(false);
    expect(session.demo).toBeNull();
  });

  it("sortie avant le premier affichage (annulation pendant le chargement) : formulaire fermé et indicateur retiré quand même", () => {
    const { session, log, isLocked } = harness();
    session.begin();
    session.end();
    expect(log).toEqual(["lock", "active:true", "demo:null", "unlock", "event:false", "active:false"]);
    expect(isLocked()).toBe(false);
  });

  it("onDemoChange(null) à chaque sortie, y compris sans formulaire ouvert, et jamais d'événement ni de relâchement en double", () => {
    const first = harness();
    first.session.begin();
    first.session.end();
    first.session.end();
    expect(first.log.filter((e) => e === "demo:null")).toHaveLength(1);
    expect(first.log.filter((e) => e === "unlock")).toHaveLength(1);
    expect(first.log.filter((e) => e === "event:false")).toHaveLength(1);
    expect(first.log.filter((e) => e === "active:false")).toHaveLength(1);

    // Une nouvelle visite après la sortie repart proprement.
    first.log.length = 0;
    expect(first.session.begin()).toBe(true);
    first.session.setDemo("service-form");
    first.session.end();
    expect(first.log).toEqual(["lock", "active:true", "demo:service-form", "demo:null", "unlock", "event:false", "active:false"]);
  });

  it("n'émet active:true qu'à l'annonce du démarrage, et pas pour une visite finie", () => {
    const { session, log } = harness();
    session.begin();
    expect(log).not.toContain("event:true");
    session.announceStart();
    expect(log).toContain("event:true");
    session.end();
    log.length = 0;
    session.announceStart();
    expect(log).toEqual([]);
  });

  it("ouvre le formulaire de démonstration une seule fois par valeur, le ferme en passant à une étape de page", () => {
    const { session, log } = harness();
    session.begin();
    log.length = 0;
    session.setDemo("service-form");
    session.setDemo("service-form");
    session.setDemo(null);
    session.setDemo(null);
    expect(log).toEqual(["demo:service-form", "demo:null"]);
  });

  it("n'ouvre aucun formulaire de démonstration hors visite active", () => {
    const { session, log } = harness();
    session.setDemo("service-form");
    session.begin();
    session.end();
    session.setDemo("service-form");
    expect(log.filter((e) => e === "demo:service-form")).toEqual([]);
  });

  it("l'indicateur est facultatif : une page qui ne le demande pas n'est pas affectée", () => {
    const { session, log } = harness({ withActive: false });
    expect(session.begin()).toBe(true);
    session.end();
    expect(log).toEqual(["lock", "demo:null", "unlock", "event:false"]);
  });
});

describe("visite guidée : attente bornée des données secondaires", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("répond tout de suite quand les données sont déjà chargées", async () => {
    const ready = await waitUntilReady(() => true, new AbortController().signal, 6000);
    expect(ready).toBe(true);
  });

  it("attend que les données arrivent, puis lance la visite", async () => {
    let loaded = false;
    const promise = waitUntilReady(() => loaded, new AbortController().signal, 6000);
    await vi.advanceTimersByTimeAsync(1500);
    loaded = true;
    await vi.advanceTimersByTimeAsync(200);
    await expect(promise).resolves.toBe(true);
  });

  it("ne bloque jamais : au bout du délai, rend la main (faux) pour démarrer quand même", async () => {
    const promise = waitUntilReady(() => false, new AbortController().signal, 6000);
    await vi.advanceTimersByTimeAsync(6100);
    await expect(promise).resolves.toBe(false);
  });

  it("une annulation (page quittée, visite fermée) interrompt l'attente", async () => {
    const run = new AbortController();
    const promise = waitUntilReady(() => false, run.signal, 6000);
    const settled = expect(promise).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(300);
    run.abort();
    await vi.advanceTimersByTimeAsync(200);
    await settled;
  });
});
