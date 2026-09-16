import { test, expect } from "@playwright/test";

const OWNER = { email: "nadia@institutroyal.ma", password: "demo1234" };
const PLATFORM = { email: "admin@rappelbeaute.ma", password: "demo1234" };

test.describe("Parcours commercial — seed Institut Royal", () => {
  test("OWNER login → dashboard", async ({ page }) => {
    await page.goto("/login/?__host=app", { waitUntil: "domcontentloaded" });
    const email = page.locator('input[name="email"]');
    await expect(email).toBeVisible({ timeout: 15_000 });
    await email.fill(OWNER.email);
    await page.locator('input[name="password"]').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/Institut|Dashboard|Tableau/i);
  });

  test("API métier après login OWNER", async ({ request }) => {
    const login = await request.post("/api/auth/login/", {
      data: OWNER,
    });
    expect(login.ok()).toBeTruthy();

    const customers = await request.get("/api/customers/");
    expect(customers.ok()).toBeTruthy();

    const appointments = await request.get("/api/appointments/");
    expect(appointments.ok()).toBeTruthy();

    const subscription = await request.get("/api/subscription/");
    expect(subscription.ok()).toBeTruthy();
  });

  test("Booking public institut-royal accessible", async ({ page }) => {
    await page.goto("/book/institut-royal/?__host=app", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("body")).toBeVisible();
    // Contenu métier (évite un faux positif sur une page d'erreur vide)
    await expect(page.locator("body")).toContainText(/Institut|réserver|service|Hydrafacial/i, {
      timeout: 15_000,
    });
  });

  test("Platform SUPER_ADMIN login", async ({ request }) => {
    const login = await request.post("/api/auth/platform/login/", {
      data: PLATFORM,
    });
    expect(login.ok()).toBeTruthy();

    const orgs = await request.get("/api/admin/organizations/");
    expect(orgs.ok()).toBeTruthy();
  });
});

test.describe("Plan STARTER — feature guard stock", () => {
  test.skip(!process.env.E2E_STARTER_EMAIL, "Configurer E2E_STARTER_EMAIL pour institut STARTER");

  test("403 FEATURE_NOT_INCLUDED sur /api/products/", async ({ request }) => {
    const login = await request.post("/api/auth/login/", {
      data: {
        email: process.env.E2E_STARTER_EMAIL,
        password: process.env.E2E_STARTER_PASSWORD ?? "demo1234",
      },
    });
    expect(login.ok()).toBeTruthy();
    const res = await request.get("/api/products/");
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("FEATURE_NOT_INCLUDED");
  });
});
