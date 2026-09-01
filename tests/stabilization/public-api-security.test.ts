import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const PUBLIC_API_ROOT = path.join(process.cwd(), "src", "app", "api", "public");

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRouteFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

describe("Sécurité API — routes publiques booking", () => {
  const routes = listRouteFiles(PUBLIC_API_ROOT);

  it("n'utilisent pas requireSession (accès sans compte)", () => {
    for (const file of routes) {
      const src = fs.readFileSync(file, "utf8");
      expect(src.includes("requireSession")).toBe(false);
      expect(src.includes("requireFeatureWrite")).toBe(false);
    }
  });

  it("POST bookings rejette organizationId via validation dédiée", () => {
    const bookings = routes.find((f) => f.endsWith("bookings\\route.ts") || f.endsWith("bookings/route.ts"));
    expect(bookings).toBeDefined();
    const src = fs.readFileSync(bookings!, "utf8");
    expect(src.includes("parsePublicBookingBody")).toBe(true);
    expect(src.includes("checkRateLimit")).toBe(true);
  });

  it("résout l'organisation via slug dans le chemin", () => {
    for (const file of routes) {
      const src = fs.readFileSync(file, "utf8");
      expect(src.includes("params") || src.includes("slug")).toBe(true);
    }
  });
});
