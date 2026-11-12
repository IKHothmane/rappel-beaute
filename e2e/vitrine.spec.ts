import { test, expect, type Page } from "@playwright/test";

/**
 * Garde-fous responsive et accessibilité du site vitrine.
 * Chaque page est vérifiée sur mobile, tablette et ordinateur :
 * pas de défilement horizontal, pas de texte qui sort de son cadre,
 * un seul h1, des images décodables et leurs textes alternatifs.
 */

const PAGES = [
  "/",
  "/a-propos/",
  "/blog/",
  "/caisse/",
  "/confidentialite/",
  "/connexion/",
  "/contact/",
  "/demo/",
  "/faq/",
  "/fidelite/",
  "/fonctionnalites/",
  "/gestion-clientes/",
  "/gestion-rendez-vous/",
  "/gestion-stock/",
  "/mentions-legales/",
  "/professionnel/",
  "/reservation-en-ligne/",
  "/solutions/institut-beaute/",
  "/tarifs/",
  "/whatsapp/",
] as const;

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "ordinateur", width: 1440, height: 900 },
] as const;

/** Éléments volontairement plus larges que leur boîte (socle d'ordinateur des maquettes). */
const ALLOWED_OVERFLOW = [".cw-preview-trigger"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("rb:audience-consent:v1", "denied");
    } catch {
      /* Non-HTTP documents. */
    }
  });
});

async function auditPage(page: Page) {
  return page.evaluate((allowed) => {
    const root = document.documentElement;
    const textOverflow: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      "main h1, main h2, main h3, main p, main a, main button",
    )) {
      const style = getComputedStyle(el);
      if (el.clientWidth === 0 || style.display === "inline" || style.overflowX !== "visible") {
        continue;
      }
      if (allowed.some((selector) => el.matches(selector))) continue;
      if (el.scrollWidth > el.clientWidth + 2) {
        textOverflow.push(`${el.tagName.toLowerCase()} « ${el.textContent?.trim().slice(0, 40)} »`);
      }
    }
    return {
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      h1Count: document.querySelectorAll("h1").length,
      imagesWithoutAlt: [...document.querySelectorAll("img")]
        .filter((img) => !img.hasAttribute("alt"))
        .map((img) => img.getAttribute("src")),
      textOverflow,
    };
  }, ALLOWED_OVERFLOW);
}

for (const viewport of VIEWPORTS) {
  test.describe(`Vitrine — ${viewport.name} (${viewport.width}px)`, () => {
    test.setTimeout(120_000);
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of PAGES) {
      test(`${path} s'affiche sans débordement`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: "load" });
        expect(response?.status(), "statut HTTP").toBeLessThan(400);
        await page.evaluate(() => document.fonts.ready);
        const brokenImages = await page.locator("img").evaluateAll(async (images) => {
          const results = await Promise.all(
            images.map(async (element) => {
              const img = element as HTMLImageElement;
              img.loading = "eager";
              try {
                await img.decode();
                return img.naturalWidth > 0 ? null : img.currentSrc;
              } catch {
                return img.currentSrc || img.src;
              }
            }),
          );
          return results.filter(Boolean);
        });
        expect(brokenImages, "images introuvables ou non décodables").toEqual([]);

        const audit = await auditPage(page);
        expect(audit.horizontalOverflow, "défilement horizontal (px)").toBeLessThanOrEqual(0);
        expect(audit.h1Count, "nombre de h1").toBe(1);
        expect(audit.imagesWithoutAlt, "images sans attribut alt").toEqual([]);
        expect(audit.textOverflow, "textes qui sortent de leur cadre").toEqual([]);
      });
    }
  });
}
