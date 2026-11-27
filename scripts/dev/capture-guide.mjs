// Captures d'écran du guide d'utilisation, en LECTURE SEULE sur l'application en ligne.
// Identifiants : variables d'environnement GUIDE_EMAIL et GUIDE_PASSWORD (jamais écrits dans le dépôt).
// Usage : node scripts/dev/capture-guide.mjs [probe|shots]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.GUIDE_BASE_URL || "https://rappelbeauty.com").replace(/\/$/, "");
const { GUIDE_EMAIL: email, GUIDE_PASSWORD: password } = process.env;
if (!email || !password) throw new Error("Définissez GUIDE_EMAIL et GUIDE_PASSWORD.");
const mode = process.argv[2] || "probe";
const OUT = process.env.GUIDE_OUT || path.resolve("public/marketing/guide");
fs.mkdirSync(OUT, { recursive: true });

const SCREENS = [
  ["tableau-de-bord", "/dashboard/"],
  ["agenda", "/agenda/"],
  ["clientes", "/customers/"],
  ["services", "/services/"],
  ["equipe", "/staff/"],
  ["planning", "/staff/?tab=planning"],
  ["ressources", "/resources/"],
  ["caisse", "/cash-register/"],
  ["produits", "/products/"],
  ["fidelite", "/loyalty/"],
  ["promotions", "/promotions/"],
  ["statistiques", "/analytics/"],
  ["reglages", "/settings/"],
  ["assistance", "/support/"],
  ["fournisseurs", "/suppliers/"],
  ["achats", "/purchases/"],
  ["depenses", "/expenses/"],
  ["avis", "/reviews/"],
  ["notifications", "/notifications/"],
  ["assistant", "/ai/"],
];

/** Formulaires ouverts pour la capture (jamais enregistrés) : nom, page, libellé du bouton. */
const FORMS = [
  ["form-rendez-vous", "/agenda/", /Nouveau rendez-vous/],
  ["form-cliente", "/customers/", /Nouvelle cliente/],
  ["form-service", "/services/", /Nouveau service/],
  ["form-employee", "/staff/", /Ajouter un employé/],
  ["form-ressource", "/resources/", /Nouvelle ressource/],
  ["form-produit", "/products/", /Nouveau produit/],
  ["form-paiement", "/cash-register/", /Nouveau paiement/],
  ["form-promotion", "/promotions/", /Nouvelle promotion/],
  ["form-depense", "/expenses/", /Nouvelle dépense/],
];

/**
 * Les captures sont publiées : e-mails, téléphones, codes clientes et noms de test sont remplacés
 * par des valeurs fictives et les QR codes sont floutés (modification locale au navigateur).
 */
async function anonymize(page) {
  await page.evaluate(() => {
    const rules = [
      [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "contact@exemple.ma"],
      [/(?:\+212|00212|\b212|\b0)[\s.-]?[5-7](?:[\s.-]?\d){8}\b/g, "06 00 00 00 00"],
      [/\bWL[0-9a-z]{5,}\b/gi, "Sans numéro"],
      [/\bqr_[\w-]+/gi, "Sans numéro"],
      [/\bothmane(\s*—)?/gi, "Sara Alami"],
      [/Tutoriel Agenda/g, "Imane Tazi"],
      [/Qr Scan/g, "Salma Idrissi"],
      [/Test Booking/g, "Kenza Berrada"],
      [/Lina Suivi/g, "Lina Fassi"],
      [/Cpi [Ii]n/g, "Rim Kettani"],
      [/Produit X\b/g, "Huile de massage"],
      [/Cliente [0-9A-Z]{4}\b/g, "Cliente fidélité"],
    ];
    const clean = (v) => rules.reduce((out, [re, to]) => out.replace(re, to), v);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const next = clean(node.nodeValue || "");
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    for (const el of document.querySelectorAll("input, textarea")) {
      if (el.value) el.value = clean(el.value);
    }
    // Sur la fidélité, les images générées (data:) sont les QR codes ; ailleurs ce sont des photos à garder nettes.
    const loyalty = location.pathname.startsWith("/loyalty");
    const qr = loyalty ? 'img[alt*="QR" i], img[src^="data:image"], canvas' : 'img[alt*="QR" i]';
    for (const el of document.querySelectorAll(qr)) el.style.filter = "blur(7px)";
  });
}

