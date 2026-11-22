import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Couche d'état du tutoriel sans base : table de transitions, séquence SQL de l'écriture (transaction, verrou de
 * ligne, annulation sur refus), non-propriétaire sans requête, table absente (42P01) tolérée.
 */
const m = vi.hoisted(() => ({ poolQuery: vi.fn(), clientQuery: vi.fn(), release: vi.fn(), connect: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ pool: { query: m.poolQuery, connect: m.connect } }));

import {
  applyTutorialAction,
  EMPTY_PROGRESS,
  getTutorialState,
  isMissingTutorialTable,
  planTransition,
  TUTORIAL_ACTIONS,
  TUTORIAL_STEPS,
  type TutorialAction,
  type TutorialStatus,
} from "@/lib/db/tutorial-state";

const OPTS = { userId: "u_1", organizationId: "org_1" };
const missing = Object.assign(new Error('relation "UserTutorialState" does not exist'), { code: "42P01" });
const progressRow = (over: Record<string, number> = {}) => ({
  rows: [{ services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0, ...over }],
});
const sqlOf = (mock: ReturnType<typeof vi.fn>) => mock.mock.calls.map((c) => String(c[0]));

describe("planTransition", () => {
  const status = (s: TutorialStatus, a: TutorialAction, step?: (typeof TUTORIAL_STEPS)[number]) => planTransition(s, "services", a, step);

  it("start : NOT_STARTED et IN_PROGRESS passent en IN_PROGRESS ; fini ou ignoré refusé", () => {
    expect(status("NOT_STARTED", "start")).toMatchObject({ status: "IN_PROGRESS", setStarted: true });
    expect(status("IN_PROGRESS", "start")).toMatchObject({ status: "IN_PROGRESS", lastStep: "services" });
    expect(status("COMPLETED", "start")).toBeNull();
    expect(status("SKIPPED", "start")).toBeNull();
  });

  it("step : exige une étape ; depuis NOT_STARTED il démarre ; jamais depuis COMPLETED / SKIPPED", () => {
    expect(status("IN_PROGRESS", "step")).toBeNull();
    expect(status("IN_PROGRESS", "step", "staff")).toMatchObject({ status: "IN_PROGRESS", lastStep: "staff" });
    expect(status("NOT_STARTED", "step", "welcome")).toMatchObject({ status: "IN_PROGRESS", lastStep: "welcome", setStarted: true });
    expect(status("COMPLETED", "step", "staff")).toBeNull();
    expect(status("SKIPPED", "step", "staff")).toBeNull();
  });

  it("pause : seulement IN_PROGRESS ; garde la dernière étape sans nouvelle étape", () => {
    expect(status("IN_PROGRESS", "pause")).toMatchObject({ status: "IN_PROGRESS", lastStep: "services" });
    expect(status("IN_PROGRESS", "pause", "agenda")).toMatchObject({ lastStep: "agenda" });
    expect(status("NOT_STARTED", "pause")).toBeNull();
    expect(status("COMPLETED", "pause")).toBeNull();
    expect(status("SKIPPED", "pause")).toBeNull();
  });

  it("skip et complete : terminaux, idempotents sur eux-mêmes, exclusifs entre eux", () => {
    expect(status("IN_PROGRESS", "skip")).toMatchObject({ status: "SKIPPED", ended: "skipped" });
    expect(status("NOT_STARTED", "skip")).toMatchObject({ status: "SKIPPED" });
    expect(status("SKIPPED", "skip")).toBe("noop");
    expect(status("COMPLETED", "skip")).toBeNull();
    expect(status("IN_PROGRESS", "complete")).toMatchObject({ status: "COMPLETED", ended: "completed" });
    expect(status("COMPLETED", "complete")).toBe("noop");
    expect(status("SKIPPED", "complete")).toBeNull();
  });

  it("reset : seule voie depuis COMPLETED / SKIPPED, remet l'étape à null et efface les dates de fin", () => {
    for (const s of ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const) {
      expect(status(s, "reset")).toEqual({ status: "IN_PROGRESS", lastStep: null, setStarted: true, clearEnds: true, ended: null });
    }
  });

  it("couvre toutes les actions déclarées", () => {
    for (const action of TUTORIAL_ACTIONS) expect(() => status("IN_PROGRESS", action, "welcome")).not.toThrow();
  });
});

