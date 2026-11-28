import { describe, expect, it, vi } from "vitest";
import {
  SHEET_INACCESSIBLE_MESSAGE,
  SHEET_USER_AGENT,
  SheetImportError,
  buildSheetExportUrl,
  fetchGoogleSheetCsv,
  isAllowedSheetTarget,
  parseGoogleSheetUrl,
  type FetchLike,
} from "@/lib/prospects/google-sheet";

/** Identifiant inventé (forme d'un identifiant Google Sheets). Aucun appel réseau : fetch est simulé. */
const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-Test";
const REF = { id: ID, gid: "42" };
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=42`;

const csv = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { status: 200, headers: { "content-type": "text/csv; charset=utf-8", ...headers } });
const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });

async function kindOf(fetchImpl: FetchLike, options: { timeoutMs?: number; maxBytes?: number } = {}) {
  const error = await fetchGoogleSheetCsv(REF, { fetchImpl, ...options }).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(SheetImportError);
  return (error as SheetImportError).kind;
}

describe("lien Google Sheets", () => {
  it("extrait l'identifiant et un gid numérique, et reconstruit seul l'URL d'export", () => {
    expect(parseGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=42`)).toEqual({ id: ID, gid: "42" });
    expect(parseGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing&gid=7`)).toEqual({ id: ID, gid: "7" });
    expect(parseGoogleSheetUrl(`  https://docs.google.com/spreadsheets/d/${ID}  `)).toEqual({ id: ID, gid: null });
    expect(parseGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=abc`)).toEqual({ id: ID, gid: null });
    const ref = parseGoogleSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?x=https://exemple-tiers.test&gid=5#gid=9&y=z`);
    expect(buildSheetExportUrl(ref!)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=9`);
    expect(buildSheetExportUrl({ id: ID, gid: null })).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`);
  });

  it.each([
    `http://docs.google.com/spreadsheets/d/${ID}/edit`,
    `https://docs.google.com.exemple-tiers.test/spreadsheets/d/${ID}/edit`,
    `https://exemple-tiers.test/spreadsheets/d/${ID}/edit`,
    `https://docs.google.com@exemple-tiers.test/spreadsheets/d/${ID}/edit`,
    `https://user:pass@docs.google.com/spreadsheets/d/${ID}/edit`,
    `https://docs.google.com:8443/spreadsheets/d/${ID}/edit`,
    `https://drive.google.com/spreadsheets/d/${ID}/edit`,
    `https://docs.google.com/document/d/${ID}/edit`,
    `https://docs.google.com/spreadsheets/u/0/d/${ID}/edit`,
    "https://docs.google.com/spreadsheets/d/trop-court/edit",
    "https://169.254.169.254/latest/meta-data/",
    "file:///etc/passwd",
    "pas une url",
  ])("refuse %s", (url) => {
    expect(parseGoogleSheetUrl(url)).toBeNull();
  });

  it("n'admet comme cible de redirection que https sur docs.google.com ou *.googleusercontent.com", () => {
    expect(isAllowedSheetTarget(new URL("https://docs.google.com/x"))).toBe(true);
    expect(isAllowedSheetTarget(new URL("https://doc-0c-test.googleusercontent.com/x"))).toBe(true);
    for (const url of [
      "http://docs.google.com/x",
      "https://googleusercontent.com/x",
      "https://test.googleusercontent.com.exemple-tiers.test/x",
      "https://docs.google.com:444/x",
      "https://u:p@docs.google.com/x",
      "https://127.0.0.1/x",
      "https://exemple-tiers.test/x",
    ]) {
      expect(isAllowedSheetTarget(new URL(url))).toBe(false);
    }
  });
});

describe("téléchargement de la feuille (fetch simulé)", () => {
  it("appelle l'URL reconstruite sans suivre automatiquement les redirections, avec un User-Agent générique", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => csv("nom\nSalon Test A\n"));
    await expect(fetchGoogleSheetCsv(REF, { fetchImpl })).resolves.toBe("nom\nSalon Test A\n");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(EXPORT_URL);
    expect(init.redirect).toBe("manual");
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe(SHEET_USER_AGENT);
  });

  it("suit une redirection vers *.googleusercontent.com", async () => {
    const target = "https://doc-0c-test.googleusercontent.com/export/abc?e=download";
    const fetchImpl = vi.fn<FetchLike>(async (url) => (url === EXPORT_URL ? redirect(target, 307) : csv("nom\nSalon Test B\n")));
    await expect(fetchGoogleSheetCsv(REF, { fetchImpl })).resolves.toContain("Salon Test B");
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([EXPORT_URL, target]);
  });

  it.each([
    "http://docs.google.com/spreadsheets/d/x/export",
    "https://exemple-tiers.test/vol",
    "https://169.254.169.254/latest/meta-data/",
    "https://127.0.0.1:8080/interne",
    "https://googleusercontent.com/x",
    "https://a.googleusercontent.com.exemple-tiers.test/x",
    "//exemple-tiers.test/x",
  ])("ne suit jamais une redirection vers %s", async (location) => {
    const fetchImpl = vi.fn<FetchLike>(async () => redirect(location));
    expect(await kindOf(fetchImpl)).toBe("redirect_refused");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("limite les redirections à 5", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => redirect("https://docs.google.com/boucle"));
    expect(await kindOf(fetchImpl)).toBe("upstream");
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it("feuille privée : page de connexion HTML, redirection vers la connexion Google ou 401/403/404 → inaccessible", async () => {
    expect(await kindOf(async () => new Response("<!DOCTYPE html><html><body>Connexion</body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }))).toBe("inaccessible");
    expect(await kindOf(async () => csv("<!DOCTYPE html>\n<html><head></head></html>"))).toBe("inaccessible");
    expect(await kindOf(async () => redirect("https://accounts.google.com/ServiceLogin?continue=x"))).toBe("inaccessible");
    for (const status of [401, 403, 404]) expect(await kindOf(async () => new Response("", { status }))).toBe("inaccessible");
    const error = await fetchGoogleSheetCsv(REF, { fetchImpl: async () => new Response("", { status: 403 }) }).catch((e: unknown) => e);
    expect((error as Error).message).toBe(SHEET_INACCESSIBLE_MESSAGE);
  });

  it("Google indisponible, délai dépassé ou réponse trop grosse", async () => {
    expect(await kindOf(async () => new Response("", { status: 503 }))).toBe("upstream");
    expect(await kindOf(async () => {
      throw new TypeError("fetch failed");
    })).toBe("upstream");
    expect(
      await kindOf(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
        { timeoutMs: 20 },
      ),
    ).toBe("upstream");
    expect(await kindOf(async () => csv("nom\n" + "x".repeat(200)), { maxBytes: 100 })).toBe("too_large");
    expect(await kindOf(async () => csv("nom\n", { "content-length": "999999999" }))).toBe("too_large");
  });
});
