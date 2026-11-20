import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSessionCookie } from "@/lib/auth/session";

/**
 * Retour de Google et middleware : documente POURQUOI l'URI de retour est l'hôte public (rappelbeauty.com) et
 * non app.*. Sur l'hôte public, /connexion/ et /professionnel/ sont des pages vitrine (domaine « www »,
 * accessibles sans session) ; sur app.*, le même chemin relève de l'espace institut et exige une session :
 * le message ?google_error= et le formulaire d'inscription seraient perdus.
 */
beforeEach(() => vi.stubEnv("ORIGIN_SECRET", ""));
afterEach(() => vi.unstubAllEnvs());

const get = (host: string, path: string, cookie?: string) =>
  middleware(new NextRequest(`https://${host}${path}`, { headers: { host, ...(cookie ? { cookie } : {}) } }));

const isPassThrough = (res: Response) => res.headers.get("x-middleware-next") === "1" && !res.headers.get("location");
const domainSeen = (res: Response) => res.headers.get("x-middleware-request-x-rappel-domain");

describe("hôte public : le retour de Google atteint la vitrine sans session", () => {
  it.each(["/connexion/?google_error=failed", "/connexion/?google_error=cancelled", "/professionnel/?google=1"])(
    "%s : aucune redirection, domaine www",
    async (path) => {
      const res = await get("rappelbeauty.com", path);
      expect(isPassThrough(res)).toBe(true);
      expect(domainSeen(res)).toBe("www");
    },
  );

  it("l'espace institut s'ouvre sur ce même hôte avec ?__host=app (comme la connexion e-mail)", async () => {
    const session = createSessionCookie({
      id: "u_1", email: "a@example.test", firstName: "A", lastName: "B", role: "OWNER", organizationId: "org_1",
      orgName: "I", orgSlug: "i", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION", mustChangePassword: false, sessionVersion: 0,
    } as never);
    const res = await get("rappelbeauty.com", "/dashboard/?__host=app&auth=1", `${session.name}=${session.value}`);
    expect(res.headers.get("location")).toBeNull();
    expect(domainSeen(res)).toBe("app");
  });

  it("sans session, ce même chemin d'espace renvoie vers /connexion/ de l'hôte public", async () => {
    const res = await get("rappelbeauty.com", "/dashboard/?__host=app&auth=1");
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe("/connexion/");
  });
});

describe("hôte app.* : les mêmes chemins exigent une session (raison du choix de l'hôte public)", () => {
  it.each(["/connexion/?google_error=failed", "/professionnel/?google=1"])(
    "%s sans session : redirigé vers /login/, le paramètre Google est perdu",
    async (path) => {
      const res = await get("app.rappelbeauty.com", path);
      expect(res.status).toBe(307);
      const target = new URL(res.headers.get("location") as string);
      expect(target.hostname).toBe("app.rappelbeauty.com");
      expect(target.pathname).toBe("/login/");
      expect(target.searchParams.has("google_error")).toBe(false);
      expect(target.searchParams.has("google")).toBe(false);
    },
  );
});

describe("callback Google", () => {
  it("l'API du callback n'est jamais traitée comme une page d'espace (pas de redirection vers /login/ ou /connexion/)", async () => {
    for (const host of ["rappelbeauty.com", "app.rappelbeauty.com"]) {
      const res = await get(host, "/api/auth/google/callback/?code=a&state=b");
      expect(res.headers.get("location")).toBeNull();
      expect(res.status).toBe(200);
    }
    const bare = await get("rappelbeauty.com", "/api/auth/google/callback?code=a&state=b");
    expect(bare.headers.get("x-middleware-rewrite")).toContain("code=a");
  });
});
