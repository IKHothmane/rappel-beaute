import { test, expect } from "@playwright/test";

const OWNER = { email: "nadia@institutroyal.ma", password: "demo1234" };
const PLATFORM = { email: "admin@rappelbeaute.ma", password: "demo1234" };

test.describe("Parcours commercial — seed Institut Royal", () => {
  test("OWNER login → dashboard", async ({ page }) => {
    await page.goto("/domains/app/login/?__host=app");
    await page.fill('input[type="email"], input[name="email"]', OWNER.email);
    await page.fill('input[type="password"]', OWNER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
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
    await page.goto("/domains/app/book/institut-royal/?__host=app");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Platform SUPER_ADMIN login", async ({ request }) => {
    const login = await request.post("/api/platform/auth/login/", {
      data: PLATFORM,
    });
    expect(login.ok()).toBeTruthy();

    const orgs = await request.get("/api/platform/organizations/");
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
