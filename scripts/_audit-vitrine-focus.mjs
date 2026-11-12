import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

await page.goto("http://127.0.0.1:3000/faq/", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Accepter" }).click({ timeout: 4000 }).catch(() => {});
await page.locator("#faq-search").click();
await page.locator("#faq-search").pressSequentially("whatsapp", { delay: 20 });
await page.waitForTimeout(300);
console.log("FAQ input", await page.locator("#faq-search").inputValue());
console.log("FAQ results", (await page.locator("#faq-results").innerText()).replace(/\s+/g, " ").slice(0, 280));

await page.getByRole("button", { name: /Tarifs et abonnement/ }).click();
await page.waitForTimeout(200);
console.log("FAQ tarifs", (await page.locator("#faq-results").innerText()).replace(/\s+/g, " ").slice(0, 220));

await page.goto("http://127.0.0.1:3000/connexion/", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Accepter" }).click({ timeout: 4000 }).catch(() => {});
const responsePromise = page.waitForResponse((res) => res.url().includes("/api/auth/login/"), { timeout: 20000 });
await page.locator("button.rb-login-submit").click();
try {
  const res = await responsePromise;
  console.log("LOGIN status", res.status(), (await res.text()).slice(0, 180));
  console.log("LOGIN alert", await page.locator("#login-error").innerText());
} catch (error) {
  console.log("LOGIN fail", String(error).slice(0, 200));
}

await page.goto("http://127.0.0.1:3000/fonctionnalites/#caisse", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
const caisse = await page.locator("#caisse").boundingBox();
console.log("ANCHOR caisse", { y: caisse?.y, scroll: await page.evaluate(() => window.scrollY) });

await browser.close();
