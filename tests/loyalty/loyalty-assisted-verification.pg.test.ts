import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, type Pool } from "pg";
import { testId, testPool } from "../helpers/db";
import { appPool, prepareRoles, rolesAdminUrl } from "../db/role-pools";

const staff = vi.hoisted(() => ({ organizationId: "", role: "OWNER", authenticated: true }));
const database = vi.hoisted(() => ({ pool: null as unknown as Pool }));

vi.mock("@/lib/db/pool", () => ({ get pool() { return database.pool; } }));
vi.mock("@/lib/auth/api-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/api-guard")>();
  const { bindOrganization } = await import("@/lib/db/tenant-context");
  return {
    ...actual,
    requireFeatureWrite: async () => {
      if (!staff.authenticated) return { ok: false, response: NextResponse.json({}, { status: 401 }) };
      bindOrganization(staff.organizationId);
      return {
        ok: true,
        session: { id: "user_loyalty_verifier", organizationId: staff.organizationId, role: staff.role, firstName: "Nadia", lastName: "Test" },
      };
    },
  };
});
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/rate-limit")>(),
  consumeDimensions: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { POST as publicJoin } from "@/app/api/public/loyalty-join/route";
import { GET as staffPreview, POST as staffVerification } from "@/app/api/loyalty/verification/route";
import { GET as joinByQr } from "@/app/(marketing)/carte/rejoindre/[token]/route";
import { GET as applePass } from "@/app/api/public/loyalty-pass/[token]/apple/route";
import { GET as googlePass } from "@/app/api/public/loyalty-pass/[token]/google/route";
import { POST as submitFeedback } from "@/app/api/public/loyalty-card/feedback/route";
import { POST as updateProfile } from "@/app/api/public/loyalty-card/profile/route";

const SITE = "https://rappelbeauty.com";
const publicPath = "/api/public/loyalty-join";
const staffPath = "/api/loyalty/verification";

