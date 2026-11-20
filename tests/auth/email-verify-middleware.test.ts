import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

/**
 * Chemins publics de l'inscription e-mail : le lien /verify-email/ s'ouvre SANS session (y compris depuis un autre
 * appareil) sur l'hôte public comme sur app.*, le formulaire d'institut /professionnel/?email=1 reste servi par
 * l'hôte public (celui qui porte le cookie __Host-rb_pending), et les API /api/auth/** ne sont pas redirigées.
 * Les autres espaces protégés exigent toujours une session.
 */
beforeEach(() => vi.stubEnv("ORIGIN_SECRET", ""));
afterEach(() => vi.unstubAllEnvs());

const get = (host: string, path: string) => middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }));
const rewriteTarget = (res: Response) => res.headers.get("x-middleware-rewrite");

describe("lien de vérification d'e-mail", () => {
  it.each(["rappelbeauty.com", "app.rappelbeauty.com"])("/verify-email/?token= sur %s : aucune redirection vers la connexion", async (host) => {
    const res = await get(host, "/verify-email/?token=abc&type=change");
    expect(res.headers.get("location")).toBeNull();
    expect(rewriteTarget(res)).toContain("/domains/app/verify-email/");
  });

  it("le formulaire d'institut après vérification reste une page vitrine de l'hôte public", async () => {
    const res = await get("rappelbeauty.com", "/professionnel/?email=1");
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-request-x-rappel-domain")).toBe("www");
  });

  it("les API d'authentification ne sont jamais redirigées", async () => {
    for (const path of ["/api/auth/signup/email/", "/api/auth/signup/email/verify/", "/api/auth/email/verify-change/", "/api/auth/config/"]) {
      const res = await get("rappelbeauty.com", path);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("sans régression : un espace protégé (tableau de bord, sécurité du compte) exige toujours une session", async () => {
    for (const path of ["/dashboard/", "/security/"]) {
      const res = await get("app.rappelbeauty.com", path);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location") as string).pathname).toBe("/login/");
    }
  });
});
