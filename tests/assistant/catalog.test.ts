import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as listProducts } from "@/app/api/public/assistant/products/route";
import { GET as listPromotions } from "@/app/api/public/assistant/promotions/route";
import { GET as listServices } from "@/app/api/public/assistant/services/route";
import { ensurePreviewWidget, openWidgetSession } from "@/lib/db/assistant-session";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Catalogue public de l'assistant", () => {
  let orgId: string;
  let otherOrgId: string;
  let token: string;
  const visibleService = testId("svc");
  const secretService = testId("svc");
  const secretProduct = testId("prd");
  const visiblePromo = testId("prm");
  const privatePromo = testId("prm");
  const customerId = testId("cus");

  beforeAll(async () => {
    resetRateLimitsForTests();
    await ensurePreviewWidget();
    orgId = await getSeedOrgId();
    otherOrgId = await ensureSecondOrg();
    await testPool.query(
      `INSERT INTO "Service" (id, "organizationId", name, price, "durationMin", active, "updatedAt")
       VALUES ($1, $2, 'Soin visible widget', 250, 60, true, NOW()),
              ($3, $4, 'Soin secret autre institut', 999, 30, true, NOW())`,
      [visibleService, orgId, secretService, otherOrgId],
    );
    await testPool.query(
      `INSERT INTO "Product"
        (id, "organizationId", name, sku, "salePrice", sellable, active, "purchasePrice", "updatedAt")
       VALUES ($1, $2, 'Produit secret autre institut', $3, 80, true, true, 10, NOW())`,
      [secretProduct, otherOrgId, testId("sku")],
    );
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Privée', 'Promo', $3, NOW())`,
      [customerId, orgId, `+2127${Date.now().toString().slice(-8)}`],
    );
    await testPool.query(
      `INSERT INTO "Promotion"
        (id, "organizationId", name, code, type, status, value, "customerId", "updatedAt")
       VALUES
        ($1, $2, 'Offre publique widget', 'SECRETCODE99', 'PERCENTAGE', 'ACTIVE', 10, NULL, NOW()),
        ($3, $2, 'Offre privée cliente', NULL, 'PERCENTAGE', 'ACTIVE', 20, $4, NOW())`,
      [visiblePromo, orgId, privatePromo, customerId],
    );
    const opened = await openWidgetSession({
      publicId: "pub_preview",
      origin: "http://localhost:3000",
      ip: "203.0.113.40",
    });
    token = opened.token;
    expect(opened.organizationId).toBe(orgId);
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "Promotion" WHERE id = ANY($1::text[])`, [
      [visiblePromo, privatePromo],
    ]);
    await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
    await testPool.query(`DELETE FROM "Product" WHERE id = $1`, [secretProduct]);
    await testPool.query(`DELETE FROM "Service" WHERE id = ANY($1::text[])`, [
      [visibleService, secretService],
    ]);
  });

  function authed(path: string) {
    return new NextRequest(`http://localhost:3000${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  it("montre les services de l'institut de la session, pas ceux d'un autre", async () => {
    const res = await listServices(authed("/api/public/assistant/services/"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { services: { name: string }[] };
    const names = body.services.map((service) => service.name);
    expect(names).toContain("Soin visible widget");
    expect(names).not.toContain("Soin secret autre institut");
  });

  it("refuse un organizationId fourni par le navigateur", async () => {
    const res = await listServices(
      new NextRequest(
        `http://localhost:3000/api/public/assistant/services/?organizationId=${otherOrgId}`,
        { headers: { authorization: `Bearer ${token}` } },
      ),
    );
    expect(res.status).toBe(403);
  });

  it("n'expose pas le produit d'un autre institut", async () => {
    const res = await listProducts(authed("/api/public/assistant/products/"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { products: { name: string; purchasePrice?: number }[] };
    expect(body.products.map((product) => product.name)).not.toContain("Produit secret autre institut");
    expect(JSON.stringify(body)).not.toContain("purchasePrice");
  });

  it("montre l'offre publique et masque le code ainsi que l'offre privée", async () => {
    const res = await listPromotions(authed("/api/public/assistant/promotions/"));
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).toContain("Offre publique widget");
    expect(raw).not.toContain("Offre privée cliente");
    expect(raw).not.toContain("SECRETCODE99");
  });
});
