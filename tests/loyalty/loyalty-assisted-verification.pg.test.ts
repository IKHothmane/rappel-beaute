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

/** Le Location peut être relatif (résolu sur l'origine de la requête) : on compare l'URL résolue. */
function redirectedTo(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location, SITE).toString() : null;
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
      expect(redirectedTo(reply)).toBe(`${SITE}${card.cardPath}`);
    }
    expect((await testPool.query(`SELECT 1 FROM "LoyaltyEvent" WHERE "customerId" = $1 AND type = 'VISIT'`, [card.customerId])).rowCount).toBe(0);
  });

  it("isole les sessions d'un même navigateur et refuse l'ancien token comme preuve d'identité", async () => {
    const phone = makePhone();
    const a = await activated(0, phone);
    const b = await activated(1, phone);
    const combined = `${a.cookie}; ${b.cookie}`;
    expect(redirectedTo((await scan(0, combined)))).toBe(`${SITE}${a.cardPath}`);
    expect(redirectedTo((await scan(1, combined)))).toBe(`${SITE}${b.cardPath}`);
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
    expect(redirectedTo((await scan(0, a.cookie)))).toBe(`${SITE}${a.cardPath}`);
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
    expect(redirectedTo((await scan(0, recovered.cookie)))).toBe(`${SITE}${a.cardPath}`);
    expect((await testPool.query(`SELECT phone FROM "Customer" WHERE id = $1`, [a.customerId])).rows[0].phone).toBe(replacement);
    expect((await testPool.query(`SELECT points FROM "LoyaltyEvent" WHERE "customerId" = $1 AND type = 'VISIT'`, [a.customerId])).rows).toEqual([{ points: 1 }]);
  });

  it("crée la carte directement au scan une fois le profil rempli, sans code, et la lie à l'appareil", async () => {
    const before = Number((await testPool.query(`SELECT COUNT(*)::int AS n FROM "Customer" WHERE "organizationId" = $1`, [tenants[0]])).rows[0].n);
    const phone = makePhone();
    // Profil incomplet : refusé, aucune fiche créée.
    expect((await publicJoin(post(publicPath, { action: "enroll", token: joins[0] }))).status).toBe(400);
    expect((await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "Sara", lastName: "Alami", phone: "12" }))).status).toBe(400);
    // Champs limités : 10 chiffres maximum, nom en lettres et 40 caractères maximum.
    expect((await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "Sara", lastName: "Alami", phone: "06123456789" }))).status).toBe(400);
    expect((await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "Sara1", lastName: "Alami", phone }))).status).toBe(400);
    expect((await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "Sara", lastName: "A".repeat(41), phone }))).status).toBe(400);
    expect((await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "S", lastName: "Alami", phone }))).status).toBe(400);
    const created = await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "Sara", lastName: "Alami", phone }));
    expect(created.status).toBe(201);
    const { cardPath } = await created.json();
    expect(cardPath).toMatch(/^\/carte\/RBLOY_[A-Z2-9]{8,32}\/$/);
    const cookie = cookieFrom(created, "session");
    const token = cardPath.split("/")[2] as string;

    // L'appareil retrouve sa carte au scan suivant ; un autre institut ou un autre appareil ne la voit pas.
    expect(redirectedTo(await scan(0, cookie))).toBe(`${SITE}${cardPath}`);
    expect((await scan(1, cookie)).headers.get("location")).toBeNull();
    expect((await scan(0)).headers.get("location")).toBeNull();
    // Carte à 0 passage, une seule fiche créée avec le profil saisi.
    expect((await testPool.query(`SELECT 1 FROM "LoyaltyEvent" e JOIN "LoyaltyCard" c ON c."customerId" = e."customerId" WHERE c."publicToken" = $1 AND e.type = 'VISIT'`, [token])).rowCount).toBe(0);
    const after = Number((await testPool.query(`SELECT COUNT(*)::int AS n FROM "Customer" WHERE "organizationId" = $1`, [tenants[0]])).rows[0].n);
    expect(after).toBe(before + 1);
    const customer = await testPool.query<{ phone: string; firstName: string; lastName: string }>(
      `SELECT c.phone, c."firstName", c."lastName" FROM "Customer" c JOIN "LoyaltyCard" lc ON lc."customerId" = c.id WHERE lc."publicToken" = $1`, [token]);
    expect(customer.rows[0]).toMatchObject({ phone, firstName: "Sara", lastName: "Alami" });
    // Numéro déjà connu : la carte existante est retrouvée directement (autre appareil), sans modifier la fiche ni en créer une.
    const known = await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "Autre", lastName: "Personne", phone }));
    expect(known.status).toBe(200);
    expect(await known.json()).toMatchObject({ cardPath, recovered: true });
    const otherDevice = cookieFrom(known, "session");
    expect(redirectedTo(await scan(0, otherDevice))).toBe(`${SITE}${cardPath}`);
    expect(Number((await testPool.query(`SELECT COUNT(*)::int AS n FROM "Customer" WHERE "organizationId" = $1`, [tenants[0]])).rows[0].n)).toBe(before + 1);
    // Le nom saisi remplace celui de la fiche ; le numéro reste inchangé ; l'ancien nom est conservé dans l'audit.
    expect((await testPool.query(
      `SELECT c."firstName", c."lastName", c.phone FROM "Customer" c JOIN "LoyaltyCard" lc ON lc."customerId" = c.id WHERE lc."publicToken" = $1`, [token])).rows[0])
      .toEqual({ firstName: "Autre", lastName: "Personne", phone });
    const audit = await testPool.query<{ after: { renamedFrom?: { firstName: string; lastName: string } } }>(
      `SELECT after FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'LOYALTY_CARD_RECOVERED_BY_PHONE' ORDER BY "createdAt" DESC LIMIT 1`, [tenants[0]]);
    expect(audit.rows[0].after.renamedFrom).toEqual({ firstName: "Sara", lastName: "Alami" });
    // Le même numéro dans un autre institut ne donne accès à rien : une nouvelle fiche y est créée.
    const elsewhere = await publicJoin(post(publicPath, { action: "enroll", token: joins[1], firstName: "Sara", lastName: "Alami", phone }));
    expect(elsewhere.status).toBe(201);
    expect((await elsewhere.json()).cardPath).not.toBe(cardPath);
    // Le numéro ne se change pas depuis la carte.
    expect((await updateProfile(post("/api/public/loyalty-card/profile", { token, phone: makePhone() }, cookie))).status).toBe(400);
  });

  it("carte sans informations : le scan ouvre le formulaire, qui complète la fiche sans doublon", async () => {
    // Carte créée avec un numéro provisoire (ancien parcours anonyme).
    const { enrollAnonymousFromJoinQr } = await import("@/lib/loyalty/join-qr");
    const { createLoyaltyCustomerSession, applyLoyaltySession } = await import("@/lib/loyalty/customer-session");
    const { runInScope } = await import("@/lib/db/tenant-context");
    const { anon, session } = await runInScope({ kind: "public", reason: "test" }, async () => {
      const created = await enrollAnonymousFromJoinQr(joins[0]);
      return { anon: created, session: await createLoyaltyCustomerSession(created.organizationId, created.customerId, created.phone) };
    });
    const carrier = NextResponse.json({});
    applyLoyaltySession(carrier, anon.organizationId, session);
    const cookie = cookieFrom(carrier, "session");

    const reply = await scan(0, cookie);
    expect(reply.status).toBe(200);
    expect(reply.headers.get("location")).toBeNull();
    expect(await reply.text()).toContain('name="phone"');

    const customersBefore = Number((await testPool.query(`SELECT COUNT(*)::int AS n FROM "Customer" WHERE "organizationId" = $1`, [tenants[0]])).rows[0].n);
    const phone = makePhone();
    const done = await publicJoin(post(publicPath, { action: "enroll", token: joins[0], firstName: "Nora", lastName: "Idrissi", phone, marketingWhatsappConsent: true }, cookie));
    expect(done.status).toBe(200);
    expect(await done.json()).toMatchObject({ cardPath: `/carte/${anon.cardToken}/` });
    expect(Number((await testPool.query(`SELECT COUNT(*)::int AS n FROM "Customer" WHERE "organizationId" = $1`, [tenants[0]])).rows[0].n)).toBe(customersBefore);
    expect((await testPool.query(`SELECT "firstName", phone, "marketingWhatsapp" FROM "Customer" WHERE id = $1`, [anon.customerId])).rows[0])
      .toMatchObject({ firstName: "Nora", phone, marketingWhatsapp: true });
    // Nouvelle session liée au numéro saisi ; l'ancienne (numéro provisoire) est révoquée.
    const renewed = cookieFrom(done, "session");
    expect(renewed).not.toBe(cookie);
    expect(redirectedTo(await scan(0, renewed))).toBe(`${SITE}/carte/${anon.cardToken}/`);
    expect((await scan(0, cookie)).headers.get("location")).toBeNull();
  });

  it("renvoie le lien d'avis Google de l'institut seulement pour 4 ou 5 étoiles", async () => {
    const card = await activated(0);
    const feedback = async (rating: number) => {
      const response = await submitFeedback(post("/api/public/loyalty-card/feedback", { token: card.token, rating, comment: "Super accueil" }, card.cookie));
      expect(response.status).toBe(200);
      return (await response.json()) as { ok: boolean; googleReviewUrl?: string };
    };
    const setUrl = (url: string | null) => testPool.query(
      `INSERT INTO "ReviewSettings" (id, "organizationId", "googleReviewUrl", "updatedAt") VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("organizationId") DO UPDATE SET "googleReviewUrl" = EXCLUDED."googleReviewUrl"`,
      [testId("rset"), tenants[0], url],
    );

    await setUrl("https://search.google.com/local/writereview?placeid=TEST123");
    expect((await feedback(5)).googleReviewUrl).toBe("https://search.google.com/local/writereview?placeid=TEST123");
    expect((await feedback(4)).googleReviewUrl).toContain("writereview");
    // Une note plus basse reste privée : aucun lien Google.
    for (const rating of [3, 2, 1]) expect(await feedback(rating)).toEqual({ ok: true });
    // Jamais de lien non sécurisé ni de lien vide.
    await setUrl("http://exemple.ma/avis");
    expect(await feedback(5)).toEqual({ ok: true });
    await setUrl(null);
    expect(await feedback(5)).toEqual({ ok: true });
  });

  it("refuse la création directe sur un QR inconnu ou révoqué", async () => {
    expect((await publicJoin(post(publicPath, { action: "enroll", token: "RBJOIN_INCONNU23" }))).status).toBe(404);
  });

  it("révoque explicitement la session sans modifier la carte", async () => {
    const a = await activated(0);
    const response = await staffVerification(post(staffPath, { action: "revoke", customerId: a.customerId }));
    expect(response.ok).toBe(true);
    expect((await scan(0, a.cookie)).headers.get("location")).toBeNull();
    expect((await testPool.query(`SELECT 1 FROM "LoyaltyCard" WHERE "publicToken" = $1 AND status = 'ACTIVE'`, [a.token])).rowCount).toBe(1);
  });
});
