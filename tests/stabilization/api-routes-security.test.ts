import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.join(process.cwd(), "src", "app", "api");

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

describe("Sécurité API — conventions multi-tenant", () => {
  const routes = listRouteFiles(API_ROOT).filter((f) => {
    const rel = relativeRoute(f);
    if (rel.startsWith("/auth/")) return false;
    if (rel.startsWith("/public/")) return false;
    if (rel.startsWith("/admin/")) return false;
    if (rel.startsWith("/health/")) return false;
    return true;
  });

  it("chaque route métier utilise un garde auth/RBAC", () => {
    const missing: string[] = [];
    for (const file of routes) {
      const src = fs.readFileSync(file, "utf8");
      const hasGuard =
        src.includes("requireFeatureRead") ||
        src.includes("requireFeatureWrite") ||
        src.includes("requireFeatureWriteLimited") ||
        src.includes("requireSession") ||
        src.includes("requireAppSession") ||
        src.includes("resolveAnalyticsContext");
      if (!hasGuard) missing.push(relativeRoute(file));
    }
    expect(missing, `Routes sans garde : ${missing.join(", ")}`).toEqual([]);
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
      if (!src.includes("stripOrganizationId")) {
        missing.push(relativeRoute(file));
      }
    }
    expect(
      missing,
      `Routes mutantes sans stripOrganizationId : ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