describe("isMissingTutorialTable", () => {
  it("ne reconnaît que SQLSTATE 42P01", () => {
    expect(isMissingTutorialTable(missing)).toBe(true);
    expect(isMissingTutorialTable(Object.assign(new Error("x"), { code: "23505" }))).toBe(false);
    expect(isMissingTutorialTable(new Error("x"))).toBe(false);
    expect(isMissingTutorialTable(null)).toBe(false);
  });
});

describe("getTutorialState", () => {
  beforeEach(() => vi.resetAllMocks());

  it("non-propriétaire : aucune requête, jamais éligible", async () => {
    expect(await getTutorialState({ ...OPTS, isOwner: false })).toEqual({ tutorial: null, progress: EMPTY_PROGRESS, eligible: false });
    expect(m.poolQuery).not.toHaveBeenCalled();
  });

  it("l'avancement est lu en une requête filtrée par institut, avec les filtres de suppression et d'archivage", async () => {
    m.poolQuery
      .mockResolvedValueOnce(progressRow({ services: 2, staff: 1 }))
      .mockResolvedValueOnce({ rows: [{ status: "IN_PROGRESS", lastStep: "staff", version: 1 }] });
    const out = await getTutorialState({ ...OPTS, isOwner: true });
    const [sql, values] = m.poolQuery.mock.calls[0];
    expect(values).toEqual(["org_1"]);
    expect(String(sql)).toMatch(/"Service" WHERE "organizationId" = \$1 AND active/);
    expect(String(sql)).toMatch(/"Staff" WHERE "organizationId" = \$1 AND "deletedAt" IS NULL AND status <> 'ARCHIVED'/);
    expect(String(sql)).toMatch(/COUNT\(DISTINCT st\.id\)[\s\S]*ss\.active/);
    expect(String(sql)).toMatch(/"Resource" WHERE "organizationId" = \$1 AND "deletedAt" IS NULL AND active/);
    expect(String(sql)).toMatch(/"Appointment" WHERE "organizationId" = \$1 AND status <> 'CANCELLED'/);
    expect(out).toEqual({
      tutorial: { status: "IN_PROGRESS", lastStep: "staff", version: 1 },
      progress: { services: 2, staff: 1, staffWithSchedule: 0, resources: 0, appointments: 0 },
      eligible: true,
    });
  });

  it.each([
    ["COMPLETED", false],
    ["SKIPPED", false],
    ["NOT_STARTED", true],
  ])("ligne %s : renvoyée telle quelle, éligible=%s, rien n'est inséré", async (status, eligible) => {
    m.poolQuery.mockResolvedValueOnce(progressRow({ services: 3 })).mockResolvedValueOnce({ rows: [{ status, lastStep: null, version: 2 }] });
    const out = await getTutorialState({ ...OPTS, isOwner: true });
    expect(out.tutorial).toEqual({ status, lastStep: null, version: 2 });
    expect(out.eligible).toBe(eligible);
    expect(sqlOf(m.poolQuery).some((s) => /INSERT/.test(s))).toBe(false);
  });

  it.each([
    ["des services", { services: 1 }],
    ["des rendez-vous", { appointments: 1 }],
  ])("ancien compte (sans ligne, %s) : jamais de ligne ni de tutoriel", async (_l, over) => {
    m.poolQuery.mockResolvedValueOnce(progressRow(over)).mockResolvedValueOnce({ rows: [] });
    const out = await getTutorialState({ ...OPTS, isOwner: true });
    expect(out).toMatchObject({ tutorial: null, eligible: false });
    expect(sqlOf(m.poolQuery).some((s) => /INSERT/.test(s))).toBe(false);
  });

  it("institut vide sans ligne : insère NOT_STARTED (ON CONFLICT DO NOTHING) pour l'utilisateur de la session", async () => {
    m.poolQuery
      .mockResolvedValueOnce(progressRow())
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [{ status: "NOT_STARTED", lastStep: null, version: 1 }] });
    const out = await getTutorialState({ ...OPTS, isOwner: true });
    const [sql, values] = m.poolQuery.mock.calls[3];
    expect(String(sql)).toMatch(/INSERT INTO "UserTutorialState"[\s\S]*ON CONFLICT \("userId"\) DO NOTHING/);
    expect(values).toEqual(["u_1", "org_1"]);
    expect(out).toMatchObject({ tutorial: { status: "NOT_STARTED", lastStep: null, version: 1 }, eligible: true });
  });

  it("insertion concurrente perdue : relit la ligne du gagnant", async () => {
    m.poolQuery
      .mockResolvedValueOnce(progressRow())
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ status: "IN_PROGRESS", lastStep: "welcome", version: 1 }] });
    const out = await getTutorialState({ ...OPTS, isOwner: true });
    expect(out).toMatchObject({ tutorial: { status: "IN_PROGRESS", lastStep: "welcome" }, eligible: true });
  });

  it("institut ancien et vide : aucune ouverture automatique", async () => {
    m.poolQuery
      .mockResolvedValueOnce(progressRow())
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    expect(await getTutorialState({ ...OPTS, isOwner: true })).toMatchObject({ tutorial: null, eligible: false });
    expect(sqlOf(m.poolQuery).some((query) => /INSERT/.test(query))).toBe(false);
  });

  it("table absente : tutorial null, eligible false, avancement conservé, pas d'erreur", async () => {
    m.poolQuery.mockResolvedValueOnce(progressRow({ services: 4 })).mockRejectedValueOnce(missing);
    const out = await getTutorialState({ ...OPTS, isOwner: true });
    expect(out).toEqual({ tutorial: null, progress: { ...EMPTY_PROGRESS, services: 4 }, eligible: false });
  });

  it("autre erreur de base : propagée", async () => {
    m.poolQuery.mockResolvedValueOnce(progressRow()).mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "57P01" }));
    await expect(getTutorialState({ ...OPTS, isOwner: true })).rejects.toThrow("boom");
  });
});

