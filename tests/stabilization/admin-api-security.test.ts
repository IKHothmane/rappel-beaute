import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ADMIN_API = path.join(process.cwd(), "src", "app", "api", "admin");

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRouteFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

describe("Sécurité API — routes admin plateforme", () => {
  const routes = listRouteFiles(ADMIN_API);

  it("utilisent requirePlatformSession", () => {
    expect(routes.length).toBeGreaterThan(0);
    for (const file of routes) {
      const src = fs.readFileSync(file, "utf8");
      expect(src.includes("requireAdmin") || src.includes("requirePlatformSession")).toBe(true);
    }
  });

  it("POST organizations rejette organizationId client", () => {
    const orgRoute = routes.find((f) => f.endsWith(`${path.sep}organizations${path.sep}route.ts`));
    expect(orgRoute).toBeDefined();
    const src = fs.readFileSync(orgRoute!, "utf8");
    expect(src.includes("organizationId")).toBe(true);
  });
});
