import { randomBytes, randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { Client } from "pg";
import { hashPassword } from "../src/lib/auth/crypto";
import { enforceTestDatabase } from "../tests/helpers/test-database";

/**
 * Tutoriel interactif de première connexion, parcours d'interface.
 *
 * - /api/onboarding/tutorial/ est TOUJOURS simulé (context.route) : aucun état de tutoriel n'est écrit, quelle que
 *   soit la base. Seuls la connexion et la déconnexion touchent le serveur de test (sessions).
 * - Comptes : (1) DATABASE_TEST_URL défini -> un institut jetable (propriétaire + gérant) est créé dans la base de
 *   test puis supprimé ; (2) sinon E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD (et E2E_NON_OWNER_EMAIL / _PASSWORD pour le
 *   parcours non-propriétaire) désignent des comptes d'un environnement de test dédié ; (3) sinon tout est ignoré.
 * - Jamais sur localhost:3000 hors CI (peut être branché sur la vraie base) : utiliser `npm run dev:test` (3100) ou
 *   définir E2E_ISOLATED=1 pour attester qu'un serveur est isolé. La production est déjà refusée par playwright.config.
 * - Le parcours « création réelle d'un service » reste couvert par e2e/onboarding-tutorial.spec.ts (base de test).
 */

const ENDPOINT = "/api/onboarding/tutorial/";
const WELCOME = "Bienvenue sur Rappel Beauty !";
const RESUME = "Reprenons votre configuration";

const seeded = Boolean(process.env.DATABASE_TEST_URL?.trim());
const fromEnv = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD);

// ---------------------------------------------------------------------------------------------------------------------
// Simulation de l'API du tutoriel (état en mémoire, partagé entre les connexions d'un même test)
// ---------------------------------------------------------------------------------------------------------------------

type Status = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
type Progress = { services: number; staff: number; staffWithSchedule: number; resources: number; appointments: number };
type Write = { action: string; step?: string };

class TutorialMock {
  status: Status = "NOT_STARTED";
  lastStep: string | null = null;
  eligible = true;
  progress: Progress = { services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0 };
  reads = 0;
  writes: Write[] = [];

  snapshot() {
    return { tutorial: { status: this.status, lastStep: this.lastStep, version: 1 }, progress: this.progress, eligible: this.eligible };
  }

