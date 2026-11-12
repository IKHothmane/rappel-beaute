import { chromium } from "@playwright/test";

const paths = [
  "/",
  "/fonctionnalites/",
  "/creation-site-web/",
  "/tarifs/",
  "/a-propos/",
  "/solutions/institut-beaute/",
  "/gestion-rendez-vous/",
  "/reservation-en-ligne/",
  "/gestion-clientes/",
  "/gestion-stock/",
  "/caisse/",
  "/fidelite/",
  "/whatsapp/",
  "/professionnel/",
  "/faq/",
  "/blog/",
  "/demo/",
  "/contact/",
  "/connexion/",
  "/confidentialite/",
  "/mentions-legales/",
  "/forgot-password/",
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const hrefs = new Set();
for (const route of paths) {
  const res = await page.goto("http://127.0.0.1:3000" + route, { waitUntil: "domcontentloaded", timeout: 45000 });
  const found = await page.locator("a[href]").evaluateAll((els) =>
    els.map((a) => a.getAttribute("href")).filter(Boolean),
  );
  for (const href of found) {
    if (href.startsWith("/") && !href.startsWith("//")) hrefs.add(href.split("#")[0]);
  }
  if (route === "/faq/") {
    await page.locator("#faq-search").fill("whatsapp");
    await page.waitForTimeout(400);
    const results = await page.locator("#faq-results").innerText();
    console.log("FAQ", JSON.stringify(results.replace(/\s+/g, " ").slice(0, 400)));
  }
  if (route === "/connexion/") {
    await page.locator("button.rb-login-submit").click();
    const alert = page.locator("#login-error");
    try {
      await alert.waitFor({ timeout: 8000 });
      console.log("LOGIN", JSON.stringify(await alert.innerText()));
    } catch {
      console.log("LOGIN", "no error", page.url());
    }
  }
  if (route === "/contact/") {
    const labels = await page.locator("form label, form button, form input, form textarea").evaluateAll((els) =>
      els.map((el) => (el.getAttribute("placeholder") || el.innerText || el.getAttribute("aria-label") || el.tagName).trim()).filter(Boolean),
    );
    console.log("CONTACT", JSON.stringify(labels));
  }
  console.log("PAGE", route, res?.status());
}

const bad = [];
for (const href of hrefs) {
  if (!href || href.startsWith("/api/")) continue;
  const res = await page.request.get("http://127.0.0.1:3000" + href, { maxRedirects: 0 });
  if (res.status() >= 400) bad.push({ href, status: res.status() });
}
console.log("LINKS", hrefs.size, "BAD", JSON.stringify(bad));
await browser.close();
