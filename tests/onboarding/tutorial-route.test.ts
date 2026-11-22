import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET/PATCH /api/onboarding/tutorial/ : aucune base (la couche d'état est un double). Garanties : OWNER seulement
 * (403 en PATCH, tutorial null en GET pour les autres rôles), identité et institut tirés de la session et jamais du
 * corps, action et étape validées avant toute écriture, correspondance des erreurs métier (409 / 503), aucune
 * information interne dans les réponses d'erreur.
 */
const m = vi.hoisted(() => ({
  requireAppSession: vi.fn(),
  getTutorialState: vi.fn(),
  applyTutorialAction: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/http/route-scope", () => ({ tenantRoute: <T,>(h: T) => h }));
vi.mock("@/lib/logger", () => ({ logger: m.logger }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("@/lib/auth/api-guard", async (original) => ({
  ...(await original<typeof import("@/lib/auth/api-guard")>()),
  requireAppSession: m.requireAppSession,
}));
vi.mock("@/lib/db/tutorial-state", async (original) => ({
  ...(await original<typeof import("@/lib/db/tutorial-state")>()),
  getTutorialState: m.getTutorialState,
  applyTutorialAction: m.applyTutorialAction,
}));

import { GET, PATCH } from "@/app/api/onboarding/tutorial/route";

const PROGRESS = { services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0 };
const STATE = { tutorial: { status: "IN_PROGRESS", lastStep: "services", version: 1 }, progress: PROGRESS, eligible: true };

const session = (role: string) => ({ id: "u_owner", organizationId: "org_session", role, email: "a@b.test" });
const asRole = (role: string) => m.requireAppSession.mockResolvedValue({ ok: true, session: session(role) });

const URL_ = "http://localhost:3000/api/onboarding/tutorial/";
const get = () => GET(new NextRequest(URL_));
function patch(body: unknown, headers: Record<string, string> = {}, raw = false) {
  return PATCH(
    new NextRequest(URL_, {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", ...headers },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  asRole("OWNER");
  m.getTutorialState.mockResolvedValue(STATE);
  m.applyTutorialAction.mockResolvedValue({ kind: "ok", ...STATE });
});

describe("GET /api/onboarding/tutorial/", () => {
  it("relaie l'état pour la session, sans cache, sans aucun paramètre venu de la requête", async () => {
    const res = await GET(new NextRequest(`${URL_}?organizationId=org_other&userId=u_other`));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
    expect(await res.json()).toEqual(STATE);
    expect(m.getTutorialState).toHaveBeenCalledWith({ userId: "u_owner", organizationId: "org_session", isOwner: true });
  });

  it.each(["MANAGER", "STAFF", "RECEPTIONIST"])("%s : demande la lecture non propriétaire", async (role) => {
    asRole(role);
    m.getTutorialState.mockResolvedValue({ tutorial: null, progress: PROGRESS, eligible: false });
    const res = await get();
    expect(await res.json()).toEqual({ tutorial: null, progress: PROGRESS, eligible: false });
    expect(m.getTutorialState).toHaveBeenCalledWith(expect.objectContaining({ isOwner: false }));
  });

  it("session refusée : réponse du garde, aucune lecture", async () => {
    m.requireAppSession.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) });
    expect((await get()).status).toBe(401);
    expect(m.getTutorialState).not.toHaveBeenCalled();
  });

  it("erreur interne : 500 générique, sans détail ni donnée client dans la réponse ou le journal", async () => {
    m.getTutorialState.mockRejectedValue(new Error("connexion refusée postgres://secret@host/db"));
    const res = await get();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/postgres|secret/);
    expect(JSON.stringify(m.logger.error.mock.calls)).not.toMatch(/postgres|secret|org_session|u_owner/);
  });
});

describe("PATCH /api/onboarding/tutorial/ : autorisation", () => {
  it.each(["MANAGER", "STAFF", "RECEPTIONIST"])("%s : 403, aucune écriture", async (role) => {
    asRole(role);
    const res = await patch({ action: "skip" });
    expect(res.status).toBe(403);
    expect(m.applyTutorialAction).not.toHaveBeenCalled();
  });

  it("non authentifié : réponse du garde, aucune écriture", async () => {
    m.requireAppSession.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) });
    expect((await patch({ action: "skip" })).status).toBe(401);
    expect(m.applyTutorialAction).not.toHaveBeenCalled();
  });

  it("requête inter-sites ou type de contenu non JSON : refusée avant tout accès", async () => {
    expect((await patch({ action: "skip" }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await patch({ action: "skip" }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await patch("action=skip", { "content-type": "text/plain" }, true)).status).toBe(415);
    expect(m.requireAppSession).not.toHaveBeenCalled();
    expect(m.applyTutorialAction).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/onboarding/tutorial/ : validation du corps", () => {
  it.each([
    ["action inconnue", { action: "delete" }],
    ["action absente", {}],
    ["action non textuelle", { action: 3 }],
    ["action héritée de Object", { action: "constructor" }],
    ["étape inconnue", { action: "step", step: "billing" }],
    ["étape non textuelle", { action: "step", step: { x: 1 } }],
    ["étape héritée de Object", { action: "step", step: "__proto__" }],
    ["étape requise pour step", { action: "step" }],
    ["étape invalide même pour pause", { action: "pause", step: "nope" }],
    ["étape invalide même pour skip", { action: "skip", step: "nope" }],
  ])("%s : 400 sans écriture", async (_label, body) => {
    const res = await patch(body);
    expect(res.status).toBe(400);
    expect(m.applyTutorialAction).not.toHaveBeenCalled();
  });

  it.each([
    ["tableau", "[]"],
    ["JSON invalide", "{"],
    ["texte", '"skip"'],
    ["vide", ""],
  ])("corps %s : 400", async (_l, raw) => {
    expect((await patch(raw, {}, true)).status).toBe(400);
    expect(m.applyTutorialAction).not.toHaveBeenCalled();
  });

  it("corps trop volumineux : 400", async () => {
    expect((await patch({ action: "skip", pad: "x".repeat(20_000) })).status).toBe(400);
    expect(m.applyTutorialAction).not.toHaveBeenCalled();
  });

  it.each(["welcome", "services", "staff", "planning", "resources", "agenda"])("étape autorisée : %s", async (step) => {
    expect((await patch({ action: "step", step })).status).toBe(200);
    expect(m.applyTutorialAction).toHaveBeenCalledWith({ userId: "u_owner", organizationId: "org_session", action: "step", step });
  });

  it.each(["start", "step", "pause", "skip", "complete", "reset"])("action autorisée : %s", async (action) => {
    expect((await patch({ action, step: "welcome" })).status).toBe(200);
    expect(m.applyTutorialAction).toHaveBeenCalledWith(expect.objectContaining({ action }));
  });

  it("organizationId et userId du corps sont ignorés : seule la session compte", async () => {
    const res = await patch({ action: "complete", organizationId: "org_victim", userId: "u_victim" });
    expect(res.status).toBe(200);
    expect(m.applyTutorialAction).toHaveBeenCalledTimes(1);
    expect(m.applyTutorialAction).toHaveBeenCalledWith({ userId: "u_owner", organizationId: "org_session", action: "complete", step: undefined });
  });

  it("step: null équivaut à une étape absente", async () => {
    expect((await patch({ action: "pause", step: null })).status).toBe(200);
    expect(m.applyTutorialAction).toHaveBeenCalledWith(expect.objectContaining({ action: "pause", step: undefined }));
  });
});

describe("PATCH /api/onboarding/tutorial/ : réponses", () => {
  it("succès : même forme que le GET, sans champ interne", async () => {
    const res = await patch({ action: "step", step: "services" });
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
    expect(await res.json()).toEqual(STATE);
  });

  it("transition interdite : 409 avec l'état courant", async () => {
    m.applyTutorialAction.mockResolvedValue({ kind: "invalid_transition", status: "COMPLETED" });
    const res = await patch({ action: "step", step: "staff" });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "INVALID_TRANSITION", status: "COMPLETED" });
  });

  it("table absente : 503 propre, pas de 500", async () => {
    m.applyTutorialAction.mockResolvedValue({ kind: "unavailable" });
    const res = await patch({ action: "start" });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "TUTORIAL_UNAVAILABLE" });
  });

  it("erreur interne : 500 générique sans fuite", async () => {
    m.applyTutorialAction.mockRejectedValue(new Error("duplicate key u_owner org_session"));
    const res = await patch({ action: "start" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/duplicate|u_owner|org_session/);
    expect(JSON.stringify(m.logger.error.mock.calls)).not.toMatch(/duplicate|u_owner|org_session/);
  });
});
