import { NextRequest, NextResponse } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OverpassError } from "@/lib/prospects/osm";

/**
 * Routes /api/admin/prospects : gardes (origine, session plateforme, rôle), validation et contrat de réponse.
 * La base et Overpass sont simulés : aucun accès réseau ni base dans ce fichier.
 */
const h = vi.hoisted(() => ({
  auth: { kind: "ok" as "ok" | "anonymous" | "other-role" },
  list: vi.fn(),
  exportRows: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sync: vi.fn(),
  importCsv: vi.fn(),
}));

vi.mock("@/lib/auth/api-guard", () => ({
  requirePlatformSession: async () => {
    if (h.auth.kind === "anonymous") {
      return { ok: false, response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
    }
    return {
      ok: true,
      session: { id: "padm_test", firstName: "Test", lastName: "Admin", role: h.auth.kind === "ok" ? "SUPER_ADMIN" : "SUPPORT" },
    };
  },
}));
vi.mock("@/lib/http/route-scope", () => ({ platformRoute: <T,>(handler: T) => handler }));
vi.mock("@/lib/db/prospects", () => {
  class ProspectSyncBusyError extends Error {}
  class ProspectDuplicateError extends Error {}
  class ProspectNotFoundError extends Error {}
  return {
    ProspectSyncBusyError,
    ProspectDuplicateError,
    ProspectNotFoundError,
    listProspects: h.list,
    listProspectsForExport: h.exportRows,
    createManualProspect: h.create,
    updateProspectTracking: h.update,
    syncOsmProspects: h.sync,
    importCsvProspects: h.importCsv,
  };
});

import * as db from "@/lib/db/prospects";
import { GET as listGet, POST as createPost } from "@/app/api/admin/prospects/route";
import { PATCH as itemPatch } from "@/app/api/admin/prospects/[id]/route";
import { POST as syncPost } from "@/app/api/admin/prospects/sync-osm/route";
import { POST as importPost } from "@/app/api/admin/prospects/import-csv/route";
import { GET as exportGet } from "@/app/api/admin/prospects/export.csv/route";

const SAME_ORIGIN = { "content-type": "application/json", "sec-fetch-site": "same-origin", origin: "http://localhost" };

function req(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const method = init.method ?? "GET";
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: init.headers ?? (method === "GET" ? {} : SAME_ORIGIN),
    ...(init.body !== undefined ? { body: typeof init.body === "string" ? init.body : JSON.stringify(init.body) } : {}),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const ITEM = { id: "prsp_test01", name: "Salon Test A", status: "TO_CONTACT", notes: null };

beforeAll(() => {
  // Garde-fou : aucun appel réseau réel ne doit partir de ces tests.
  vi.stubGlobal("fetch", () => {
    throw new Error("réseau interdit dans les tests");
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.clearAllMocks();
  h.auth.kind = "ok";
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  h.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50, cities: [], stats: {}, lastSyncedAt: null });
  h.update.mockResolvedValue(ITEM);
  h.create.mockImplementation(async (_actor: unknown, input: object) => ({ id: "prsp_new", ...input }));
  h.importCsv.mockResolvedValue({ inserted: 1, updated: 0, unchanged: 0 });
});

describe("gardes d'accès", () => {
  it("401 sans session et 403 pour un rôle autre que SUPER_ADMIN, sur chaque route", async () => {
    for (const kind of ["anonymous", "other-role"] as const) {
      h.auth.kind = kind;
      const expected = kind === "anonymous" ? 401 : 403;
      expect((await listGet(req("/api/admin/prospects/"))).status).toBe(expected);
      expect((await exportGet(req("/api/admin/prospects/export.csv"))).status).toBe(expected);
      expect((await createPost(req("/api/admin/prospects/", { method: "POST", body: { name: "Salon Test", category: "beauty" } }))).status).toBe(expected);
      expect((await itemPatch(req("/api/admin/prospects/prsp_test01/", { method: "PATCH", body: { status: "CONTACTED" } }), ctx("prsp_test01"))).status).toBe(expected);
      expect((await syncPost(req("/api/admin/prospects/sync-osm/", { method: "POST", body: {} }))).status).toBe(expected);
      expect((await importPost(req("/api/admin/prospects/import-csv/", { method: "POST", body: { csv: "nom\nA\n" } }))).status).toBe(expected);
    }
    expect(h.list).not.toHaveBeenCalled();
    expect(h.exportRows).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
    expect(h.update).not.toHaveBeenCalled();
    expect(h.sync).not.toHaveBeenCalled();
    expect(h.importCsv).not.toHaveBeenCalled();
  });

  it("refuse les écritures inter-sites (403) et non JSON (415), avant toute lecture", async () => {
    const crossSite = { ...SAME_ORIGIN, "sec-fetch-site": "cross-site", origin: "https://exemple-tiers.test" };
    expect((await createPost(req("/api/admin/prospects/", { method: "POST", body: { name: "X", category: "beauty" }, headers: crossSite }))).status).toBe(403);
    expect((await syncPost(req("/api/admin/prospects/sync-osm/", { method: "POST", body: {}, headers: crossSite }))).status).toBe(403);
    expect((await syncPost(req("/api/admin/prospects/sync-osm/", { method: "POST", headers: { "sec-fetch-site": "same-origin" } }))).status).toBe(415);
    expect((await importPost(req("/api/admin/prospects/import-csv/", { method: "POST", body: { csv: "nom\nA" }, headers: { "content-type": "application/json" } }))).status).toBe(403);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.sync).not.toHaveBeenCalled();
    expect(h.importCsv).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/prospects", () => {
  it("valide les filtres (400) et transmet une requête bornée", async () => {
    for (const query of ["category=perruque", "status=WON", "has=fax", "sort=random", "page=0", "page=abc", `search=${"x".repeat(101)}`]) {
      expect((await listGet(req(`/api/admin/prospects/?${query}`))).status).toBe(400);
    }
    expect(h.list).not.toHaveBeenCalled();

    const res = await listGet(req("/api/admin/prospects/?search=%20Salon%20&city=Ville%20Alpha&category=barber&status=all&has=phone&page=2&pageSize=500&sort=city"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(h.list).toHaveBeenCalledWith({ search: "Salon", city: "Ville Alpha", category: "barber", has: "phone", page: 2, pageSize: 200, sort: "city" });
    expect(await res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 50, cities: [], stats: {}, lastSyncedAt: null });
  });
});

describe("POST /api/admin/prospects", () => {
  const post = (body: unknown) => createPost(req("/api/admin/prospects/", { method: "POST", body }));

  it("400 avec fieldErrors pour chaque champ invalide", async () => {
    const res = await post({ name: " ", category: "perruque", phone: "123", email: "x@", website: "javascript:alert(1)", city: 5 });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors).toEqual({
      name: expect.any(String), category: expect.any(String), phone: expect.any(String),
      email: expect.any(String), website: expect.any(String), city: expect.any(String),
    });
    expect((await post("{pas du json")).status).toBe(400);
    expect((await post({ name: "x".repeat(201), category: "beauty" })).status).toBe(400);
    expect((await post({ name: "Salon Test", category: "beauty", website: "ftp://salon-test.example" })).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("201 avec les valeurs normalisées ; 409 si le téléphone existe déjà", async () => {
    const res = await post({ name: "  Salon   Test A ", category: "hairdresser", city: "VILLE ALPHA", phone: "06 00 00 00 01", email: "Contact@Salon-Test.example", website: "www.salon-test.example" });
    expect(res.status).toBe(201);
    expect(h.create).toHaveBeenCalledWith(expect.objectContaining({ id: "padm_test" }), {
      name: "Salon Test A", category: "hairdresser", city: "Ville Alpha", address: null,
      phone: "+212600000001", email: "contact@salon-test.example", website: "https://www.salon-test.example/",
    });
    expect((await res.json()).item).toMatchObject({ id: "prsp_new", phone: "+212600000001" });

    h.create.mockRejectedValueOnce(new db.ProspectDuplicateError());
    expect((await post({ name: "Salon Test A", category: "beauty", phone: "0600000001" })).status).toBe(409);
  });
});

describe("PATCH /api/admin/prospects/[id]", () => {
  const patch = (body: unknown, id = "prsp_test01") =>
    itemPatch(req(`/api/admin/prospects/${id}/`, { method: "PATCH", body }), ctx(id));

  it("ne transmet que status et notes ; tout autre champ est refusé", async () => {
    expect((await patch({ status: "CONTACTED", name: "Autre nom" })).status).toBe(400);
    expect((await patch({ phone: "+212600000009" })).status).toBe(400);
    expect((await patch({ status: "WON" })).status).toBe(400);
    expect((await patch({ notes: 12 })).status).toBe(400);
    expect((await patch({ notes: "x".repeat(2001) })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect(h.update).not.toHaveBeenCalled();

    const res = await patch({ status: "CONTACTED", notes: "  Rappeler\r\nlundi  " });
    expect(res.status).toBe(200);
    expect(h.update).toHaveBeenCalledWith(expect.objectContaining({ id: "padm_test" }), "prsp_test01", { status: "CONTACTED", notes: "Rappeler\nlundi" });
    expect(await res.json()).toEqual({ item: ITEM });

    await patch({ notes: null });
    expect(h.update).toHaveBeenLastCalledWith(expect.anything(), "prsp_test01", { notes: null });
  });

  it("404 pour un identifiant invalide ou inconnu", async () => {
    expect((await patch({ status: "CONTACTED" }, "../../etc")).status).toBe(404);
    h.update.mockRejectedValueOnce(new db.ProspectNotFoundError());
    expect((await patch({ status: "CONTACTED" })).status).toBe(404);
  });
});

describe("POST /api/admin/prospects/sync-osm", () => {
  const sync = () => syncPost(req("/api/admin/prospects/sync-osm/", { method: "POST", body: {} }));

  it("renvoie les compteurs, 409 si une synchro tourne déjà, 502 si Overpass échoue", async () => {
    h.sync.mockResolvedValueOnce({ inserted: 3, updated: 2, unchanged: 1, total: 5, durationMs: 1234 });
    const res = await sync();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inserted: 3, updated: 2, unchanged: 1, total: 5, durationMs: 1234 });
    expect(h.sync).toHaveBeenCalledWith(expect.objectContaining({ id: "padm_test" }), expect.any(Function));

    h.sync.mockRejectedValueOnce(new db.ProspectSyncBusyError());
    expect((await sync()).status).toBe(409);
    h.sync.mockRejectedValueOnce(new OverpassError("Overpass a répondu 504.", "http", 504));
    expect((await sync()).status).toBe(502);
    h.sync.mockRejectedValueOnce(new Error("connexion perdue 10.0.0.1"));
    const failed = await sync();
    expect(failed.status).toBe(500);
    expect(JSON.stringify(await failed.json())).not.toContain("10.0.0.1");
  });
});

describe("POST /api/admin/prospects/import-csv", () => {
  const importCsv = (body: unknown) => importPost(req("/api/admin/prospects/import-csv/", { method: "POST", body }));

  it("valide le corps, la taille et la colonne nom", async () => {
    expect((await importCsv({})).status).toBe(400);
    expect((await importCsv({ csv: 12 })).status).toBe(400);
    expect((await importCsv({ csv: "ville\nVille A\n" })).status).toBe(400);
    expect((await importCsv({ csv: `nom\n${"a".repeat(2 * 1024 * 1024)}` })).status).toBe(413);
    expect(h.importCsv).not.toHaveBeenCalled();
  });

  it("écrit les lignes valides et liste les lignes ignorées", async () => {
    const res = await importCsv({ csv: "nom;telephone\nSalon Test A;0600000001\n;0600000002\nSalon Test B;0600000001\n" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      inserted: 1, updated: 0, unchanged: 0, skipped: 2,
      errors: [{ line: 3, error: "Nom manquant." }, { line: 4, error: "Doublon de la ligne 2." }],
    });
    const [, rows, report] = h.importCsv.mock.calls[0];
    expect(rows).toEqual([expect.objectContaining({ name: "Salon Test A", sourceRef: "phone:+212600000001" })]);
    expect(report).toEqual({ skipped: 2, errorCount: 2 });

    h.importCsv.mockClear();
    const none = await importCsv({ csv: "nom\n\n" });
    expect(await none.json()).toMatchObject({ inserted: 0, updated: 0, skipped: 0, errors: [] });
    expect(h.importCsv).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/prospects/export.csv", () => {
  it("renvoie un CSV UTF-8 avec BOM en pièce jointe, protégé contre les formules", async () => {
    h.exportRows.mockResolvedValueOnce([
      {
        id: "prsp_x", source: "CSV", sourceRef: "phone:+212600000001", name: "@Salon Test", category: "beauty", city: "Ville Alpha",
        address: null, latitude: null, longitude: null, phone: "+212600000001", email: null, website: null,
        status: "TO_CONTACT", notes: "=HYPERLINK(\"http://exemple.test\")", lastSyncedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const res = await exportGet(req("/api/admin/prospects/export.csv?status=TO_CONTACT&sort=updatedAt"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="prospects-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("'@Salon Test;beauty;Ville Alpha;;'+212600000001;");
    expect(text).toContain(`"'=HYPERLINK(""http://exemple.test"")"`);
    expect(h.exportRows).toHaveBeenCalledWith({ status: "TO_CONTACT", sort: "updatedAt", page: 1, pageSize: 50 });

    expect((await exportGet(req("/api/admin/prospects/export.csv?category=x"))).status).toBe(400);
  });
});