/** Aucune écriture : tout appel autre que GET/HEAD/OPTIONS est coupé, sauf la connexion. */
async function readOnly(context, blocked) {
  await context.route("**/*", (route) => {
    const request = route.request();
    const method = request.method();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) return route.continue();
    const url = new URL(request.url());
    if (method === "POST" && /^\/api\/auth\/login\/?$/.test(url.pathname)) return route.continue();
    blocked.push(`${method} ${url.hostname}${url.pathname}`);
    return route.abort();
  });
}

async function login(page) {
  await page.goto(`${BASE}/connexion/`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.locator('input[type="password"]').first().waitFor({ timeout: 20000 });
  const id = page.locator('form input:not([type="password"]):not([type="hidden"]):not([type="checkbox"])').first();
  await id.fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((u) => !/\/connexion\/?$/.test(u.pathname), { timeout: 30000 }),
    page.locator('input[type="password"]').first().press("Enter"),
  ]);
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);
  // Carte de bienvenue du tutoriel : Échap = « Plus tard » (mémorisé dans le navigateur seulement).
  if (await page.getByRole("dialog").filter({ hasText: "Bienvenue sur Rappel Beauty" }).count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
}

const browser = await chromium.launch({ channel: process.env.GUIDE_CHANNEL || "msedge" });
const blocked = [];
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "fr-FR", serviceWorkers: "block" });
  await readOnly(desktop, blocked);
  const page = await desktop.newPage();
  await login(page);
  const appOrigin = new URL(page.url()).origin;
  const query = new URL(page.url()).search;
  console.log("connecté :", page.url());

  if (mode === "probe") {
    await settle(page);
    await page.screenshot({ path: path.join(OUT, "probe.png") });
    const links = await page.locator("a[href]").evaluateAll((els) => [...new Set(els.map((a) => `${a.getAttribute("href")} | ${(a.textContent || "").trim().slice(0, 40)}`))]);
    console.log(links.join("\n"));
  } else {
    const url = (route) => {
      const target = new URL(route, appOrigin);
      for (const [k, v] of new URLSearchParams(query)) if (k === "__host") target.searchParams.set(k, v);
      return target.href;
    };
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", serviceWorkers: "block", storageState: await desktop.storageState() });
    await readOnly(mobile, blocked);
    const phone = await mobile.newPage();
    for (const [name, route] of SCREENS) {
      for (const [target, suffix] of [[page, ""], [phone, "-mobile"]]) {
        try {
          const response = await target.goto(url(route), { waitUntil: "domcontentloaded", timeout: 30000 });
          await settle(target);
          const tutorial = await target.getByRole("button", { name: /^Tutoriel$/ }).filter({ visible: true }).count();
          if (name === "agenda" && !suffix) {
            // Vue Mois sur le mois précédent : le calendrier de démonstration y est rempli.
            await target.getByRole("button", { name: /^Mois$/ }).filter({ visible: true }).first().click().catch(() => {});
            await target.getByRole("button", { name: /précédent/i }).filter({ visible: true }).first().click({ timeout: 4000 }).catch(() => console.log("agenda : période précédente introuvable"));
            await settle(target);
          }
          await anonymize(target);
          await target.screenshot({ path: path.join(OUT, `${name}${suffix}.jpg`), type: "jpeg", quality: 78 });
          console.log(`${name}${suffix}\t${response?.status()}\t${new URL(target.url()).pathname}\ttutoriel=${tutorial}`);
        } catch (error) {
          console.log(`${name}${suffix}\tÉCHEC\t${String(error).split("\n")[0]}`);
        }
      }
    }
    for (const [name, route, label] of FORMS) {
      try {
        await page.goto(url(route), { waitUntil: "domcontentloaded", timeout: 30000 });
        await settle(page);
        await page.getByRole("button", { name: label }).filter({ visible: true }).first().click({ timeout: 8000 });
        await settle(page);
        await anonymize(page);
        await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 78 });
        console.log(`${name}\tOK`);
      } catch (error) {
        console.log(`${name}\tÉCHEC\t${String(error).split("\n")[0]}`);
      }
    }
  }
} finally {
  await browser.close();
  console.log("appels d'écriture bloqués :", blocked.length ? [...new Set(blocked)].join(" ; ") : "aucun");
}
