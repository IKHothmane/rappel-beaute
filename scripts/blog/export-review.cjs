const fs = require("node:fs");
const path = require("node:path");
require("tsx/cjs");
const { BLOG_DRAFTS, articleWordCount } = require("../../src/lib/blog/articles.ts");
const { BLOG_CATEGORIES, blogCategory } = require("../../src/lib/blog/categories.ts");
const { BLOG_IMAGES } = require("../../src/lib/blog/images.ts");
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const embedded = new Map();
function image(src) {
  if (!BLOG_IMAGES.some((asset) => asset.src === src)) throw new Error("Capture non autorisée");
  if (!embedded.has(src))
    embedded.set(
      src,
      "data:image/webp;base64," +
        fs.readFileSync(path.join(process.cwd(), "public", src.slice(1))).toString("base64"),
    );
  return embedded.get(src);
}
function section(s) {
  return `<section><h2>${esc(s.title)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}${s.steps?.length ? `<ol>${s.steps.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` : ""}${s.table ? `<div class="table-scroll" role="region" aria-label="${esc(s.table.caption)}" tabindex="0"><table><caption>${esc(s.table.caption)}</caption><thead><tr>${s.table.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${s.table.rows.map((row) => `<tr>${row.map((cell, i) => (i === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>` : ""}${s.image ? `<figure><img src="${image(s.image.src)}" alt="${esc(s.image.alt)}" width="${s.image.width}" height="${s.image.height}" loading="lazy"><figcaption>${esc(s.image.caption)}</figcaption></figure>` : ""}</section>`;
}
const count = BLOG_DRAFTS.length;
const cards = BLOG_DRAFTS.map(
  (a, i) =>
    `<details class="guide" id="${a.slug}" data-theme="${a.category}"><summary><span>${i + 1}. ${esc(a.title)}</span><small>${esc(blogCategory(a.category).label)} · ${articleWordCount(a)} mots · À relire</small></summary><article><p><a href="rappel-beauty-guides/${a.slug}.html">Lire ce guide sur sa propre page ?</a></p><p class="answer">${esc(a.answer)}</p>${a.sections.map(section).join("")}<h2>Questions complémentaires</h2>${a.faqs.map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join("")}<h2>Liens et sources</h2><ul>${[...a.links.map((l) => ({ ...l, href: "https://rappelbeauty.com" + l.href })), ...a.sources].map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></article></details>`,
).join("");
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${count} guides Rappel Beauty — relecture</title><style>body{margin:0;background:#fff7fb;color:#42142b;font:17px/1.8 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:32px 24px}h1{font:600 clamp(30px,4vw,48px)/1.2 Georgia,serif}h2{font:600 26px/1.3 Georgia,serif;margin-top:32px}h3{font-size:19px}.badge{color:#b6004d;font-size:13px;text-transform:uppercase;letter-spacing:.1em}.controls{display:flex;flex-wrap:wrap;gap:16px;padding:20px;background:white;border:1px solid #f0d4e1;border-radius:16px;margin:24px 0}label{display:grid;gap:6px;flex:1;min-width:220px}input,select{padding:12px;border:1px solid #dbc4d0;border-radius:8px;font:inherit;min-width:0}details{background:white;border:1px solid #ecd4df;border-radius:14px;margin:12px 0}summary{padding:20px;cursor:pointer;font-weight:650}summary span,summary small{display:block}small,figcaption{font-weight:400;color:#795e6c;font-size:14px}article{padding:0 24px 24px;overflow-wrap:anywhere;min-width:0}.answer{background:#fff0f6;border-left:4px solid #e60060;padding:20px}li{margin:10px 0}a{color:#ac0048}figure{margin:24px 0}img{max-width:100%;height:auto;border-radius:12px}.table-scroll{overflow-x:auto;max-width:100%}table{border-collapse:collapse;width:100%;min-width:620px;font-size:15px}caption{text-align:left;padding:12px}th,td{padding:12px;text-align:left;vertical-align:top;border:1px solid #ecd4df}thead{background:#fff0f6}[hidden]{display:none!important}:focus-visible{outline:3px solid #c00050;outline-offset:4px}</style></head><body><main><p class="badge">Rappel Beauty · Atelier éditorial · 13 novembre 2026</p><h1>${count} questions, ${count} guides à relire</h1><p>Propositions locales de relecture : aucun article de cette copie n’est publié automatiquement. Les exemples marocains sont fictifs ; les comparaisons documentaires sont datées et les guides 2027 préparent l’année à venir. Cette copie reprend les fichiers source et non les modifications éventuellement enregistrées en base.</p><div class="controls"><label>Rechercher une question<input id="q" type="search" placeholder="Google Maps, agenda, fidélité…"></label><label>Thème<select id="theme"><option value="">Tous les thèmes</option>${BLOG_CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("")}</select></label></div><p id="count" role="status">${count} guides</p>${cards}<script>const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();function filter(){const q=norm(document.querySelector('#q').value);const t=document.querySelector('#theme').value;let n=0;document.querySelectorAll('.guide').forEach(e=>{e.hidden=!!((t&&e.dataset.theme!==t)||(q&&!norm(e.textContent).includes(q)));if(!e.hidden)n++});document.querySelector('#count').textContent=n+' guide'+(n>1?'s':'')}document.querySelector('#q').addEventListener('input',filter);document.querySelector('#theme').addEventListener('change',filter);function anchor(){try{const e=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(e&&e.classList.contains('guide')){e.open=true;e.scrollIntoView()}}catch{}}window.addEventListener('hashchange',anchor);anchor();</script></main></body></html>`;
fs.mkdirSync(".tmp", { recursive: true });
const output = `.tmp/rappel-beauty-${count}-guides-relecture.html`;
fs.writeFileSync(output, html);
console.log(`${count} guides exportés : ${output}`);

// Chaque guide possède aussi un fichier autonome, accessible hors connexion.
const directory = ".tmp/rappel-beauty-guides";
fs.mkdirSync(directory, { recursive: true });
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
function document(title, description, body) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} — Rappel Beauty</title><meta name="description" content="${esc(description)}"><style>${style}nav{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}.guide-link{padding:16px 20px;background:white;border:1px solid #ecd4df;border-radius:14px;margin:12px 0}.guide-link a{font-weight:650}article{padding:0}</style></head><body><main>${body}</main></body></html>`;
}
for (const [i, a] of BLOG_DRAFTS.entries()) {
  const previous = BLOG_DRAFTS[i - 1];
  const next = BLOG_DRAFTS[i + 1];
  const body = `<nav aria-label="Retour"><a href="index.html">← Tous les guides</a></nav><p class="badge">${esc(blogCategory(a.category).label)} · Brouillon à relire</p><h1>${esc(a.title)}</h1><p>${articleWordCount(a)} mots · Par ${esc(a.author)}</p><p>Copie locale de la version source. Ce guide n’est pas publié automatiquement.</p><article><p class="answer">${esc(a.answer)}</p>${a.sections.map(section).join("")}<h2>Questions complémentaires</h2>${a.faqs.map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join("")}<h2>Liens et sources</h2><ul>${[...a.links.map((l) => ({ ...l, href: "https://rappelbeauty.com" + l.href })), ...a.sources].map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></article><nav aria-label="Parcourir les guides">${previous ? `<a href="${previous.slug}.html">← ${esc(previous.title)}</a>` : ""}${next ? `<a href="${next.slug}.html">${esc(next.title)} →</a>` : ""}</nav>`;
  fs.writeFileSync(path.join(directory, a.slug + ".html"), document(a.title, a.description, body));
}
const index = `<p class="badge">Rappel Beauty · Relecture</p><h1>${count} guides, chacun sur sa page</h1><p>Choisissez un guide pour ouvrir sa page complète. Cette copie reprend les sources enrichies, sans publication automatique.</p>${BLOG_CATEGORIES.map(
  (category) =>
    `<section><h2>${esc(category.label)}</h2>${BLOG_DRAFTS.filter((a) => a.category === category.id)
      .map(
        (a) =>
          `<div class="guide-link"><a href="${a.slug}.html">${esc(a.title)}</a><p>${esc(a.description)}</p></div>`,
      )
      .join("")}</section>`,
).join("")}`;
fs.writeFileSync(
  path.join(directory, "index.html"),
  document(
    "Tous les guides",
    "Les 110 guides Rappel Beauty en pages individuelles de relecture.",
    index,
  ),
);
console.log(`${count} pages individuelles et leur liste : ${directory}/index.html`);
