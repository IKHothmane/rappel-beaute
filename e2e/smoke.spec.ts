import { test, expect } from "@playwright/test";

test.describe("Smoke — santé & pages publiques", () => {
  test("GET /api/health répond ok", async ({ request }) => {
    const res = await request.get("/api/health/");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.database).toBe("ok");
  });

  test("page login app accessible", async ({ page }) => {
    await page.goto("/domains/app/login/");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Feature guard — STARTER stock", () => {
  test.skip(!process.env.E2E_STARTER_EMAIL, "E2E_STARTER_EMAIL non configuré");

  test("OWNER STARTER → API products 403", async ({ request }) => {
    const login = await request.post("/api/auth/login/", {
      data: {
        email: process.env.E2E_STARTER_EMAIL,
        password: process.env.E2E_STARTER_PASSWORD ?? "demo1234",
      },
    });
    expect(login.ok()).toBeTruthy();
    const products = await request.get("/api/products/");
    expect(products.status()).toBe(403);
    const body = await products.json();
    expect(body.code).toBe("FEATURE_NOT_INCLUDED");
  });
});
