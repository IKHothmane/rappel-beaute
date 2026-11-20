import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/auth/google-http";

/**
 * Lit le corps en flux et s'arrête dès que `maxBytes` est dépassé (jamais le corps entier en mémoire).
 * Renvoie null si le plafond est dépassé (Content-Length annoncé ou octets réellement reçus) ou si la lecture échoue.
 */
export async function readBodyBytesCapped(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared.trim()) && Number(declared) > maxBytes) return null;
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Corps JSON objet, borné en octets pendant la lecture ; null si invalide ou trop gros. */
export async function readJsonObject(request: NextRequest, maxBytes = 8 * 1024): Promise<Record<string, unknown> | null> {
  try {
    const bytes = await readBodyBytesCapped(request, maxBytes);
    if (!bytes) return null;
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Forme d'adresse acceptée : partie locale et domaine sans espace ni caractère de contrôle ou de liste
 * (, ; < > " ( ) [ ] \ :), un seul « @ », au moins un point dans le domaine (IDN attendus en ASCII/punycode).
 */
const EMAIL_RE = /^[^\s@,;:<>"()[\]\\]+@[^\s@,;:<>"()[\]\\]+\.[^\s@,;:<>"()[\]\\]+$/;
export const EMAIL_MAX_LENGTH = 254;

/** Adresse normalisée (espaces de bord retirés, minuscules) ou null si la forme est invalide. */
export function parseEmailInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 && email.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(email) ? email : null;
}

export const stringField = (body: Record<string, unknown>, key: string): string => {
  const value = body[key];
  return typeof value === "string" ? value : "";
};

/** Réponse unique de l'inscription et du renvoi : identique que l'adresse existe, soit déjà inscrite ou inconnue. */
export const GENERIC_EMAIL_SENT = {
  ok: true,
  message: "Si cette adresse peut être utilisée, un e-mail de confirmation vient d'être envoyé. Vérifiez votre boîte de réception.",
} as const;

export const tooManyRequests = (retryAfterSec?: number) =>
  jsonNoStore({ error: "Trop de demandes. Réessayez plus tard.", code: "RATE_LIMITED" }, 429, {
    "Retry-After": String(retryAfterSec ?? 3600),
  });

export const badRequest = (error = "Requête invalide.", code?: string) => jsonNoStore({ error, ...(code ? { code } : {}) }, 400);

/** Surcharge de la file scrypt : 503 indépendant du compte visé. */
export function isAuthBusy(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "AUTH_BUSY";
}
export const authBusy = () => jsonNoStore({ error: "Service momentanément indisponible. Réessayez." }, 503, { "Retry-After": "5" });
