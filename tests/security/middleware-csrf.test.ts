import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

/**
 * Protection CSRF commune du middleware : une écriture sur /api/** envoyée par un navigateur depuis un autre site
 * (Sec-Fetch-Site: cross-site) est refusée avant la route. Les clients hors navigateur (sans en-tête), les appels
 * du même site et les routes appelées par des tiers (widget, webhooks, cron) passent.
 */
beforeEach(() => vi.stubEnv("ORIGIN_SECRET", ""));
afterEach(() => vi.unstubAllEnvs());

const HOST = "app.rappelbeauty.com";

function call(method: string, path: string, fetchSite?: string) {
  const headers: Record<string, string> = { host: HOST, "content-type": "application/json" };
  if (fetchSite !== undefined) headers["sec-fetch-site"] = fetchSite;
  return middleware(
    new NextRequest(`https://${HOST}${path}`, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : "{}",
    }),
  );
}

const passes = (res: Response) => res.headers.get("x-middleware-next") === "1" && res.status === 200;

describe("écritures inter-sites sur l'API", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("%s cross-site sur une route métier : 403 JSON", async (method) => {
    const res = await call(method, "/api/customers/", "cross-site");
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "Requête refusée : origine externe." });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("la valeur de l'en-tête est comparée sans tenir compte de la casse", async () => {
    expect((await call("POST", "/api/users/", " Cross-Site ")).status).toBe(403);
  });

  it("la réservation publique n'est pas une exception : elle est appelée par la page /book du même site", async () => {
    expect((await call("POST", "/api/public/institut-royal/bookings/", "cross-site")).status).toBe(403);
  });

  it.each(["same-origin", "same-site", "none"])("POST %s : la requête atteint la route", async (site) => {
    expect(passes(await call("POST", "/api/customers/", site))).toBe(true);
  });

  it("POST sans Sec-Fetch-Site (client hors navigateur) : la requête atteint la route", async () => {
    expect(passes(await call("POST", "/api/customers/"))).toBe(true);
  });

  it.each(["GET", "HEAD", "OPTIONS"])("%s cross-site : lecture non bloquée", async (method) => {
    expect(passes(await call(method, "/api/customers/", "cross-site"))).toBe(true);
  });

  it("une page (hors /api) n'est pas concernée", async () => {
    const res = await call("POST", "/connexion/", "cross-site");
    expect(res.status).not.toBe(403);
  });
});

describe("routes appelées par des tiers : exclues", () => {
  it.each([
    "/api/public/assistant/session/",
    "/api/public/assistant/messages/",
    "/api/public/assistant/appointments/confirm/",
    "/api/whatsapp/webhook/",
    "/api/whatsapp/webhook",
    "/api/monitoring/telegram/",
    "/api/cron/appointment-reminders/",
    "/api/apple-wallet/v1/log",
  ])("POST cross-site %s : la requête atteint la route", async (path) => {
    expect(passes(await call("POST", path, "cross-site"))).toBe(true);
  });

  it.each(["/api/public/assistantx/session/", "/api/cronjobs/", "/api/whatsapp/send/", "/api/whatsapp/webhooks-test/"])(
    "un préfixe voisin %s n'hérite pas de l'exception",
    async (path) => {
      expect((await call("POST", path, "cross-site")).status).toBe(403);
    },
  );
});
