import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTutorial, patchTutorial } from "@/components/tutorial/api";

/** Client /api/onboarding/tutorial/ : toute erreur devient `null`, jamais d'exception (le tutoriel s'efface alors). */
const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const EMPTY_PROGRESS = { services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0 };
const valid = {
  tutorial: { status: "IN_PROGRESS", lastStep: "staff", version: 1 },
  progress: { services: 2, staff: 1, staffWithSchedule: 0, resources: 0, appointments: 0 },
  eligible: true,
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("getTutorial", () => {
  it("lit le contrat serveur en GET same-origin sans cache", async () => {
    fetchMock.mockResolvedValue(json(valid));
    const snap = await getTutorial();
    expect(snap).toEqual({
      tutorial: { status: "IN_PROGRESS", lastStep: "staff", version: 1 },
      progress: valid.progress,
      eligible: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/onboarding/tutorial/",
      expect.objectContaining({ method: "GET", credentials: "same-origin", cache: "no-store" }),
    );
  });

  it.each([401, 403, 404, 409, 500, 503])("renvoie null sur HTTP %i sans lever d'erreur", async (status) => {
    fetchMock.mockResolvedValue(json({ error: "x" }, status));
    await expect(getTutorial()).resolves.toBeNull();
  });

  it("renvoie null quand le réseau échoue", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(getTutorial()).resolves.toBeNull();
  });

  it("renvoie null quand la requête est annulée (AbortError)", async () => {
    fetchMock.mockRejectedValue(new DOMException("Annulé", "AbortError"));
    await expect(getTutorial(new AbortController().signal)).resolves.toBeNull();
  });

  it("renvoie null quand le corps n'est pas du JSON ou pas un objet", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 200 }));
    await expect(getTutorial()).resolves.toBeNull();
    for (const body of [null, "texte", 12, true]) {
      fetchMock.mockResolvedValue(json(body));
      await expect(getTutorial()).resolves.toBeNull();
    }
  });

  it("transmet le signal d'annulation", async () => {
    fetchMock.mockResolvedValue(json(valid));
    const { signal } = new AbortController();
    await getTutorial(signal);
    expect(fetchMock.mock.calls[0][1].signal).toBe(signal);
  });

  it("assainit un corps inattendu : compteurs invalides à 0, statut inconnu sans tutoriel, eligible strict", async () => {
    fetchMock.mockResolvedValue(
      json({
        tutorial: { status: "DONE", lastStep: 4 },
        progress: { services: -3, staff: "2", staffWithSchedule: null, resources: 2.9, appointments: 1e400 },
        eligible: "true",
      }),
    );
    expect(await getTutorial()).toEqual({
      tutorial: null,
      progress: { services: 0, staff: 0, staffWithSchedule: 0, resources: 2, appointments: 0 },
      eligible: false,
    });
  });

  it("tolère l'absence de progress et complète lastStep/version par défaut", async () => {
    fetchMock.mockResolvedValue(json({ tutorial: { status: "NOT_STARTED" }, eligible: true }));
    expect(await getTutorial()).toEqual({
      tutorial: { status: "NOT_STARTED", lastStep: null, version: 1 },
      progress: EMPTY_PROGRESS,
      eligible: true,
    });
  });
});

describe("patchTutorial", () => {
  it("envoie l'action et l'étape en JSON", async () => {
    fetchMock.mockResolvedValue(json(valid));
    await patchTutorial("step", "services");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ action: "step", step: "services" });
  });

  it("n'inclut pas `step` quand l'action n'en a pas", async () => {
    fetchMock.mockResolvedValue(json(valid));
    await patchTutorial("skip");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: "skip" });
  });

  it("409 (transition déjà avancée) et 503 (table absente) renvoient null, sans exception", async () => {
    fetchMock.mockResolvedValue(json({ code: "CONFLICT" }, 409));
    await expect(patchTutorial("complete")).resolves.toBeNull();
    fetchMock.mockResolvedValue(json({ code: "TUTORIAL_UNAVAILABLE" }, 503));
    await expect(patchTutorial("reset")).resolves.toBeNull();
  });

  it("renvoie null sur erreur réseau", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(patchTutorial("pause", "staff")).resolves.toBeNull();
  });
});
