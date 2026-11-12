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
  "/instituts/",
  "/ressources/",
  "/faq/",
  "/blog/",
  "/demo/",
  "/contact/",
  "/connexion/",
  "/confidentialite/",
  "/mentions-legales/",
  "/assistant/preview/",
];

const errorRe = /Application error|Unhandled Runtime|Module not found|__next_error__|This page could not be found/i;

for (const p of paths) {
  const t = Date.now();
  try {
    const r = await fetch("http://localhost:3000" + p, { redirect: "manual" });
    const loc = r.headers.get("location");
    const html = await r.text();
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
    const h1Raw = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "";
    const h1 = h1Raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    const err = errorRe.test(html);
    console.log(
      JSON.stringify({
        p,
        status: r.status,
        ms: Date.now() - t,
        loc,
        title: title.slice(0, 90),
        h1,
        len: html.length,
        err,
      }),
    );
  } catch (e) {
    console.log(JSON.stringify({ p, error: String(e) }));
  }
}