  handle = async (route: Route) => {
    const request = route.request();
    if (request.method() === "GET") {
      this.reads += 1;
    } else if (request.method() === "PATCH") {
      const body = request.postDataJSON() as Write;
      this.writes.push(body);
      switch (body.action) {
        case "start": this.status = "IN_PROGRESS"; break;
        case "step": this.lastStep = body.step ?? this.lastStep; break;
        case "pause": this.status = "IN_PROGRESS"; this.lastStep = body.step ?? this.lastStep; break;
        case "skip": this.status = "SKIPPED"; break;
        case "complete": this.status = "COMPLETED"; break;
        case "reset": this.status = "IN_PROGRESS"; this.lastStep = null; break;
      }
    } else {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(this.snapshot()) });
  };

  actions() {
    return this.writes.map((write) => write.action);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Comptes de test
// ---------------------------------------------------------------------------------------------------------------------

type Accounts = {
  owner: { email: string; password: string };
  nonOwner?: { email: string; password: string };
  cleanup: () => Promise<void>;
};

async function seedAccounts(): Promise<Accounts> {
  const env: NodeJS.ProcessEnv = { ...process.env, ALLOW_REMOTE_TEST_DATABASE: undefined };
  enforceTestDatabase(env); // refuse la production et tout hôte non local
  if (!env.DATABASE_URL) throw new Error("Base de test requise (DATABASE_TEST_URL).");
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  const orgId = `tutorial-spec-${randomUUID()}`;
  const password = `Qa9!${randomBytes(18).toString("hex")}`;
  try {
    await db.query(`INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, 'Institut tutoriel spec', $1, now())`, [orgId]);
    const user = (suffix: string, role: string, first: string) =>
      db.query(
        `INSERT INTO "User" (id, "organizationId", email, "firstName", "lastName", role, "passwordHash", "emailVerifiedAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'Spec', $5::"UserRole", $6, now(), now())`,
        [`user_${suffix}_${orgId}`, orgId, `${suffix}-${orgId}@example.test`, first, role, hashPassword(password)],
      );
    await user("owner", "OWNER", "Nadia");
    await user("manager", "MANAGER", "Karim");
    const plan = await db.query(
      `INSERT INTO "Subscription" (id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
         "startedAt", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
       SELECT $1, $2, id, 'ACTIVE', 799, 'MAD', now(), now(), now() + interval '1 month', now()
       FROM "Plan" WHERE code = 'INSTITUT'`,
      [`sub_${orgId}`, orgId],
    );
    expect(plan.rowCount, "forfait INSTITUT installé dans la base de test").toBe(1);
  } catch (error) {
    await db.query(`DELETE FROM "Organization" WHERE id = $1`, [orgId]).catch(() => undefined);
    await db.end();
    throw error;
  }
  return {
    owner: { email: `owner-${orgId}@example.test`, password },
    nonOwner: { email: `manager-${orgId}@example.test`, password },
    cleanup: async () => {
      try {
        await db.query(`DELETE FROM "Organization" WHERE id = $1`, [orgId]);
      } finally {
        await db.end();
      }
    },
  };
}

function envAccounts(): Accounts {
  return {
    owner: { email: process.env.E2E_OWNER_EMAIL!, password: process.env.E2E_OWNER_PASSWORD! },
    nonOwner:
      process.env.E2E_NON_OWNER_EMAIL && process.env.E2E_NON_OWNER_PASSWORD
        ? { email: process.env.E2E_NON_OWNER_EMAIL, password: process.env.E2E_NON_OWNER_PASSWORD }
        : undefined,
    cleanup: async () => undefined,
  };
}

/** Refuse un serveur local de développement (port 3000) susceptible d'être branché sur la vraie base. */
function isolatedTarget(baseURL: string | undefined): boolean {
  if (!baseURL) return false;
  const url = new URL(baseURL);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (process.env.CI || process.env.E2E_ISOLATED === "1") return true;
  return !(local && (url.port === "3000" || url.port === ""));
}

async function login(context: BrowserContext, baseURL: string, account: { email: string; password: string }) {
  const origin = new URL(baseURL);
  const headers: Record<string, string> = { origin: origin.origin };
  // Compteur anti-force-brute par institut fictif sur le serveur local.
  if (seeded && ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
    const id = account.email.match(/[a-f0-9]{8}-[a-f0-9]{4}/i)?.[0].replace("-", "");
    if (id) headers["cf-connecting-ip"] = `2001:db8:${id.slice(0, 4)}:${id.slice(4, 8)}:${id.slice(8)}::1`;
  }
  const response = await context.request.post("/api/auth/login/", { headers, data: account });
  expect(response.status(), "connexion du compte de test").toBe(200);
}

// ---------------------------------------------------------------------------------------------------------------------
// Aides de page
// ---------------------------------------------------------------------------------------------------------------------

/** Ouvre le tableau de bord et attend la lecture du tutoriel (l'hôte ne se monte que pour le propriétaire). */
async function openDashboard(page: Page, { expectRead = true } = {}) {
  const read = expectRead
    ? page.waitForResponse((r) => r.url().endsWith(ENDPOINT) && r.request().method() === "GET", { timeout: 30_000 })
    : Promise.resolve(null);
  await page.goto("/dashboard/?__host=app", { waitUntil: "domcontentloaded" });
  if (expectRead) await expect(page).toHaveURL(/\/dashboard\//);
  await read;
}

async function signOut(page: Page) {
  const done = page.waitForResponse((r) => r.url().endsWith("/api/auth/logout/") && r.ok());
  await page.locator("header").getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await done;
  await expect(page).toHaveURL(/\/(connexion|login)\//);
}

/** Chaque action n'est émise qu'une fois par test : sa présence dans le journal suffit (pas de course avec le clic). */
function saved(mock: TutorialMock, action: string) {
  return expect.poll(() => mock.actions().includes(action), { message: `PATCH ${action} émis`, timeout: 15_000 }).toBe(true);
}

async function expectPopoverInViewport(page: Page) {
  const popover = page.locator(".driver-popover");
  await expect(popover).toBeVisible();
  await expect
    .poll(async () => {
      const box = await popover.boundingBox();
      const viewport = page.viewportSize();
      return Boolean(
        box && viewport && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1,
      );
    })
    .toBe(true);
}

/** Bureau : la bulle pointe d'abord le menu (« Ouvrez … ») ; mobile : navigation directe vers la page. */
async function reachStep(page: Page, mobile: boolean, nav: { label: string; route: RegExp }, title: string) {
  if (!mobile) await page.getByRole("button", { name: `Ouvrir ${nav.label}` }).click();
  await expect(page).toHaveURL(nav.route);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expectPopoverInViewport(page);
}

const SERVICES = { label: "Services", route: /\/services\// };
const STAFF = { label: "Équipe & Planning", route: /\/staff\// };

// ---------------------------------------------------------------------------------------------------------------------
// Parcours
// ---------------------------------------------------------------------------------------------------------------------

for (const viewport of [
  { name: "Bureau 1280", mobile: false, size: { width: 1280, height: 800 } },
  { name: "Mobile 390", mobile: true, size: { width: 390, height: 844 } },
] as const) {
  test.describe(`Tutoriel de première connexion · ${viewport.name}`, () => {
    test.skip(!seeded && !fromEnv, "DATABASE_TEST_URL (serveur dev:test) ou E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD requis.");
    test.use(
      viewport.mobile
        ? { viewport: viewport.size, isMobile: true, hasTouch: true }
        : { viewport: viewport.size },
    );

    let accounts: Accounts | undefined;
    let mock: TutorialMock;
    let pageErrors: string[] = [];
    let consoleErrors: string[] = [];

    test.beforeEach(async ({ page, context, baseURL }) => {
      test.skip(!isolatedTarget(baseURL), "Serveur local :3000 possiblement branché sur la vraie base. Utiliser dev:test (3100) ou E2E_ISOLATED=1.");
      pageErrors = [];
      consoleErrors = [];
      mock = new TutorialMock();
      accounts = seeded ? await seedAccounts() : envAccounts();
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => message.type() === "error" && consoleErrors.push(message.text()));
      await context.route(`**${ENDPOINT}`, mock.handle);
      await login(context, baseURL!, accounts!.owner);
    });

    test.afterEach(async ({}, testInfo) => {
      if (pageErrors.length || consoleErrors.length) {
        await testInfo.attach("console-navigateur", { body: [...pageErrors, ...consoleErrors].join("\n"), contentType: "text/plain" });
      }
      const current = accounts;
      accounts = undefined; // un test ignoré en beforeEach ne doit rien nettoyer ni vérifier
      await current?.cleanup();
      if (!current) return;
      // Aucune erreur JavaScript non gérée, ni erreur de console liée au tutoriel / à l'hydratation.
      expect(pageErrors).toEqual([]);
      expect(consoleErrors.filter((text) => /tutorial|tutoriel|hydrat/i.test(text))).toEqual([]);
    });

    test("bienvenue -> Commencer -> bulle Services, clavier et aucune écriture avant le choix", async ({ page }) => {
      await openDashboard(page);
      const dialog = page.getByRole("dialog", { name: WELCOME });
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      expect(mock.writes, "rien n'est écrit tant qu'on ne choisit pas").toEqual([]);

      // Focus initial sur « Commencer », focus piégé dans la carte (Tab / Maj+Tab bouclent).
      const start = dialog.getByRole("button", { name: "Commencer" });
      const later = dialog.getByRole("button", { name: "Plus tard" });
      await expect(start).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(later).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(start).toBeFocused();

      await page.keyboard.press("Enter");
      await saved(mock, "start");
      await expect(dialog).toBeHidden();
      if (!viewport.mobile) {
        // Bureau : d'abord la bulle de navigation sur le lien « Services » de la sidebar.
        await expect(page.getByText("Ouvrez « Services »")).toBeVisible();
        await expectPopoverInViewport(page);
      }
      await reachStep(page, viewport.mobile, SERVICES, "Créez votre premier service");
      await expect(page.locator('[data-tour="services-add"].driver-active-element')).toBeVisible();
      await expect.poll(() => mock.writes.some((w) => w.action === "step" && w.step === "services")).toBe(true);
      expect(mock.status).toBe("IN_PROGRESS");
    });

    test("Passer le tutoriel, puis Revoir le tutoriel", async ({ page }) => {
      await openDashboard(page);
      await page.getByRole("dialog", { name: WELCOME }).getByRole("button", { name: "Commencer" }).click();
      await reachStep(page, viewport.mobile, SERVICES, "Créez votre premier service");

      await page.getByRole("button", { name: /^Passer le tutoriel/ }).click();
      await saved(mock, "skip");
      await expect(page.locator(".driver-popover")).toBeHidden();
      await expect(page.getByRole("status").filter({ hasText: "Tutoriel ignoré" })).toBeVisible();

      // Une nouvelle visite du tableau de bord ne repropose rien.
      await openDashboard(page);
      await expect(page.getByRole("dialog", { name: new RegExp(`${WELCOME}|${RESUME}`) })).toBeHidden();
      await expect(page.locator(".driver-popover")).toBeHidden();
      expect(mock.status).toBe("SKIPPED");

      const restart = page.getByRole("main").getByRole("button", { name: "Revoir le tutoriel" });
      await expect(restart).toBeVisible();
      if (viewport.mobile) await restart.tap();
      else await restart.press("Enter");
      await saved(mock, "reset");
      expect(mock.status).toBe("IN_PROGRESS");
      await expect(page.locator(".driver-popover")).toBeVisible({ timeout: 20_000 });
      await expectPopoverInViewport(page);
    });

    test("Plus tard : rien n'est écrit, le report survit au rechargement et se termine à la déconnexion", async ({ page, context, baseURL }) => {
      await openDashboard(page);
      const dialog = page.getByRole("dialog", { name: WELCOME });
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      await dialog.getByRole("button", { name: "Plus tard" }).click();
      await expect(dialog).toBeHidden();

      // Même onglet : sessionStorage garde le report. Aucun PATCH n'a été émis.
      await openDashboard(page);
      await expect(dialog).toBeHidden();
      expect(mock.writes).toEqual([]);
      expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith("rb:tutorial-later:")))).toHaveLength(1);

      // Nouvelle connexion : la carte revient (statut serveur toujours NOT_STARTED).
      await signOut(page);
      await login(context, baseURL!, accounts!.owner);
      await openDashboard(page);
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      expect(mock.writes).toEqual([]);

      // Échap = « Plus tard » (clavier).
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      expect(mock.writes).toEqual([]);
    });

    for (const exit of [
      { name: "Réglages", path: "/settings/" },
      { name: "Profil", path: "/profile/" },
    ]) {
      test(`Plus tard : la déconnexion depuis ${exit.name} termine aussi le report`, async ({ page, context, baseURL }) => {
        await openDashboard(page);
        const dialog = page.getByRole("dialog", { name: WELCOME });
        await expect(dialog).toBeVisible({ timeout: 30_000 });
        await dialog.getByRole("button", { name: "Plus tard" }).click();
        await expect(dialog).toBeHidden();
        expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith("rb:tutorial-later:")))).toHaveLength(1);

        // Navigation interne (même onglet) : le report survit, puis la déconnexion du contenu de la page le termine.
        await page.goto(`${exit.path}?__host=app`, { waitUntil: "domcontentloaded" });
        const done = page.waitForResponse((r) => r.url().endsWith("/api/auth/logout/") && r.ok());
        await page.getByRole("main").getByRole("button", { name: "Se déconnecter", exact: true }).click();
        await done;
        await expect(page).toHaveURL(/\/(connexion|login)\//);
        expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith("rb:tutorial-later:")))).toHaveLength(0);

        await login(context, baseURL!, accounts!.owner);
        await openDashboard(page);
        await expect(dialog).toBeVisible({ timeout: 30_000 });
        expect(mock.writes).toEqual([]);
      });
    }

    test("étape réussie : l'événement de succès affiche le message puis « Étape suivante » mène à l'équipe", async ({ page }) => {
      mock.status = "IN_PROGRESS";
      mock.lastStep = "services";
      await openDashboard(page);
      const resume = page.getByRole("dialog", { name: RESUME });
      await expect(resume).toBeVisible({ timeout: 30_000 });
      await resume.getByRole("button", { name: "Reprendre" }).click();
      await reachStep(page, viewport.mobile, SERVICES, "Créez votre premier service");
      await expect(page.getByRole("button", { name: "Étape suivante" })).toBeHidden();

      // Le service est « créé » côté simulation (aucune écriture réelle) ; l'événement applicatif relance la lecture.
      mock.progress = { ...mock.progress, services: 1 };
      const readsBefore = mock.reads;
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("rb:tutorial-refresh")));
      await expect.poll(() => mock.reads).toBeGreaterThan(readsBefore);
      await expect(page.locator(".driver-popover").getByText(/votre premier service est enregistré/i)).toBeVisible();
      // Le message est aussi annoncé par la région aria-live permanente (présente avant l'insertion du texte).
      await expect(page.locator("[data-rb-tutorial][aria-live=polite]")).toHaveText(/votre premier service est enregistré/i);
      await expectPopoverInViewport(page);

      await page.getByRole("button", { name: "Étape suivante" }).click();
      await expect(page).toHaveURL(/\/staff\//);
      await expect(page.getByText("Ajoutez une employée", { exact: true })).toBeVisible();
      await expectPopoverInViewport(page);
      await expect.poll(() => mock.writes.some((w) => w.action === "step" && w.step === "staff")).toBe(true);
    });

    test("pause (Échap) puis reconnexion : la reprise revient à l'étape mémorisée", async ({ page, context, baseURL }) => {
      mock.status = "IN_PROGRESS";
      mock.lastStep = "staff";
      mock.progress = { ...mock.progress, services: 1 };
      await openDashboard(page);
      await page.getByRole("dialog", { name: RESUME }).getByRole("button", { name: "Reprendre" }).click({ timeout: 30_000 });
      await reachStep(page, viewport.mobile, STAFF, "Ajoutez une employée");

      await page.keyboard.press("Escape");
      await saved(mock, "pause");
      expect(mock.writes.filter((w) => w.action === "pause")).toEqual([{ action: "pause", step: "staff" }]);
      await expect(page.locator(".driver-popover")).toBeHidden();
      await expect(page.getByRole("status").filter({ hasText: "mis en pause" })).toBeVisible();

      await signOut(page);
      await login(context, baseURL!, accounts!.owner);
      await openDashboard(page);
      const resume = page.getByRole("dialog", { name: RESUME });
      await expect(resume).toBeVisible({ timeout: 30_000 });
      await resume.getByRole("button", { name: "Reprendre" }).click();
      await reachStep(page, viewport.mobile, STAFF, "Ajoutez une employée");
    });

    test("un non-propriétaire ne voit aucun tutoriel et n'appelle pas l'API", async ({ page, context, baseURL }) => {
      test.skip(!accounts!.nonOwner, "E2E_NON_OWNER_EMAIL / E2E_NON_OWNER_PASSWORD non configurés.");
      await context.clearCookies();
      await login(context, baseURL!, accounts!.nonOwner!);
      await openDashboard(page, { expectRead: false });
      await expect(page.locator("main.rappel-dashboard-premium")).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("dialog", { name: new RegExp(`${WELCOME}|${RESUME}`) })).toHaveCount(0);
      await expect(page.locator(".driver-popover")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Revoir le tutoriel" })).toHaveCount(0);
      expect(mock.reads, "le tutoriel ne lit rien pour un non-propriétaire").toBe(0);
      expect(mock.writes).toEqual([]);
    });
  });
}
