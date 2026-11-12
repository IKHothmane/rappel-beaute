const pages = [
  "/",
  "/a-propos/",
  "/caisse/",
  "/creation-site-web/",
  "/faq/",
  "/fidelite/",
  "/fonctionnalites/",
  "/gestion-rendez-vous/",
  "/professionnel/",
  "/reservation-en-ligne/",
  "/solutions/institut-beaute/",
  "/gestion-clientes/",
  "/gestion-stock/",
  "/blog/",
  "/mentions-legales/",
];

for (const p of pages) {
  const res = await fetch("http://127.0.0.1:3000" + p);
  const html = await res.text();
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || "";
  const heads = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  let skip = false;
  let prev = 0;
  for (const n of heads) {
    if (prev && n > prev + 1) skip = true;
    prev = n;
  }
  const flag = [];
  if (title.length > 60) flag.push("title " + title.length);
  if (title.length < 50) flag.push("title-short " + title.length);
  if (desc.length > 160 || desc.length < 70) flag.push("desc " + desc.length);
  if ((p === "/creation-site-web/" || p === "/reservation-en-ligne/") && skip) {
    flag.push("skip " + heads.join(">"));
  }
  console.log(res.status, p, flag.length ? flag.join(", ") : "ok", "t=" + title.length, "d=" + desc.length);
}
