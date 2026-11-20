import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

/**
 * IP client derrière Cloudflare → Railway → Next.js.
 *
 * CF-Connecting-IP, True-Client-IP et X-Real-IP sont posés par l'infrastructure, mais un appelant qui joint
 * l'origine directement peut les forger. Comportement :
 *  - ORIGIN_SECRET défini : ces en-têtes ne sont crus que si la requête porte l'en-tête `x-rappel-origin` valide
 *    (preuve qu'elle vient de Cloudflare). Sinon repli sûr : dernier saut de X-Forwarded-For (ajouté par le proxy
 *    le plus proche, non forgeable par le client), à défaut "unknown".
 *  - ORIGIN_SECRET absent : l'origine n'est pas protégée et rien ne prouve la provenance ; comportement historique
 *    conservé (en-têtes crus, premier saut) pour ne pas regrouper tous les clients sous une même IP, avec un
 *    avertissement unique en production. Les limiteurs de connexion ne reposent plus sur l'IP seule (plafonds
 *    par compte et par couple IP+compte).
 *  - Développement local et tests (NODE_ENV development / test) : en-têtes crus, rien n'est exposé à Internet.
 *  - TRUST_PROXY_IP_HEADERS=false force le repli sûr ; =true force la confiance.
 */
function firstHop(value: string | null): string | null {
  const ip = value?.split(",")[0]?.trim();
  if (!ip || ip.length > 64) return null;
  if (!/^[a-fA-F0-9:.]+$/.test(ip)) return null;
  return ip;
}

function lastHop(value: string | null): string | null {
  const hops = value?.split(",") ?? [];
  const ip = hops[hops.length - 1]?.trim();
  if (!ip || ip.length > 64) return null;
  if (!/^[a-fA-F0-9:.]+$/.test(ip)) return null;
  return ip;
}

function originProofValid(headers: Headers, secret: string): boolean {
  const header = headers.get("x-rappel-origin");
  if (!header) return false;
  const left = Buffer.from(header);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

let warnedUnprotected = false;

/** true si les en-têtes d'IP posés par l'infrastructure peuvent être crus pour cette requête. */
export function proxyIpHeadersTrusted(headers: Headers): boolean {
  const override = process.env.TRUST_PROXY_IP_HEADERS?.trim().toLowerCase();
  if (override === "false") return false;
  if (override === "true") return true;
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") return true;
  const secret = process.env.ORIGIN_SECRET?.trim();
  if (secret) return originProofValid(headers, secret);
  if (process.env.NODE_ENV === "production" && !warnedUnprotected) {
    warnedUnprotected = true;
    logger.warn("ORIGIN_SECRET absent : les en-têtes d'IP client (CF-Connecting-IP…) ne sont pas authentifiés", {
      route: "http/client-ip",
    });
  }
  return true;
}

export function getClientIp(request: NextRequest | Request): string {
  const h = request.headers;
  if (proxyIpHeadersTrusted(h)) {
    return (
      firstHop(h.get("cf-connecting-ip")) ??
      firstHop(h.get("true-client-ip")) ??
      firstHop(h.get("x-real-ip")) ??
      "unknown"
    );
  }
  return lastHop(h.get("x-forwarded-for")) ?? "unknown";
}

/** Alias historique — toutes les routes de rate limit passent par ici. */
export function clientIp(request: NextRequest | Request): string {
  return getClientIp(request);
}
