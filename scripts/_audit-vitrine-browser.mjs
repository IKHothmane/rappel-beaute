import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("scripts/.audit-vitrine");
await mkdir(outDir, { recursive: true });

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
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!/favicon|webpack-hmr|hot-update|Download the React DevTools/i.test(text)) {
        consoleErrors.push(text.slice(0, 300));
      }
    }
  });

  for (const route of paths) {
    consoleErrors.length = 0;
    const failedRequests = [];
    const onResponse = (res) => {
      const url = res.url();
      if (res.status() >= 400 && !/hot-update|favicon|_next\/static\/webpack/i.test(url)) {
        failedRequests.push(`${res.status()} ${url.replace("http://localhost:3000", "").slice(0, 180)}`);
      }
    };
    page.on("response", onResponse);
    let status = 0;
    try {
      const res = await page.goto("http://127.0.0.1:3000" + route, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      status = res?.status() ?? 0;
      await page.waitForTimeout(1200);
      const info = await page.evaluate(() => {
        const text = (document.body.innerText || "").replace(/\s+/g, " ").trim();
        const h1 = document.querySelector("h1")?.innerText.replace(/\s+/g, " ").trim() ?? null;
        const brokenImages = [...document.images]
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => (img.currentSrc || img.src).replace(location.origin, ""))
          .slice(0, 8);
        const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const suspects = [];
        if (/\b(undefined|NaN|\[object Object\]|lorem ipsum|TODO|FIXME)\b/i.test(text)) suspects.push("texte suspect");
        const buttons = [...document.querySelectorAll("button, a")];
        const emptyClicks = buttons
          .filter((el) => !(el.textContent || "").trim() && !el.getAttribute("aria-label") && !el.querySelector("img,svg"))
          .slice(0, 5)
          .map((el) => el.tagName + (el.className ? "." + String(el.className).split(" ")[0] : ""));
        const header = document.querySelector("header");
        const footer = document.querySelector("footer");
        return {
          title: document.title,
          h1,
          overflowX,
          scrollH: document.documentElement.scrollHeight,
          brokenImages,
          suspects,
          emptyClicks,
          hasHeader: Boolean(header),
          hasFooter: Boolean(footer),
          textLen: text.length,
        };
      });
      const slug = (route === "/" ? "home" : route.replace(/\//g, "-").replace(/^-|-$/g, "")) + "-" + viewport.name;
      await page.screenshot({ path: path.join(outDir, `${slug}.png`), fullPage: false });
      report.push({
        viewport: viewport.name,
        route,
        status,
        ...info,
        consoleErrors: [...new Set(consoleErrors)].slice(0, 8),
        failedRequests: [...new Set(failedRequests)].slice(0, 8),
      });
    } catch (error) {
      report.push({ viewport: viewport.name, route, status, error: String(error).slice(0, 400) });
    }
    page.off("response", onResponse);
  }
  await context.close();
}

await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log("pages", report.length);
for (const row of report) {
  const flags = [];
  if (row.status !== 200) flags.push("status " + row.status);
  if (row.error) flags.push("error");
  if ((row.overflowX ?? 0) > 2) flags.push("overflow " + row.overflowX);
  if (row.brokenImages?.length) flags.push("images " + row.brokenImages.length);
  if (row.consoleErrors?.length) flags.push("console " + row.consoleErrors.length);
  if (row.failedRequests?.length) flags.push("net " + row.failedRequests.length);
  if (row.suspects?.length) flags.push(row.suspects.join(","));
  if (!row.h1) flags.push("no h1");
  if (row.hasHeader === false) flags.push("no header");
  if (row.hasFooter === false) flags.push("no footer");
  console.log(`${row.viewport} ${row.route} ${flags.length ? flags.join(" | ") : "ok"}`);
}