function post(path: string, body: unknown, cookie?: string) {
  return new NextRequest(`${SITE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: SITE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function get(path: string, cookie?: string) {
  return new NextRequest(`${SITE}${path}`, { headers: cookie ? { cookie } : {} });
}

function cookieFrom(response: NextResponse, kind: "request" | "session") {
  const cookie = response.cookies.getAll().find(({ name }) => name.startsWith(`__Host-rb-loyalty-${kind}-`));
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  return `${cookie!.name}=${cookie!.value}`;
}

function makePhone() {
  return `06${String(randomBytes(4).readUInt32BE() % 100_000_000).padStart(8, "0")}`;
}

const adminUrl = rolesAdminUrl();

describe.skipIf(!adminUrl)("Vérification en institut, session et carte permanente (PostgreSQL RLS)", () => {
  const tenants = [testId("org_lver_a"), testId("org_lver_b")];
  let admin: Client;
  let restoreEnv: (() => void) | undefined;
  const joins = ["RBJOIN_JQAA", "RBJOIN_JQBB"].map((prefix) =>
    prefix + randomBytes(4).toString("hex").toUpperCase().replace(/0/g, "A").replace(/1/g, "B"),
  );

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    database.pool = appPool(adminUrl);
    for (const [index, org] of tenants.entries()) {
      await testPool.query(`INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $1, NOW())`, [org, `Institut test ${index}`]);
      await testPool.query(`INSERT INTO "LoyaltyJoinQr" (id, "organizationId", token, status) VALUES ($1, $2, $3, 'ACTIVE')`, [
        testId("lver_qr"), org, joins[index],
      ]);
    }
  });

  afterAll(async () => {
    try {
      await testPool.query(`DELETE FROM "AuditLog" WHERE "organizationId" = ANY($1)`, [tenants]);
      await testPool.query(`DELETE FROM "Organization" WHERE id = ANY($1)`, [tenants]);
    } finally {
      await database.pool?.end();
      await admin?.end();
      restoreEnv?.();
    }
  });

  function selectInstitute(index: number) {
    staff.organizationId = tenants[index];
    staff.role = "OWNER";
    staff.authenticated = true;
  }

  function scan(index: number, cookie?: string, query = "") {
    const token = joins[index];
    return joinByQr(get(`/carte/rejoindre/${token}/${query}`, cookie), { params: { token } });
  }

  async function start(index: number, phone: string, mode: "enroll" | "recover" = "enroll", consent = false) {
    const response = await publicJoin(post(publicPath, {
      action: "request", token: joins[index], mode, firstName: "Sara", lastName: "Alami", phone, marketingWhatsappConsent: consent,
    }));
    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result).toMatchObject({ code: expect.any(String), expiresAt: expect.any(String) });
    expect(result).not.toHaveProperty("cardPath");
    return { code: result.code as string, cookie: cookieFrom(response, "request") };
  }

  function approve(code: string, extra: Record<string, unknown> = {}) {
    return staffVerification(post(staffPath, { code, identityConfirmed: true, ...extra }));
  }

  function claim(index: number, cookie?: string) {
    return publicJoin(post(publicPath, { action: "claim", token: joins[index] }, cookie));
  }

  async function activated(index: number, phone = makePhone()) {
    selectInstitute(index);
    const request = await start(index, phone);
    expect((await approve(request.code)).ok).toBe(true);
    return finish(index, request.cookie);
  }

  async function finish(index: number, requestCookie: string) {
    const [first, second] = await Promise.all([claim(index, requestCookie), claim(index, requestCookie)]);
    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    const result = first.ok ? first : second;
    expect(result.ok).toBe(true);
    const { cardPath } = await result.json();
    const token = cardPath.split("/")[2] as string;
    const { rows } = await testPool.query<{ customerId: string }>(`SELECT "customerId" FROM "LoyaltyCard" WHERE "publicToken" = $1`, [token]);
    return { cookie: cookieFrom(result, "session"), cardPath: cardPath as string, token, customerId: rows[0].customerId };
  }

  it("n'active la carte qu'après approbation et remet la session seulement au navigateur demandeur", async () => {
    selectInstitute(0);
    const phone = makePhone();
    const request = await start(0, phone, "enroll", true);
    expect((await claim(0, request.cookie)).status).toBe(409);
    expect((await claim(0)).ok).toBe(false);
    expect((await claim(1, request.cookie)).ok).toBe(false);
    expect((await testPool.query(`SELECT 1 FROM "Customer" WHERE "organizationId" = $1 AND phone = $2`, [tenants[0], phone])).rowCount).toBe(0);

    staff.authenticated = false;
    expect((await staffPreview(get(`${staffPath}?code=${request.code}`))).status).toBe(401);
    expect((await approve(request.code)).status).toBe(401);
    selectInstitute(0);
    staff.role = "STAFF";
    expect((await approve(request.code)).status).toBe(403);
    selectInstitute(1);
    expect((await approve(request.code)).ok).toBe(false);
    selectInstitute(0);
    expect((await approve(request.code, { identityConfirmed: false })).ok).toBe(false);
    expect((await staffPreview(get(`${staffPath}?code=${request.code}`))).ok).toBe(true);
    expect((await approve(request.code)).ok).toBe(true);
    expect((await claim(0)).ok).toBe(false);

    const card = await finish(0, request.cookie);
    expect((await claim(0, request.cookie)).ok).toBe(false);
    const persisted = await testPool.query(`SELECT "marketingWhatsapp" FROM "Customer" WHERE id = $1`, [card.customerId]);
    expect(persisted.rows[0].marketingWhatsapp).toBe(true);
    for (let scanCount = 0; scanCount < 2; scanCount++) {
      const reply = await scan(0, card.cookie);
      expect(reply.headers.get("location")).toBe(`${SITE}${card.cardPath}`);
    }
    expect((await testPool.query(`SELECT 1 FROM "LoyaltyEvent" WHERE "customerId" = $1 AND type = 'VISIT'`, [card.customerId])).rowCount).toBe(0);
  });

  it("isole les sessions d'un même navigateur et refuse l'ancien token comme preuve d'identité", async () => {
    const phone = makePhone();
    const a = await activated(0, phone);
    const b = await activated(1, phone);
    const combined = `${a.cookie}; ${b.cookie}`;
    expect((await scan(0, combined)).headers.get("location")).toBe(`${SITE}${a.cardPath}`);
    expect((await scan(1, combined)).headers.get("location")).toBe(`${SITE}${b.cardPath}`);
    expect((await scan(1, a.cookie)).headers.get("location")).toBeNull();
    const transplanted = `${b.cookie.split("=")[0]}=${a.cookie.split("=")[1]}`;
    expect((await scan(1, transplanted)).headers.get("location")).toBeNull();
    expect((await scan(0, `rb_join_card=${a.token}`, `?c=${a.token}`)).headers.get("location")).toBeNull();

    const params = { params: { token: a.token } };
    expect((await applePass(get(`/api/public/loyalty-pass/${a.token}/apple/`), params)).status).toBe(401);
    expect((await googlePass(get(`/api/public/loyalty-pass/${a.token}/google/`, b.cookie), params)).status).toBe(401);
    expect((await updateProfile(post("/api/public/loyalty-card/profile", { token: a.token }, b.cookie))).status).toBe(401);
    expect((await submitFeedback(post("/api/public/loyalty-card/feedback", { token: a.token, rating: 5 }))).status).toBe(401);
  });

  it("renouvelle l'inactivité sans dépasser l'échéance absolue, puis refuse la session expirée", async () => {
    const a = await activated(0);
    await testPool.query(
      `UPDATE "LoyaltyCustomerSession" SET "expiresAt" = NOW() + interval '1 day', "absoluteExpiresAt" = NOW() + interval '4 days' WHERE "customerId" = $1`,
      [a.customerId],
    );
    expect((await scan(0, a.cookie)).headers.get("location")).toBe(`${SITE}${a.cardPath}`);
    const { rows } = await testPool.query(
      `SELECT "expiresAt" = "absoluteExpiresAt" AS capped FROM "LoyaltyCustomerSession" WHERE "customerId" = $1`,
      [a.customerId],
    );
    expect(rows[0].capped).toBe(true);
    await testPool.query(`UPDATE "LoyaltyCustomerSession" SET "expiresAt" = NOW() - interval '1 second' WHERE "customerId" = $1`, [a.customerId]);
    expect((await scan(0, a.cookie)).headers.get("location")).toBeNull();
  });

  it("récupère la carte existante après contrôle et révoque l'ancien appareil après changement de numéro", async () => {
    const a = await activated(0);
    const replacement = makePhone();
    await testPool.query(
      `INSERT INTO "LoyaltyEvent" (id, "organizationId", "customerId", "loyaltyCardId", type, amount, points)
       SELECT $1, $2, $3, id, 'VISIT', 0, 1 FROM "LoyaltyCard" WHERE "publicToken" = $4`,
      [testId("lver_evt"), tenants[0], a.customerId, a.token],
    );
    const recovery = await start(0, replacement, "recover");
    expect((await approve(recovery.code)).ok).toBe(false);
    expect((await approve(recovery.code, { customerId: a.customerId })).ok).toBe(false);
    expect((await approve(recovery.code, { customerId: a.customerId, phoneChangeConfirmed: true })).ok).toBe(true);
    const recovered = await finish(0, recovery.cookie);
    expect(recovered.cardPath).toBe(a.cardPath);
    expect(recovered.customerId).toBe(a.customerId);
    expect((await scan(0, a.cookie)).headers.get("location")).toBeNull();
    expect((await scan(0, recovered.cookie)).headers.get("location")).toBe(`${SITE}${a.cardPath}`);
    expect((await testPool.query(`SELECT phone FROM "Customer" WHERE id = $1`, [a.customerId])).rows[0].phone).toBe(replacement);
    expect((await testPool.query(`SELECT points FROM "LoyaltyEvent" WHERE "customerId" = $1 AND type = 'VISIT'`, [a.customerId])).rows).toEqual([{ points: 1 }]);
  });

  it("révoque explicitement la session sans modifier la carte", async () => {
    const a = await activated(0);
    const response = await staffVerification(post(staffPath, { action: "revoke", customerId: a.customerId }));
    expect(response.ok).toBe(true);
    expect((await scan(0, a.cookie)).headers.get("location")).toBeNull();
    expect((await testPool.query(`SELECT 1 FROM "LoyaltyCard" WHERE "publicToken" = $1 AND status = 'ACTIVE'`, [a.token])).rowCount).toBe(1);
  });
});
