import type { NextRequest } from "next/server";

/**
 * IP client derrière Cloudflare → Railway → Next.js.
 *
 * On ne prend pas le premier X-Forwarded-For : le client peut le forger.
 * CF-Connecting-IP est posé par Cloudflare. L'origine ne doit pas être
 * joignable en contournant Cloudflare, sinon cet en-tête peut être imité.
 */
function firstHop(value: string | null): string | null {
  const ip = value?.split(",")[0]?.trim();
  if (!ip || ip.length > 64) return null;
  if (!/^[a-fA-F0-9:.]+$/.test(ip)) return null;
  return ip;
}

export function getClientIp(request: NextRequest | Request): string {
  const h = request.headers;
  return (
    firstHop(h.get("cf-connecting-ip")) ??
    firstHop(h.get("true-client-ip")) ??
    firstHop(h.get("x-real-ip")) ??
    "unknown"
  );
}

/** Alias historique — toutes les routes de rate limit passent par ici. */
export function clientIp(request: NextRequest | Request): string {
  return getClientIp(request);
}
