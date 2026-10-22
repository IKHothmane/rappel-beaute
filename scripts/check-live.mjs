const origin = "https://rappelbeauty.com";
const sm = await (await fetch(`${origin}/sitemap.xml`)).text();
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log("sitemap", locs.length);
const bad = ["/connexion", "/login", "/carte/", "/admin", "/blog", "/ressources", "/assistant", "/institut/", "/salon/", "/reservation/"];
console.log("forbidden in sitemap", bad.filter((b) => locs.some((u) => u.includes(b))).join(", ") || "none");

const shots = {
  "/fonctionnalites/": ["screen-agenda", "screen-clientes", "screen-caisse", "screen-fidelite", "screen-services", "screen-stock", "reservation-en-ligne"],
  "/solutions/institut-beaute/": ["screen-agenda", "screen-stock"],
  "/gestion-rendez-vous/": ["screen-agenda"],
  "/gestion-clientes/": ["screen-clientes"],
  "/caisse/": ["screen-caisse"],
  "/fidelite/": ["screen-fidelite"],
  "/gestion-stock/": ["screen-stock"],
  "/reservation-en-ligne/": ["reservation-en-ligne"],
  "/": ["screen-agenda", "799"],
  "/tarifs/": ["799", "7 990", "7990"],
};

let failed = 0;
for (const loc of locs) {
  const res = await fetch(loc, { redirect: "manual" });
  const path = new URL(loc).pathname;
  const html = res.status === 200 ? await res.text() : "";
  const h1 = (html.match(/<h1\b/g) || []).length;
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const canonical = (html.match(/rel="canonical" href="([^"]+)"/) || [])[1] || "";
  const noindex = /noindex/i.test(html);
  const ok = res.status === 200 && h1 === 1 && !noindex && canonical === loc;
  if (!ok) failed += 1;
  const missing = (shots[path] || []).filter((s) => !html.includes(s));
  if (missing.length) failed += 1;
  console.log(`${ok && !missing.length ? "OK" : "BAD"} ${res.status} h1=${h1} ${path}`);
  console.log(`  ${title}`);
  if (!ok) console.log(`  canon ${canonical} noindex ${noindex}`);
  if (missing.length) console.log(`  missing ${missing.join(", ")}`);
}

const robots = await (await fetch(`${origin}/robots.txt`)).text();
console.log("robots sitemap", robots.includes(`${origin}/sitemap.xml`));
console.log("robots blocks admin", robots.includes("Disallow: /admin/"));
console.log("robots blocks connexion", robots.includes("Disallow: /connexion/"));

const home = await (await fetch(`${origin}/`)).text();
const ld = home.includes('"@type":"SoftwareApplication"') || home.includes('"@type": "SoftwareApplication"');
const price799 = home.includes('"price":"799"') || home.includes('"price": "799"');
const price7990 = home.includes('"price":"7990"') || home.includes('"price": "7990"');
console.log("jsonld software", ld, "price799", price799, "price7990", price7990);

for (const path of ["/login/", "/connexion/", "/carte/exemple/", "/dashboard/"]) {
  const res = await fetch(`${origin}${path}`, { redirect: "manual" });
  console.log("private", path, res.status, res.headers.get("location") || "");
}
console.log(failed === 0 ? "LIVE_OK" : `LIVE_FAILED ${failed}`);
