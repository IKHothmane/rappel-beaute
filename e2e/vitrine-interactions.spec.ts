import { test, expect } from "@playwright/test";

const CONSENT_KEY = "rb:audience-consent:v1";
test.setTimeout(120_000);

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith("aucune mesure") || testInfo.title.startsWith("accord puis"))
    return;
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, "denied");
    } catch {
      /* Non-HTTP documents. */
    }
  }, CONSENT_KEY);
});

test("contenu visible sans JavaScript et bouton démo correct", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    for (const path of ["/blog/", "/caisse/"]) {
      await page.goto(path);
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();
      expect(
        await heading.evaluate((el) => {
          for (let current: Element | null = el; current; current = current.parentElement) {
            if (getComputedStyle(current).opacity === "0") return false;
          }
          return true;
        }),
      ).toBe(true);
    }
    await page.goto("/blog/");
    await expect(
      page.getByRole("link", { name: "Demander une démo", exact: true }).first(),
    ).toHaveAttribute("href", "/demo/");
  } finally {
    await context.close();
  }
});

test("contenu animé respecte la réduction des mouvements", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/caisse/");
  const animation = await page
    .locator(".vt-enter")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
});

test("démo, sept modules et destination services", async ({ page }) => {
  await page.goto("/demo/");
  const buttons = page.locator(".dm-modules button");
  await expect(buttons).toHaveCount(7);
  for (let index = 0; index < 7; index++) {
    await buttons.nth(index).click();
    await expect(buttons.nth(index)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".dm-modules button[aria-pressed=true]")).toHaveCount(1);
  }
  await buttons.nth(2).click();
  await page.locator(".dm-detail-link").click();
  await expect(page).toHaveURL(/\/fonctionnalites\/#rdv$/, { timeout: 30_000 });
  await expect(page.locator("#rdv")).toBeVisible();
});

test("menu mobile et lien d’évitement accessibles au clavier", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".vt-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.locator("#site-mobile-nav")).toBeVisible();
  await page
    .locator("#site-mobile-nav")
    .getByRole("link", { name: "Fonctionnalités", exact: true })
    .click();
  await expect(page).toHaveURL(/\/fonctionnalites\/$/);
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("contact prépare le message sans envoyer de demande", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/") && request.method() !== "GET") writes.push(request.url());
  });
  await page.goto("/contact/?subject=demo#contact-form");
  const form = page.locator(".ct-form");
  await expect(form.locator("select")).toHaveValue("Démonstration");
  await form.getByRole("button", { name: "Préparer mon e-mail" }).click();
  await expect(form.locator(".ct-draft")).toHaveCount(0);
  await form.locator('[name="name"]').fill("Test & Institut");
  await form.locator('[name="email"]').fill("test@example.com");
  await form.locator('[name="institute"]').fill("Institut test");
  await form.locator('[name="message"]').fill("Bonjour, une démo ?\nMerci & bonne journée.");
  await form.getByRole("button", { name: "Préparer mon e-mail" }).click();
  const href = await form.locator(".ct-draft a").getAttribute("href");
  const email = new URL(href!);
  expect(email.protocol).toBe("mailto:");
  expect(email.searchParams.get("subject")).toBe("Démonstration");
  expect(email.searchParams.get("body")).toContain("Institut test");
  expect(email.searchParams.get("body")).toContain("Merci & bonne journée.");
  await form.locator('[name="message"]').fill("Autre question");
  await expect(form.locator(".ct-draft")).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("aucune mesure avant accord et refus conservé", async ({ page }) => {
  const requests: string[] = [];
  await page.route(/https:\/\/www\.(googletagmanager|google-analytics)\.com\//, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.goto("/blog/");
  await expect(page.locator(".audience-banner")).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Préférences cookies" }).click();
  await expect(page.locator(".audience-banner")).toBeVisible();
  await expect(page.locator("script[data-rb-audience]")).toHaveCount(0);
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("denied");
  await page.reload();
  await expect(page.locator(".audience-banner")).toHaveCount(0);
  expect(requests).toEqual([]);
});

test("accord puis retrait : arrêt des scripts et conservation des cookies techniques", async ({
  page,
  context,
}, testInfo) => {
  const requests: string[] = [];
  await page.route(/https:\/\/www\.(googletagmanager|google-analytics)\.com\//, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.goto("/blog/");
  await expect(page.locator(".audience-banner")).toHaveCount(0);
  await page.getByRole("button", { name: "Préférences cookies" }).click();
  await expect(page.locator(".audience-banner")).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.screenshot({ path: testInfo.outputPath(`audience-${width}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("granted");
  await page.reload();
  await expect.poll(() => requests.length).toBe(4);
  await context.addCookies([
    { name: "_ga", value: "test-audience", url: page.url() },
    { name: "_ga_audit", value: "test-root", domain: new URL(page.url()).hostname, path: "/" },
    { name: "technical-test", value: "keep", url: page.url() },
  ]);
  await page.getByRole("button", { name: "Préférences cookies" }).click();
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: "Refuser", exact: true }).click(),
  ]);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("denied");
  await expect(page.locator("script[data-rb-audience]")).toHaveCount(0);
  expect(requests).toHaveLength(4);
  const cookies = await context.cookies();
  expect(cookies.some((cookie) => cookie.name === "_ga")).toBe(false);
  expect(cookies.some((cookie) => cookie.name === "_ga_audit")).toBe(false);
  expect(cookies.some((cookie) => cookie.name === "technical-test")).toBe(true);
});
