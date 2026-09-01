import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.join(process.cwd(), "src");

function readFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...readFiles(p));
    else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("Audit — événements critiques référencés", () => {
  const corpus = readFiles(SRC).map((f) => fs.readFileSync(f, "utf8")).join("\n");

  const required = [
    "LOGIN",
    "LOGOUT",
    "ORGANIZATION_CREATED",
    "ORGANIZATION_SUSPENDED",
    "SUBSCRIPTION_CHANGED",
    "REPORT_EXPORTED",
    "SUPPORT_SESSION_STARTED",
    "PRICE_CHANGE",
  ];

  for (const action of required) {
    it(`action ${action} présente dans le code`, () => {
      expect(corpus.includes(action)).toBe(true);
    });
  }
});

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Audit — LOGIN écrit en DB", () => {
  it("login app crée entrée AuditLog", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const { getSeedOrgId, countRows, testPool } = await import("../helpers/db");
    const orgId = await getSeedOrgId();
    const { rows } = await testPool.query<{ email: string }>(
      `SELECT email FROM "User" WHERE "organizationId" = $1 AND role = 'OWNER' LIMIT 1`,
      [orgId],
    );

    const before = await countRows(
      "AuditLog",
      `"organizationId" = $1 AND action = 'LOGIN'`,
      [orgId],
    );

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ email: rows[0]!.email, password: "demo1234" }),
    });

    const res = await POST(req as import("next/server").NextRequest);
    expect(res.status).toBe(200);

    const after = await countRows(
      "AuditLog",
      `"organizationId" = $1 AND action = 'LOGIN'`,
      [orgId],
    );
    expect(after).toBeGreaterThan(before);
  });
});
