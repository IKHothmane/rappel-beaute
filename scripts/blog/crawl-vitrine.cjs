/* Crawl HTTP en lecture seule : aucune soumission de formulaire, aucun accès privé. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const origin = new URL(process.argv[2] || "http://127.0.0.1:3115").origin;
const output = path.resolve(process.argv[3] || ".tmp/crawl-vitrine");
const publicOrigin = "https://rappelbeauty.com";
const normalize = (value) => {
  const u = new URL(value, origin);
  return u.pathname === "/" || /\.[a-z0-9]+$/i.test(u.pathname)
    ? u.pathname
    : u.pathname.replace(/\/$/, "") + "/";
};
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const excluded =
  /^(?:\/api\/|\/domains\/|\/assistant\/|\/carte\/|\/book\/|\/dashboard\/|\/admin\/|\/content\/)/;
async function get(url, method = "GET") {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(120000),
    });
    return {
      status: response.status,
      type: response.headers.get("content-type") || "",
      location: response.headers.get("location"),
      xrobots: response.headers.get("x-robots-tag") || "",
      body: await response.text(),
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    return { status: 0, type: "", body: "", error: error.message, elapsedMs: Date.now() - started };
  }
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const sitemap = await get(origin + "/sitemap.xml");
  if (sitemap.status !== 200) throw new Error(`Sitemap HTTP ${sitemap.status}`);
  fs.writeFileSync(path.join(output, "sitemap.xml"), sitemap.body);
  const sitemapUrls = [...sitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  const sitemapPaths = new Set(sitemapUrls.map(normalize));
  const robots = await get(origin + "/robots.txt");
  fs.writeFileSync(path.join(output, "robots.txt"), robots.body);
  // Les groupes réservés aux robots d'entraînement ne s'appliquent pas au groupe *.
  const robotRules = [];
  let agents = [],
    groupHasRules = false;
  for (const raw of robots.body.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase(),
      value = match[2].trim();
    if (key === "user-agent") {
      if (groupHasRules) {
        agents = [];
        groupHasRules = false;
      }
      agents.push(value.toLowerCase());
    } else {
      groupHasRules = true;
      if (agents.includes("*") && ["allow", "disallow"].includes(key) && value)
        robotRules.push({ key, value });
    }
  }
  const blocked = (route) => {
    const matches = robotRules
      .filter((rule) => route.startsWith(rule.value))
      .sort((a, b) => b.value.length - a.value.length || (a.key === "allow" ? -1 : 1));
    return matches[0]?.key === "disallow";
  };
  const seeds = [...sitemapPaths, "/connexion/", "/ressources/", "/instituts/"];
  const queue = [...new Set(seeds)];
  const scheduled = new Set(queue);
  const rows = [];
  const assets = new Set();
  const skipped = new Set();
  const browser = await chromium.launch({ headless: true });
  let cursor = 0;
  try {
    await Promise.all(
      Array.from({ length: 2 }, async () => {
        const parser = await browser.newPage();
        while (cursor < queue.length) {
          const route = queue[cursor++];
          const result = await get(origin + route);
          const row = {
            path: route,
            inSitemap: sitemapPaths.has(route),
            status: result.status,
            location: result.location,
            error: result.error,
            elapsedMs: result.elapsedMs,
            issues: [],
            warnings: [],
          };
          if (result.status === 200 && result.type.includes("text/html")) {
            Object.assign(
              row,
              await parser.evaluate((html) => {
                const doc = new DOMParser().parseFromString(html, "text/html");
                return {
                  title: doc.title,
                  description:
                    doc.querySelector('meta[name="description"]')?.getAttribute("content") || "",
                  canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
                  robots: doc.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
                  h1: [...doc.querySelectorAll("h1")].map((el) => el.textContent.trim()),
                  links: [...doc.querySelectorAll("a[href]")].map((el) => el.getAttribute("href")),
                  ids: [...doc.querySelectorAll("[id]")].map((el) => el.id),
                  images: [...doc.querySelectorAll("img")].map((el) => ({
                    src: el.getAttribute("src"),
                    alt: el.getAttribute("alt"),
                  })),
                };
              }, result.body),
            );
            row.indexable = !/noindex/i.test(row.robots + " " + result.xrobots);
            if (!row.title) row.issues.push("Titre absent");
            if (!row.description) row.issues.push("Description absente");
            if (row.h1.length !== 1) row.issues.push(`${row.h1.length} titres H1`);
            if (row.indexable && !row.canonical) row.issues.push("Canonique absente");
            if (row.canonical && normalize(row.canonical) !== route)
              row.issues.push("Canonique vers une autre page");
            if (row.inSitemap && !row.indexable)
              row.issues.push("URL non indexable dans le sitemap");
            if (row.inSitemap && blocked(route))
              row.issues.push("URL bloquée par robots.txt dans le sitemap");
            if (row.indexable && !row.inSitemap)
              row.warnings.push("Page indexable absente du sitemap");
            if (row.description.length > 180)
              row.warnings.push("Description de plus de 180 caractères");
            for (const img of row.images) {
              if (img.alt === null) row.issues.push("Image sans attribut alt");
              if (img.src) {
                let u = new URL(img.src, origin);
                if (/^\/_next\/image\/?$/.test(u.pathname))
                  u = new URL(u.searchParams.get("url"), origin);
                if (u.origin === origin) assets.add(u.pathname);
              }
            }
            for (const href of row.links) {
              let u;
              try {
                u = new URL(href, origin + route);
              } catch {
                continue;
              }
              if (![origin, publicOrigin, "https://www.rappelbeauty.com"].includes(u.origin))
                continue;
              const target = normalize(u.href);
              if (u.pathname.startsWith("/cdn-cgi/")) {
                row.warnings.push(
                  "Lien de protection Cloudflare : vérification JavaScript requise",
                );
                skipped.add(target);
                continue;
              }
              if (excluded.test(target) || u.searchParams.has("__host")) {
                skipped.add(target);
                continue;
              }
              if (/\.[a-z0-9]+$/i.test(target) && !/\.html$/i.test(target)) {
                assets.add(target);
                continue;
              }
              if (!scheduled.has(target)) {
                scheduled.add(target);
                queue.push(target);
              }
              if (u.hash && target === route) {
                try {
                  if (!row.ids.includes(decodeURIComponent(u.hash.slice(1))))
                    row.warnings.push(`Ancre absente : ${u.hash}`);
                } catch {
                  row.warnings.push(`Ancre invalide : ${u.hash}`);
                }
              }
            }
          } else if (result.status < 300 || result.status >= 400)
            row.issues.push(`Erreur HTTP ${result.status}`);
          else if (row.inSitemap)
            row.issues.push(`Redirection HTTP ${result.status} dans le sitemap`);
          rows.push(row);
          if (rows.length % 20 === 0)
            console.log(`${rows.length} pages parcourues / ${scheduled.size} découvertes`);
        }
        await parser.close();
      }),
    );
  } finally {
    await browser.close();
  }
  const assetErrors = [];
  for (const asset of assets) {
    const local = path.resolve("public", "." + decodeURIComponent(asset));
    if (
      new URL(origin).hostname === "127.0.0.1" &&
      local.startsWith(path.resolve("public") + path.sep)
    ) {
      if (!fs.existsSync(local)) assetErrors.push({ path: asset, error: "Fichier public absent" });
    } else {
      const response = await get(origin + asset, "HEAD");
      if (response.status !== 200) assetErrors.push({ path: asset, status: response.status });
    }
  }
  rows.sort((a, b) => a.path.localeCompare(b.path));
  const byPath = new Map(rows.map((row) => [row.path, row]));
  const brokenLinks = [];
  for (const row of rows)
    for (const href of row.links || []) {
      try {
        const u = new URL(href, origin + row.path);
        if (![origin, publicOrigin, "https://www.rappelbeauty.com"].includes(u.origin)) continue;
        const target = byPath.get(normalize(u.href));
        if (target && (target.status === 0 || target.status >= 400))
          brokenLinks.push({ from: row.path, to: href, status: target.status });
        if (
          u.hash &&
          target?.ids &&
          !target.ids.includes(decodeURIComponent(u.hash.slice(1))) &&
          normalize(u.href) !== row.path
        )
          row.warnings.push(`Ancre absente dans ${href}`);
      } catch {
        /* URL non HTTP ignorée */
      }
    }
  const duplicates = (key) => {
    const groups = new Map();
    for (const row of rows.filter((r) => r.status === 200 && r.indexable)) {
      const value = row[key];
      if (value) groups.set(value, [...(groups.get(value) || []), row.path]);
    }
    return [...groups.entries()]
      .filter(([, paths]) => paths.length > 1)
      .map(([value, paths]) => ({ value, paths }));
  };
  const report = {
    generatedAt: new Date().toISOString(),
    origin,
    mode: "HTTP GET, HTML serveur ; pas de mesure Lighthouse ni soumission de formulaire",
    sitemapStatus: sitemap.status,
    sitemapUrls: sitemapUrls.length,
    blogUrls: [...sitemapPaths].filter((p) => p.startsWith("/blog/") && p !== "/blog/").length,
    robotsStatus: robots.status,
    crawled: rows.length,
    pagesWithErrors: rows.filter((r) => r.issues.length).length,
    brokenLinks,
    assetCount: assets.size,
    assetErrors,
    duplicateTitles: duplicates("title"),
    duplicateDescriptions: duplicates("description"),
    excludedPrivatePaths: [...skipped],
    rows,
  };
  fs.writeFileSync(path.join(output, "rapport.json"), JSON.stringify(report, null, 2));
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Crawl de la vitrine Rappel Beauty</title><style>body{font:16px/1.6 system-ui;background:#fff7fb;color:#42142b;margin:24px}main{max-width:1300px;margin:auto}table{border-collapse:collapse;width:100%;background:white}td,th{padding:12px;text-align:left;border:1px solid #ecd4df;vertical-align:top}a{color:#ae0049}.scroll{overflow:auto}.good{color:#087d45}.bad{color:#b50038}small{display:block}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><main><h1>Crawl de la vitrine Rappel Beauty</h1><p>${esc(new Intl.DateTimeFormat("fr-MA", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date()))} · ${esc(origin)}</p><p>${report.crawled} pages parcourues · ${report.sitemapUrls} URL dans le sitemap, dont ${report.blogUrls} guides · ${report.pagesWithErrors} pages avec erreur · ${brokenLinks.length} liens cassés · ${assetErrors.length} fichiers manquants.</p><p>${esc(report.mode)}. Résultats du serveur ciblé, sans présumer de l’état d’un déploiement distant. Les accès privés et les données de réservation sont exclus.</p><h2>Résultats par page</h2><div class="scroll"><table><thead><tr><th>Page</th><th>HTTP</th><th>Indexation</th><th>Titre</th><th>Constats</th></tr></thead><tbody>${rows.map((r) => `<tr><td><a href="${esc(origin + r.path)}">${esc(r.path)}</a></td><td class="${r.status === 200 ? "good" : "bad"}">${r.status}${r.location ? `<small>→ ${esc(r.location)}</small>` : ""}</td><td>${r.inSitemap ? "Sitemap" : "Hors sitemap"}<small>${esc(r.robots)}</small></td><td>${esc(r.title)}<small>${esc(r.description)}</small></td><td>${[...r.issues, ...r.warnings].map(esc).join("<br>") || "OK"}</td></tr>`).join("")}</tbody></table></div><h2>Liens et fichiers cassés</h2><pre>${esc(JSON.stringify({ brokenLinks, assetErrors }, null, 2))}</pre><h2>Doublons</h2><pre>${esc(JSON.stringify({ titles: report.duplicateTitles, descriptions: report.duplicateDescriptions }, null, 2))}</pre></main></html>`;
  fs.writeFileSync(path.join(output, "rapport.html"), html);
  console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
