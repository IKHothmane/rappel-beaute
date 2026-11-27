// Génère le PDF du guide à partir de src/lib/guide/content.json et des captures publiques.
// Usage : node scripts/dev/build-guide-pdf.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const guide = JSON.parse(fs.readFileSync(path.resolve("src/lib/guide/content.json"), "utf8"));
const imageDir = path.resolve("public/marketing/guide");
const out = path.resolve(`public${guide.pdf}`);

const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dataUri = (name) => {
  const file = path.join(imageDir, `${name}.jpg`);
  if (!fs.existsSync(file)) throw new Error(`Capture manquante : ${file}`);
  return `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;
};
const figure = (image) => `<figure class="${image.mobile ? "phone" : "wide"}"><img src="${dataUri(image.src)}" alt="${esc(image.alt)}"><figcaption>${esc(image.caption)}</figcaption></figure>`;

function section(s, number) {
  const phones = s.images.filter((i) => i.mobile);
  const wides = s.images.filter((i) => !i.mobile);
  return `<section>
  <div class="text">
    <h2><span>${number}</span>${esc(s.title)}</h2>
    <p>${esc(s.intro)}</p>
    <ol>${s.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>
    ${s.tips.map((tip) => `<p class="tip"><strong>Astuce.</strong> ${esc(tip)}</p>`).join("")}
  </div>
  ${wides.map(figure).join("")}
  ${phones.length ? `<div class="phones">${phones.map(figure).join("")}</div>` : ""}
</section>`;
}

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(guide.title)}</title><style>
*{box-sizing:border-box}
body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#2a1820;font-size:10.5pt;line-height:1.5}
h1,h2,h3{font-family:Georgia,"Times New Roman",serif;color:#7d1740;line-height:1.25}
.cover{height:250mm;display:flex;flex-direction:column;justify-content:center;break-after:page}
.cover .brand{letter-spacing:.2em;text-transform:uppercase;color:#b90058;font-weight:700;font-size:10pt}
.cover h1{font-size:32pt;margin:10px 0}
.cover figure{margin:24px 0 0}
.toc{break-after:page}
.toc h3{margin:16px 0 4px;font-size:13pt}
.toc ul{margin:0;padding-left:18px}
.chapter{break-before:page}
.chapter>header{border-bottom:3px solid #b90058;padding-bottom:8px;margin-bottom:6px}
.chapter>header h1{margin:0;font-size:22pt}
.chapter>header p{margin:4px 0 0;color:#6d5560}
section{margin-top:18px}
.text{break-inside:avoid}
h2{font-size:14.5pt;margin:0 0 6px;break-after:avoid}
h2 span{display:inline-block;min-width:34px;color:#b90058}
ol{margin:6px 0;padding-left:20px}li{margin:2px 0}
.tip{background:#fcedf4;border-left:3px solid #b90058;padding:7px 10px;margin:8px 0}
figure{margin:10px 0 0;break-inside:avoid;text-align:center}
figure img{border:1px solid #ecd5df;border-radius:8px;display:block;margin:0 auto}
figure.wide img{width:100%}
.phones{display:flex;gap:14px;justify-content:center;break-inside:avoid}
figure.phone img{width:50mm}
figcaption{font-size:8.5pt;color:#8a707b;margin-top:4px}
</style></head><body>
<div class="cover">
  <div class="brand">Rappel Beauty</div>
  <h1>${esc(guide.title)}</h1>
  <p>${esc(guide.subtitle)}</p>
  <p>${esc(guide.intro)}</p>
  ${figure({ src: "tableau-de-bord", alt: "Tableau de bord", caption: guide.version })}
</div>
<div class="toc"><h1>Sommaire</h1>${guide.chapters.map((c, i) => `<h3>${i + 1}. ${esc(c.title)}</h3><ul>${c.sections.map((s) => `<li>${esc(s.title)}</li>`).join("")}</ul>`).join("")}</div>
${guide.chapters.map((c, i) => `<div class="chapter"><header><h1>${i + 1}. ${esc(c.title)}</h1><p>${esc(c.summary)}</p></header>${c.sections.map((s, j) => section(s, `${i + 1}.${j + 1}`)).join("")}</div>`).join("")}
</body></html>`;

const browser = await chromium.launch({ channel: process.env.GUIDE_CHANNEL || "msedge" });
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({
    path: out,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: '<div style="width:100%;font-size:8px;color:#8a707b;text-align:center">Rappel Beauty · Guide d’utilisation · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    tagged: true,
    outline: true,
  });
} finally {
  await browser.close();
}
console.log(`${out} (${Math.round(fs.statSync(out).size / 1024)} Ko)`);
