import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/auth/google-http";

/** Corps JSON objet, borné ; null si invalide ou trop gros. */
export async function readJsonObject(request: NextRequest, maxBytes = 8 * 1024): Promise<Record<string, unknown> | null> {
  try {
    const raw = await request.text();
    if (raw.length > maxBytes) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
