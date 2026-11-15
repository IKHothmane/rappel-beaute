import { expect, test } from "@playwright/test";
import { BLOG_DRAFTS } from "../src/lib/blog/articles";

test.setTimeout(120_000);

test("blog : parcours public et recherche sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("rb:audience-consent:v1", "denied"));
  const response = await page.goto("/blog/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Le blog des professionnels de la beauté", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".bl-library .bl-card")).toHaveCount(110);
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
  await page.getByLabel("Rechercher un guide").fill("fidélité");
  await page.getByLabel("Thème", { exact: true }).selectOption("fidelite");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page).toHaveURL(/q=fid/);
  await expect(page.locator(".bl-library .bl-card").first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
});

test("blog : URL inconnue et API protégées", async ({ request }) => {
  expect((await request.get("/blog/article-qui-nexiste-pas-test-2026/")).status()).toBe(404);
  expect((await request.get("/api/admin/blog/")).status()).toBe(401);
  expect((await request.put("/api/admin/blog/", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/admin/blog/questions/", { data: {} })).status()).toBe(401);
});

test("les 110 guides sont présents dans le sitemap et accessibles", async ({ request, page }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("/blog/");
  expect(xml.match(/<loc>/g)).toHaveLength(130);
  for (const guide of BLOG_DRAFTS) expect(xml).toContain(`/blog/${guide.slug}/`);
  for (const guide of [BLOG_DRAFTS[0], BLOG_DRAFTS[55], BLOG_DRAFTS[109]]) {
    const response = await request.get(`/blog/${guide.slug}/`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/);
  }
  await page.goto("/blog/");
  await expect(page.locator(".marketing-site > header")).toBeVisible();
  await expect(page.locator(".marketing-site footer")).toBeVisible();
  await expect(page.locator(".bl-review-note")).toHaveCount(0);
});
