import { randomUUID } from "node:crypto";
import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";
import { hashPassword } from "../src/lib/auth/crypto";
import { enforceTestDatabase } from "../tests/helpers/test-database";

const tutorialEndpoint = "/api/onboarding/tutorial/";
const password = "E2e-tutorial-owner-1234";
const welcome = "Bienvenue sur Rappel Beauty !";
const resume = "Reprenons votre configuration";

async function createOwner(db: Client, organizationId: string, email: string) {
  await db.query(
    `INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, 'Institut tutoriel E2E', $1, now())`,
    [organizationId],
  );
  await db.query(
    `INSERT INTO "User" (id, "organizationId", email, "firstName", "lastName", role, "passwordHash", "emailVerifiedAt", "updatedAt")
     VALUES ($1, $2, $3, 'Nadia', 'Tutoriel', 'OWNER', $4, now(), now())`,
    [`user_${organizationId}`, organizationId, email, hashPassword(password)],
  );
  const result = await db.query(
    `INSERT INTO "Subscription" (id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
       "startedAt", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
     SELECT $1, $2, id, 'ACTIVE', 799, 'MAD', now(), now(), now() + interval '1 month', now()
     FROM "Plan" WHERE code = 'INSTITUT'`,
    [`sub_${organizationId}`, organizationId],
  );
  expect(result.rowCount, "Le forfait INSTITUT est installé dans la base de test").toBe(1);
}

async function authenticate(context: BrowserContext, baseURL: string, email: string) {
  const appUrl = new URL(baseURL);
  const headers: Record<string, string> = { origin: appUrl.origin };
  // Chaque institut fictif garde son propre compteur de connexion sur le serveur local.
  if (["127.0.0.1", "localhost", "[::1]"].includes(appUrl.hostname)) {
    const testId = email.match(/[a-f0-9]{8}-[a-f0-9]{4}/i)?.[0].replace("-", "");
    if (testId) headers["cf-connecting-ip"] = `2001:db8:${testId.slice(0, 4)}:${testId.slice(4, 8)}:${testId.slice(8)}::1`;
  }
  const response = await context.request.post("/api/auth/login/", {
    headers,
    data: { email, password },
  });
  expect(response.status(), "Connexion du propriétaire de test").toBe(200);
}

