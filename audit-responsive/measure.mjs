import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const pages = [
  ["/", "accueil"],
  ["/fonctionnalites/", "fonctionnalites"],
  ["/solutions/institut-beaute/", "institut"],
  ["/gestion-rendez-vous/", "rdv"],
  ["/gestion-clientes/", "clientes"],
  ["/caisse/", "caisse"],
  ["/fidelite/", "fidelite"],
  ["/gestion-stock/", "stock"],
  ["/reservation-en-ligne/", "reservation"],
  ["/tarifs/", "tarifs"],
  ["/a-propos/", "apropos"],
  ["/contact/", "contact"],
  ["/faq/", "faq"],
  ["/blog/", "blog"],
  ["/professionnel/", "essai"],
];

const audit = () => {
  const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const h1 = document.querySelector("h1");
  const h1s = h1 ? getComputedStyle(h1) : null;
  const h1box = h1 ? h1.getBoundingClientRect() : null;
  const heads = [...document.querySelectorAll("h2")].map((h) => {
    const fs = parseFloat(getComputedStyle(h).fontSize);
    const inFooter = !!h.closest("footer");
    return { t: h.textContent.replace(/\s+/g, " ").trim().slice(0, 48), fs, inFooter };
  });
  const imgs = [...document.querySelectorAll("img")].map((img) => {
    const r = img.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return null;
    const ratio = r.width / r.height;
    const natural = nw / nh;
    const fit = getComputedStyle(img).objectFit;
    const distorted = fit === "fill" && Math.abs(ratio - natural) / natural > 0.08;
    return distorted ? { alt: (img.alt || img.src).slice(0, 60), w: Math.round(r.width), h: Math.round(r.height), nw, nh } : null;
  }).filter(Boolean);
  const buttons = [...document.querySelectorAll("a, button")].filter((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 40 && r.height > 0 && s.visibility !== "hidden" && r.height < 36 && (s.backgroundColor !== "rgba(0, 0, 0, 0)" || el.className.toString().includes("btn"));
  }).slice(0, 6).map((el) => ({ t: el.textContent.replace(/\s+/g, " ").trim().slice(0, 40), h: Math.round(el.getBoundingClientRect().height) }));
  const clipped = [...document.querySelectorAll("h1, h2, p, a, button")].filter((el) => {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") return false;
    const r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 8) return false;
    return el.scrollWidth > el.clientWidth + 4 && s.overflow !== "visible" && s.textOverflow === "ellipsis";
  }).slice(0, 8).map((el) => el.textContent.replace(/\s+/g, " ").trim().slice(0, 48));
  const hero = document.querySelector(".hm-pano-stage");
  let heroInfo = null;
  if (hero) {
    const stage = hero.getBoundingClientRect();
    const text = hero.querySelector("p");
    const images = [...hero.querySelectorAll("img")].map((img) => img.getBoundingClientRect()).filter((r) => r.width > 20);
    const textBottom = text ? text.getBoundingClientRect().bottom : 0;
    const imgTop = images.length ? Math.min(...images.map((r) => r.top)) : 0;
    const imgBottom = images.length ? Math.max(...images.map((r) => r.bottom)) : 0;
    const section = document.querySelector("section.hm-pano");
    heroInfo = {
      stageH: Math.round(stage.height),
      sectionH: section ? Math.round(section.getBoundingClientRect().height) : 0,
      gapTextImg: Math.round(imgTop - textBottom),
      voidBelow: Math.round(stage.bottom - imgBottom),
      h1: h1s ? h1s.fontSize : null,
    };
  }
  const nav = document.querySelector('header nav[aria-label="Navigation principale"]');
  const menu = document.querySelector("header button[aria-expanded]");
  return {
    overflow,
    h1: h1s ? { fs: h1s.fontSize, w: h1box ? Math.round(h1box.width) : 0, clipped: h1 ? h1.scrollWidth > h1.clientWidth + 2 : false } : null,
    h2out: heads.filter((h) => !h.inFooter && (h.fs < 24 || h.fs > 46)),
    imgs,
    smallButtons: buttons,
    clipped,
    hero: heroInfo,
    nav: nav ? getComputedStyle(nav).display : null,
    menu: menu ? getComputedStyle(menu).display : null,
  };
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const out = { pages: [], hero: [], nav: [] };

for (const [path, name] of pages) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const res = await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(400);
  const at1440 = await page.evaluate(audit);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(200);
  const at1024 = await page.evaluate(audit);
  out.pages.push({ name, path, status: res?.status(), at1440, at1024 });
  process.stdout.write(name + " " + (res?.status() ?? "?") + "\n");
}

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
for (const [w, h] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(250);
  const data = await page.evaluate(audit);
  out.hero.push({ w, h, ...data.hero, overflow: data.overflow, h1: data.h1, nav: data.nav, menu: data.menu });
}

for (const w of [1024, 1280, 1366, 1440, 1920]) {
  await page.setViewportSize({ width: w, height: 800 });
  await page.waitForTimeout(150);
  const fit = await page.evaluate(() => {
    const bar = document.querySelector("header .pointer-events-auto");
    const nav = document.querySelector('header nav[aria-label="Navigation principale"]');
    const menu = document.querySelector("header button[aria-expanded]");
    if (!bar || !nav) return null;
    const prev = nav.style.display;
    nav.style.display = "flex";
    const links = [...nav.querySelectorAll("a")];
    const needed = links.reduce((sum, a) => sum + a.getBoundingClientRect().width, 0) + (links.length - 1) * 16;
    const barW = bar.getBoundingClientRect().width;
    const logo = bar.querySelector("a")?.getBoundingClientRect().width ?? 0;
    const actions = 210 + 130;
    const free = barW - logo - actions - 48;
    nav.style.display = prev;
    return {
      barW: Math.round(barW),
      links: Math.round(needed),
      free: Math.round(free),
      fits: needed < free,
      nav: getComputedStyle(nav).display,
      menu: menu ? getComputedStyle(menu).display : null,
    };
  });
  out.nav.push({ w, ...fit });
}

writeFileSync("audit-responsive/measure.json", JSON.stringify(out, null, 2));
await browser.close();
console.log("done");
