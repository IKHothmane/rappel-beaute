import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.join(process.cwd(), "src", "app", "api");

/** Modules exportant les gardes de session/RBAC. Un wrapper doit y déléguer. */
const GUARD_MODULES = ["@/lib/auth/api-guard", "@/lib/ai/guard"];

/** Routes authentifiées autrement qu'par session applicative (signature HMAC entrante). */
const NON_SESSION_ROUTES = ["/whatsapp/webhook/route.ts"];

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRouteFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function relativeRoute(file: string): string {
  return file.replace(API_ROOT, "").replace(/\\/g, "/");
}

/**
 * Garde valide = import d'un module de gardes + appel `require*(…)`.
 * Couvre requireSession, requireFeatureRead/Write/WriteLimited, requirePosRead/Write,
 * requireAIRead/Write… sans liste à maintenir à chaque nouveau wrapper.
 */
function hasAuthGuard(src: string): boolean {
  if (src.includes("resolveAnalyticsContext(")) return true;
  const importsGuardModule = GUARD_MODULES.some((m) => src.includes(`from "${m}"`));
  return importsGuardModule && /\brequire[A-Z]\w*\s*\(/.test(src);
}

/** sanitizeAIBody (@/lib/ai/guard) délègue à stripOrganizationId. */
function stripsOrganizationId(src: string): boolean {
  return src.includes("stripOrganizationId") || src.includes("sanitizeAIBody");
}

describe("Sécurité API — conventions multi-tenant", () => {
  const routes = listRouteFiles(API_ROOT).filter((f) => {
    const rel = relativeRoute(f);
    if (rel.startsWith("/auth/")) return false;
    if (rel.startsWith("/public/")) return false;
    if (rel.startsWith("/admin/")) return false;
    if (rel.startsWith("/health/")) return false;
    return true;
  });

  const sessionRoutes = routes.filter(
    (f) => !NON_SESSION_ROUTES.includes(relativeRoute(f)),
  );

  it("chaque route métier utilise un garde auth/RBAC", () => {
    const missing: string[] = [];
    for (const file of sessionRoutes) {
      if (!hasAuthGuard(fs.readFileSync(file, "utf8"))) {
        missing.push(relativeRoute(file));
      }
    }
    expect(missing, `Routes sans garde : ${missing.join(", ")}`).toEqual([]);
  });

  it("le webhook WhatsApp vérifie la signature HMAC de Meta", () => {
    const src = fs.readFileSync(
      path.join(API_ROOT, "whatsapp", "webhook", "route.ts"),
      "utf8",
    );
    expect(src).toContain("verifyMetaSignature");
    expect(src).toContain("verifyMetaWebhookChallenge");
  });

  it("POST/PATCH avec body JSON utilisent stripOrganizationId (sauf auth)", () => {
    const missing: string[] = [];
    for (const file of routes) {
      const src = fs.readFileSync(file, "utf8");
      const hasJsonBody = /await request\.json\(\)/.test(src);
      const hasMutating =
        src.includes("export async function POST") ||
        src.includes("export async function PATCH");
      if (!hasJsonBody || !hasMutating) continue;
      if (!stripsOrganizationId(src)) {
        missing.push(relativeRoute(file));
      }
    }
    expect(
      missing,
      `Routes mutantes sans stripOrganizationId : ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
