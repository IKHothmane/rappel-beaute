import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const notes = [];

await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Accepter" }).click();
await page.waitForTimeout(400);
const bannerGone = await page.getByText("mesure d’audience").count();
notes.push({ step: "cookies accept", bannerGone });

const nav = ["Fonctionnalités", "Création de site web", "Tarifs", "À propos"];
for (const label of nav) {
  await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).first().click();
  await page.waitForTimeout(500);
  const h1 = await page.locator("h1").first().innerText();
  notes.push({ step: "nav " + label, url: page.url().replace("http://127.0.0.1:3000", ""), h1: h1.replace(/\s+/g, " ").slice(0, 80) });
}

await page.goto("http://127.0.0.1:3000/fonctionnalites/", { waitUntil: "domcontentloaded" });
const anchors = ["rdv", "clientes", "caisse", "stock", "equipe", "analytics", "whatsapp", "avis"];
const missingAnchors = [];
for (const id of anchors) {
  const n = await page.locator("#" + id).count();
  if (!n) missingAnchors.push(id);
}
notes.push({ step: "anchors fonctionnalites", missingAnchors });

await page.goto("http://127.0.0.1:3000/faq/", { waitUntil: "domcontentloaded" });
await page.getByPlaceholder("Rechercher une question").fill("whatsapp");
await page.waitForTimeout(300);
const faqVisible = await page.locator("body").innerText();
notes.push({
  step: "faq search whatsapp",
  hasQuestion: /rappels WhatsApp/i.test(faqVisible),
  empty: /aucun/i.test(faqVisible),
});
await page.getByRole("button", { name: /Tarifs/ }).click();
await page.waitForTimeout(200);
notes.push({ step: "faq category tarifs", hasPrix: /599/.test(await page.locator("#main-content").innerText()) });

await page.goto("http://127.0.0.1:3000/demo/", { waitUntil: "domcontentloaded" });
const demoLink = page.getByRole("link", { name: /Lancer la démo/ });
await demoLink.click();
await page.waitForTimeout(400);
const demoTarget = await page.locator("#demo-interactive").count();
const demoBox = demoTarget ? await page.locator("#demo-interactive").boundingBox() : null;
notes.push({ step: "demo anchor", hash: new URL(page.url()).hash, target: demoTarget, top: demoBox?.y ?? null });

await page.goto("http://127.0.0.1:3000/contact/", { waitUntil: "domcontentloaded" });
const submit = page.getByRole("button", { name: /Envoyer|Préparer|message/i });
notes.push({ step: "contact buttons", names: await page.locator("form button, a").evaluateAll((els) => els.map((e) => (e.innerText || e.getAttribute("aria-label") || "").trim()).filter(Boolean).slice(0, 12)) });

await page.goto("http://127.0.0.1:3000/connexion/", { waitUntil: "domcontentloaded" });
await page.locator("button.rb-login-submit").click();
await page.waitForTimeout(500);
notes.push({
  step: "login empty",
  alert: await page.locator("[role=alert]").innerText().catch(() => ""),
  invalid: await page.locator("[aria-invalid=true]").count(),
});

const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await mobile.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
await mobile.getByRole("button", { name: "Accepter" }).click();
await mobile.getByRole("button", { name: /menu|ouvrir/i }).click();
await mobile.waitForTimeout(300);
const menuText = await mobile.locator("body").innerText();
notes.push({
  step: "mobile menu",
  hasFonctionnalites: menuText.includes("Fonctionnalités"),
  hasTarifs: menuText.includes("Tarifs"),
  hasContact: /Contact|À propos/.test(menuText),
});

const linkPage = await (await browser.newContext()).newPage();
await linkPage.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
await linkPage.getByRole("button", { name: "Accepter" }).click();
const hrefs = await linkPage.evaluate(() =>
  [...document.querySelectorAll("a[href]")]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("/") && !h.startsWith("//")),
);
const unique = [...new Set(hrefs.map((h) => h.split("#")[0]))];
const bad = [];
for (const href of unique) {
  const res = await linkPage.request.get("http://127.0.0.1:3000" + href, { maxRedirects: 0 });
  if (res.status() >= 400) bad.push({ href, status: res.status() });
}
notes.push({ step: "home internal links", count: unique.length, bad });

console.log(JSON.stringify(notes, null, 2));
await browser.close();
