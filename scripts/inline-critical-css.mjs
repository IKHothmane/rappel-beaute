import fs from "fs";
import path from "path";
import zlib from "zlib";
import Critters from "critters";

const distDir = process.env.NEXT_BUILD_DIR || ".next";
const appDir = path.join(distDir, "server", "app");

const critters = new Critters({
  path: distDir,
  publicPath: "/_next/",
  preload: "media",
  fonts: false,
  reduceInlineStyles: false,
  logLevel: "silent",
});

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (name.endsWith(".html")) files.push(full);
  }
  return files;
}

function dedupeStylesheets(html) {
  const seen = new Set();
  return html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (tag) => {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (!href || seen.has(href)) return "";
    seen.add(href);
    return `${tag}<noscript><link rel="stylesheet" href="${href}"></noscript>`;
  });
}

const files = walk(appDir);
let changed = 0;
for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("/_next/static/css/")) continue;
  const processed = dedupeStylesheets(await critters.process(html));
  if (processed !== html) {
    fs.writeFileSync(file, processed);
    changed += 1;
  }
}

const homePath = path.join(appDir, "index.html");
if (fs.existsSync(homePath)) {
  const home = fs.readFileSync(homePath, "utf8");
  const links = [...home.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((match) => match[0]);
  const blocking = links.filter(
    (tag) => !tag.includes('media="print"') && !home.slice(home.indexOf(tag) - 10, home.indexOf(tag)).includes("<noscript>"),
  );
  console.log(
    `CSS critique intégré dans ${changed} pages. Accueil : ${links.length} feuilles différées, ${blocking.length} bloquantes, HTML ${zlib.gzipSync(home).length} octets gzip.`,
  );
} else {
  console.log(`CSS critique intégré dans ${changed} pages.`);
}
