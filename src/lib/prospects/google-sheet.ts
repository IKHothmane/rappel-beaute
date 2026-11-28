/**
 * Import d'une feuille Google Sheets partagée par lien.
 *
 * Anti-SSRF : seule une URL https://docs.google.com/spreadsheets/d/<ID>/… est acceptée ; seuls l'identifiant
 * et un éventuel gid numérique en sont extraits, l'URL appelée est reconstruite ici. Les redirections sont
 * suivies à la main (5 au plus), uniquement vers https sur docs.google.com ou *.googleusercontent.com.
 * Délai total 20 s, réponse bornée à 2 Mo pendant la lecture, User-Agent générique.
 * Module pur : `fetchImpl` est injectable, les tests n'appellent jamais le réseau.
 */

export const SHEET_TIMEOUT_MS = 20_000;
export const SHEET_MAX_BYTES = 2 * 1024 * 1024;
export const SHEET_MAX_REDIRECTS = 5;
export const SHEET_USER_AGENT = "rappel-beauty-prospects/1.0";
export const SHEET_INACCESSIBLE_MESSAGE =
  "Feuille inaccessible. Partagez-la en lecture à « toute personne disposant du lien », ou téléchargez-la en .xlsx et importez le fichier.";

export type SheetErrorKind = "invalid_url" | "inaccessible" | "upstream" | "redirect_refused" | "too_large";

export class SheetImportError extends Error {
  constructor(
    message: string,
    readonly kind: SheetErrorKind,
  ) {
    super(message);
    this.name = "SheetImportError";
  }
}

export type SheetRef = { id: string; gid: string | null };

const SHEET_PATH = /^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,128})(?:\/|$)/;
const GID = /^\d{1,15}$/;

/** Identifiant et gid d'un lien Google Sheets, ou null si le lien n'est pas exactement de cette forme. */
export function parseGoogleSheetUrl(raw: unknown): SheetRef | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || url.port || url.username || url.password) return null;
  const match = SHEET_PATH.exec(url.pathname);
  if (!match) return null;
  const fromHash = new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");
  const fromQuery = url.searchParams.get("gid");
  const gid = [fromHash, fromQuery].find((value) => value !== null && GID.test(value)) ?? null;
  return { id: match[1], gid };
}

/** URL d'export CSV construite ici (rien d'autre du lien fourni n'est réutilisé). */
export function buildSheetExportUrl(ref: SheetRef): string {
  const gid = ref.gid ? `&gid=${ref.gid}` : "";
  return `https://docs.google.com/spreadsheets/d/${ref.id}/export?format=csv${gid}`;
}

/** Cible de redirection admise : https, port par défaut, sans identifiants, docs.google.com ou *.googleusercontent.com. */
export function isAllowedSheetTarget(url: URL): boolean {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return host === "docs.google.com" || (host.endsWith(".googleusercontent.com") && host.length > ".googleusercontent.com".length);
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = response.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new SheetImportError("Feuille trop volumineuse (2 Mo au plus).", "too_large");
  }
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new SheetImportError("Feuille trop volumineuse (2 Mo au plus).", "too_large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

const looksLikeHtml = (text: string) => /^\s*</.test(text) && /<(?:!doctype\s+html|html|head|body)\b/i.test(text.slice(0, 2048));

/**
 * Télécharge la feuille au format CSV. Lève SheetImportError :
 * - inaccessible : feuille privée (page de connexion HTML, redirection vers la connexion Google, 401/403/404) ;
 * - redirect_refused : redirection vers une cible non admise (jamais suivie) ;
 * - upstream : Google injoignable, délai dépassé, erreur 5xx ou réponse inattendue ;
 * - too_large : plus de 2 Mo.
 */
export async function fetchGoogleSheetCsv(
  ref: SheetRef,
  options: { fetchImpl?: FetchLike; timeoutMs?: number; maxBytes?: number } = {},
): Promise<string> {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? SHEET_TIMEOUT_MS);
  try {
    let target = new URL(buildSheetExportUrl(ref));
    for (let hop = 0; ; hop += 1) {
      let response: Response;
      try {
        response = await fetchImpl(target.toString(), {
          method: "GET",
          redirect: "manual",
          headers: { "User-Agent": SHEET_USER_AGENT, Accept: "text/csv, text/plain;q=0.9, */*;q=0.1" },
          signal: controller.signal,
          cache: "no-store",
        });
      } catch {
        throw new SheetImportError(controller.signal.aborted ? "Délai Google dépassé." : "Google injoignable.", "upstream");
      }

      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel().catch(() => undefined);
        const location = response.headers.get("location");
        if (!location) throw new SheetImportError("Redirection Google sans destination.", "upstream");
        let next: URL;
        try {
          next = new URL(location, target);
        } catch {
          throw new SheetImportError("Redirection Google invalide.", "upstream");
        }
        // Feuille privée : Google renvoie vers sa page de connexion, qui n'est jamais suivie.
        if (next.protocol === "https:" && next.hostname.toLowerCase() === "accounts.google.com") {
          throw new SheetImportError(SHEET_INACCESSIBLE_MESSAGE, "inaccessible");
        }
        if (!isAllowedSheetTarget(next)) throw new SheetImportError("Redirection vers une adresse non autorisée.", "redirect_refused");
        if (hop + 1 > SHEET_MAX_REDIRECTS) throw new SheetImportError("Trop de redirections.", "upstream");
        target = next;
        continue;
      }

      if ([400, 401, 403, 404, 410].includes(response.status)) {
        await response.body?.cancel().catch(() => undefined);
        throw new SheetImportError(SHEET_INACCESSIBLE_MESSAGE, "inaccessible");
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new SheetImportError(`Google a répondu ${response.status}.`, "upstream");
      }
      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      if (contentType.includes("text/html")) {
        await response.body?.cancel().catch(() => undefined);
        throw new SheetImportError(SHEET_INACCESSIBLE_MESSAGE, "inaccessible");
      }
      let bytes: Uint8Array;
      try {
        bytes = await readCapped(response, options.maxBytes ?? SHEET_MAX_BYTES);
      } catch (error) {
        if (error instanceof SheetImportError) throw error;
        throw new SheetImportError(controller.signal.aborted ? "Délai Google dépassé." : "Lecture de la feuille interrompue.", "upstream");
      }
      const text = new TextDecoder("utf-8").decode(bytes);
      if (looksLikeHtml(text)) throw new SheetImportError(SHEET_INACCESSIBLE_MESSAGE, "inaccessible");
      return text;
    }
  } finally {
    clearTimeout(timer);
  }
}