async function openDashboard(page: Page) {
  await page.goto("/dashboard/?__host=app", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard\//);
}

async function signOut(page: Page) {
  const signedOut = page.waitForResponse((response) => response.url().endsWith("/api/auth/logout/") && response.ok());
  await page.locator("header").getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await signedOut;
  await expect(page).toHaveURL(/\/(connexion|login)\//);
}

function actionSaved(page: Page, action: string) {
  return page.waitForResponse((response) =>
    response.url().endsWith(tutorialEndpoint) &&
    response.request().method() === "PATCH" &&
    response.request().postDataJSON()?.action === action && response.ok(),
  );
}

async function expectPopoverInViewport(page: Page) {
  const popover = page.locator(".driver-popover");
  await expect(popover).toBeVisible();
  await expect.poll(async () => {
    const box = await popover.boundingBox();
    const viewport = page.viewportSize();
    return Boolean(box && viewport && box.x >= 0 && box.y >= 0 &&
      box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1);
  }).toBe(true);
}

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

for (const mode of ["Bureau", "Mobile"] as const) {
  const mobile = mode === "Mobile";
  test.describe(`Tutoriel propriétaire · ${mode}`, () => {
    test.skip(!process.env.DATABASE_TEST_URL, "Utiliser le serveur isolé npm run dev:test avec DATABASE_TEST_URL.");
    const pixel = devices["Pixel 7"];
    test.use(mobile
      ? { viewport: pixel.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: pixel.deviceScaleFactor }
      : { viewport: { width: 1440, height: 900 } });

    test("créer un service, retrouver son étape après reconnexion, passer et relancer", async ({ page, context, baseURL }, testInfo) => {
      test.setTimeout(180_000);
      const testEnv: NodeJS.ProcessEnv = { ...process.env, ALLOW_REMOTE_TEST_DATABASE: undefined };
      enforceTestDatabase(testEnv);
      if (!baseURL || !testEnv.DATABASE_URL) throw new Error("Serveur et base de test dédiés requis.");

      const organizationId = `tutorial-e2e-${randomUUID()}`;
      const email = `${organizationId}@example.test`;
      const db = new Client({ connectionString: testEnv.DATABASE_URL });
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      await db.connect();

      try {
        await createOwner(db, organizationId, email);
        await authenticate(context, baseURL, email);
        await openDashboard(page);

        const dialog = page.getByRole("dialog", { name: welcome });
        await expect(dialog).toBeVisible({ timeout: 60_000 });
        if (!mobile) {
          await dialog.getByRole("button", { name: "Plus tard" }).click();
          await expect(dialog).toBeHidden();
          await signOut(page);
          await authenticate(context, baseURL, email);
          await openDashboard(page);
          await expect(dialog).toBeVisible();
        }
        await expect(dialog.getByRole("button", { name: "Commencer" })).toBeFocused();
        await dialog.getByRole("button", { name: "Commencer" }).press("Enter");

        if (!mobile) {
          await page.getByRole("button", { name: "Ouvrir Services" }).click();
        }
        await expect(page).toHaveURL(/\/services\//);
        await expect(page.getByText("Créez votre premier service", { exact: true })).toBeVisible();
        await expectPopoverInViewport(page);
        await page.locator('[data-tour="services-add"].driver-active-element').click();
        await expect(page.getByRole("dialog", { name: "Nouveau service" })).toBeVisible({ timeout: 20_000 });
        await expect(page.locator(".driver-popover")).toBeHidden();
        await page.getByPlaceholder("Choisir ou saisir un soin").fill("Soin tutoriel E2E");
        await page.getByLabel("Prix (MAD) *", { exact: true }).fill("150");
        await page.getByRole("button", { name: "30 min", exact: true }).click();
        await page.getByRole("button", { name: "Créer le service" }).click();

        await expect(page.getByText(/votre premier service est enregistré/i)).toBeVisible({ timeout: 20_000 });
        await page.getByRole("button", { name: "Étape suivante" }).click();
        await expect(page).toHaveURL(/\/staff\//);
        await expect(page.getByText("Ajoutez une employée", { exact: true })).toBeVisible();
        await expectPopoverInViewport(page);

        const paused = actionSaved(page, "pause");
        await page.keyboard.press("Escape");
        await paused;
        await expect(page.locator(".driver-popover")).toBeHidden();
        await signOut(page);
        await authenticate(context, baseURL, email);
        await openDashboard(page);

        const resumeDialog = page.getByRole("dialog", { name: resume });
        await expect(resumeDialog).toBeVisible({ timeout: 30_000 });
        await resumeDialog.getByRole("button", { name: "Reprendre" }).click();
        if (!mobile) {
          await page.getByRole("button", { name: "Ouvrir Équipe & Planning" }).click();
        }
        await expect(page).toHaveURL(/\/staff\//);
        await expect(page.getByText("Ajoutez une employée", { exact: true })).toBeVisible();
        const skipped = actionSaved(page, "skip");
        await page.getByRole("button", { name: /^Passer le tutoriel/ }).click();
        await skipped;
        await expect(page.locator(".driver-popover")).toBeHidden();

        await openDashboard(page);
        const readAfterSkip = await context.request.get(tutorialEndpoint);
        expect(readAfterSkip.status()).toBe(200);
        expect(await readAfterSkip.json()).toMatchObject({
          tutorial: { status: "SKIPPED", lastStep: "staff" }, progress: { services: 1, staff: 0, appointments: 0 },
        });
        await expect(page.getByRole("dialog", { name: /Bienvenue sur Rappel Beauty|Reprenons votre configuration/ })).toBeHidden();

        const restartFromDashboard = page.getByRole("main").getByRole("button", { name: "Revoir le tutoriel" });
        await expect(restartFromDashboard).toBeInViewport();
        const dashboardRestarted = actionSaved(page, "reset");
        if (mobile) await restartFromDashboard.tap();
        else await restartFromDashboard.press("Enter");
        expect(await (await dashboardRestarted).json()).toMatchObject({ tutorial: { status: "IN_PROGRESS" } });
        await expectPopoverInViewport(page);

        const dashboardTourSkipped = actionSaved(page, "skip");
        await page.getByRole("button", { name: /^Passer le tutoriel/ }).click();
        await dashboardTourSkipped;
        await openDashboard(page);

        if (mobile) {
          await page.getByRole("button", { name: "Nouveau rendez-vous ou encaissement" }).click();
          await page.getByRole("link", { name: "Menu complet" }).click();
          await expect(page).toHaveURL(/\/more\//);
          await page.getByRole("main").getByRole("link", { name: "Aide & Support" }).click();
          await expect(page).toHaveURL(/\/support\//);
        }
        const restarted = actionSaved(page, "reset");
        const restartScope = mobile ? page.getByRole("main") : page.getByRole("complementary");
        await restartScope.getByRole("button", { name: "Revoir le tutoriel" }).click();
        expect(await (await restarted).json()).toMatchObject({ tutorial: { status: "IN_PROGRESS" } });
        await expect(page.locator(".driver-popover")).toBeVisible();
        expect(browserErrors).toEqual([]);
      } finally {
        if (browserErrors.length) {
          await testInfo.attach("erreurs-javascript", { body: browserErrors.join("\n"), contentType: "text/plain" });
        }
        await db.query(`DELETE FROM "Organization" WHERE id = $1`, [organizationId]);
        await db.end();
      }
    });
  });
}
