import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Les routes /api/cron/* sont appelées par un planificateur externe (GitHub Actions, Railway cron…)
 * avec `Authorization: Bearer <CRON_SECRET>`. Sans secret valide (16 caractères minimum), rien ne s'exécute.
 */
export function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const left = Buffer.from(token);
  const right = Buffer.from(secret);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

/** `?dryRun=1` : la route calcule ce qu'elle ferait, sans rien envoyer ni écrire. */
export function isDryRun(request: NextRequest): boolean {
  const v = request.nextUrl.searchParams.get("dryRun");
  return v === "1" || v === "true";
}
