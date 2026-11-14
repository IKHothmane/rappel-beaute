import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(".github/workflows/production.yml", "utf8");

describe("Workflow de production", () => {
  it("déploie l’instantané du commit sur Railway", () => {
    expect(source).toContain("railway up --ci --yes");
    expect(source).toContain("RAILWAY_TOKEN");
    expect(source).toContain("RAILWAY_SERVICE");
    expect(source).not.toContain("Deploy placeholder");
    expect(source).not.toContain('echo "curl');
    expect(source).not.toContain("echo \"Production deploy");
  });

  it("interroge réellement /api/health/ et exige une base joignable", () => {
    expect(source).toContain('"${base}/api/health/"');
    expect(source).toContain('grep -q \'"database":"ok"\'');
    expect(source).toContain("HEALTH_BASE_URL");
    expect(source).toMatch(/exit 1/);
  });
});