describe("applyTutorialAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.connect.mockResolvedValue({ query: m.clientQuery, release: m.release });
    m.poolQuery.mockResolvedValue(progressRow());
  });

  const row = (status: TutorialStatus, lastStep: string | null = null) => ({ rows: [{ status, lastStep, version: 1 }] });
  const sql = () => sqlOf(m.clientQuery);

  it("transaction : BEGIN, verrou FOR UPDATE, UPDATE paramétré par la session, COMMIT, connexion rendue", async () => {
    m.clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce(row("IN_PROGRESS", "welcome")) // SELECT FOR UPDATE
      .mockResolvedValueOnce(row("IN_PROGRESS", "services")) // UPDATE
      .mockResolvedValueOnce({}); // COMMIT
    const out = await applyTutorialAction({ ...OPTS, action: "step", step: "services" });
    expect(out).toMatchObject({ kind: "ok", tutorial: { status: "IN_PROGRESS", lastStep: "services" }, eligible: true });
    expect(sql()[0]).toBe("BEGIN");
    expect(sql()[1]).toMatch(/WHERE "userId" = \$1 AND "organizationId" = \$2 FOR UPDATE/);
    expect(sql()[2]).toMatch(/UPDATE "UserTutorialState"[\s\S]*"updatedAt" = now\(\)[\s\S]*WHERE "userId" = \$1 AND "organizationId" = \$2/);
    expect(m.clientQuery.mock.calls[2][1].slice(0, 4)).toEqual(["u_1", "org_1", "IN_PROGRESS", "services"]);
    expect(sql()[3]).toBe("COMMIT");
    expect(m.release).toHaveBeenCalledTimes(1);
  });

  it("transition interdite : ROLLBACK, aucun UPDATE, état courant renvoyé", async () => {
    m.clientQuery.mockResolvedValueOnce({}).mockResolvedValueOnce(row("COMPLETED")).mockResolvedValue({});
    const out = await applyTutorialAction({ ...OPTS, action: "step", step: "staff" });
    expect(out).toEqual({ kind: "invalid_transition", status: "COMPLETED" });
    expect(sql().some((s) => /^\s*UPDATE/.test(s))).toBe(false);
    expect(sql()).toContain("ROLLBACK");
    expect(sql()).not.toContain("COMMIT");
    expect(m.release).toHaveBeenCalledTimes(1);
  });

  it("action idempotente déjà satisfaite : aucun UPDATE, COMMIT, état inchangé", async () => {
    m.clientQuery.mockResolvedValueOnce({}).mockResolvedValueOnce(row("SKIPPED", "agenda")).mockResolvedValue({});
    const out = await applyTutorialAction({ ...OPTS, action: "skip" });
    expect(out).toMatchObject({ kind: "ok", tutorial: { status: "SKIPPED", lastStep: "agenda" }, eligible: false });
    expect(sql().some((s) => /^\s*UPDATE/.test(s))).toBe(false);
  });

  it.each([0, 5])("sans ligne, ancien compte (%s services) : une action autre que « reset » ne crée rien", async (services) => {
    m.clientQuery.mockImplementation(async (text: string) => {
      if (/FOR UPDATE/.test(text)) return { rows: [] };
      if (/COUNT\(\*\)/.test(text)) return progressRow({ services });
      if (/tutorialAutoEligible/.test(text)) return { rows: [] };
      return {};
    });
    const refused = await applyTutorialAction({ ...OPTS, action: "start" });
    expect(refused).toEqual({ kind: "invalid_transition", status: null });
    expect(sql().some((s) => /INSERT/.test(s))).toBe(false);
    expect(sql()).toContain("ROLLBACK");
  });

  it("sans ligne, « reset » sur un ancien compte : insère puis relit sous verrou, sans lire la progression", async () => {
    let selects = 0;
    m.clientQuery.mockImplementation(async (text: string) => {
      if (/FOR UPDATE/.test(text)) return ++selects === 1 ? { rows: [] } : row("NOT_STARTED");
      if (/^\s*UPDATE/.test(text)) return row("IN_PROGRESS");
      return {};
    });
    const out = await applyTutorialAction({ ...OPTS, action: "reset" });
    expect(out).toMatchObject({ kind: "ok", tutorial: { status: "IN_PROGRESS", lastStep: null }, eligible: true });
    expect(sql().filter((s) => /INSERT INTO "UserTutorialState"/.test(s))).toHaveLength(1);
    expect(sql().some((s) => /COUNT\(\*\)/.test(s))).toBe(false);
    expect(sql().at(-1)).toBe("COMMIT");
  });

  it("table absente : ROLLBACK, résultat « unavailable » (le PATCH répond 503), connexion rendue", async () => {
    m.clientQuery.mockResolvedValueOnce({}).mockRejectedValueOnce(missing).mockResolvedValue({});
    const out = await applyTutorialAction({ ...OPTS, action: "start" });
    expect(out).toEqual({ kind: "unavailable" });
    expect(sql()).toContain("ROLLBACK");
    expect(m.release).toHaveBeenCalledTimes(1);
  });

  it("autre erreur : ROLLBACK puis propagation, connexion rendue", async () => {
    m.clientQuery.mockResolvedValueOnce({}).mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "40001" })).mockResolvedValue({});
    await expect(applyTutorialAction({ ...OPTS, action: "start" })).rejects.toThrow("boom");
    expect(sql()).toContain("ROLLBACK");
    expect(m.release).toHaveBeenCalledTimes(1);
  });
});
