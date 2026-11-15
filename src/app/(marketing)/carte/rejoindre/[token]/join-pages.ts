/**
 * Pages HTML légères renvoyées par /carte/rejoindre/[token] (scan du QR de l'institut).
 * Pas de dépendance JS, pas de police distante : une scan = une page qui s'affiche tout de suite.
 * Aucun texte venant de la requête n'est injecté dans le HTML (seul un nombre de minutes est calculé).
 */

const STYLE = `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:linear-gradient(180deg,#FFF8FC 0%,#FFEDF5 100%);color:#3A2533;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.5}
main{width:100%;max-width:26rem;padding:32px 24px;text-align:center;background:#fff;border:1px solid #EFC9DB;border-radius:24px;box-shadow:0 12px 32px rgba(144,0,55,.08)}
.badge{display:flex;align-items:center;justify-content:center;width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:#FCE9F2;color:#A83E70}
.badge svg{width:32px;height:32px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.spin{width:44px;height:44px;border-radius:50%;border:4px solid #F5D3E3;border-top-color:#A83E70;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.eyebrow{margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8A4466}
h1{margin:8px 0 12px;font-family:Georgia,"Times New Roman",serif;font-size:1.5rem;font-weight:600;line-height:1.25;letter-spacing:-.01em;color:#3A2533;overflow-wrap:anywhere}
p{margin:0 0 8px;font-size:1rem;color:#5E4A56;overflow-wrap:anywhere}
.hint{font-size:.9375rem;color:#6B5763}
.btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;margin-top:20px;padding:12px 20px;border-radius:14px;background:#A83E70;color:#fff;font-size:1rem;font-weight:700;text-decoration:none}
.btn:hover{background:#8F3360}
a:focus-visible{outline:3px solid #3A2533;outline-offset:3px}
@media (prefers-reduced-motion:reduce){.spin{animation:none;border-top-color:#A83E70;border-right-color:#A83E70}}
`;

const ICONS = {
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  pause: '<circle cx="12" cy="12" r="10"/><path d="M10 15V9"/><path d="M14 15V9"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
} as const;

function htmlDocument(opts: { head?: string; body: string }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#FFF8FC">
<title>Ma carte de fidélité</title>
<style>${STYLE}</style>${opts.head ?? ""}</head>
<body>${opts.body}</body></html>`;
}

/** Page intermédiaire : envoie les cartes mémorisées par le navigateur, sinon demande une nouvelle carte. */
export const RESOLVE_PAGE = htmlDocument({
  head: '<noscript><meta http-equiv="refresh" content="0;url=?n=1"></noscript>',
  body: `<main role="status" aria-live="polite">
<div class="badge" aria-hidden="true"><div class="spin"></div></div>
<p class="eyebrow">Carte de fidélité</p>
<h1>Chargement de votre carte…</h1>
<p class="hint">Cela ne prend que quelques secondes.</p>
<noscript><p>Votre navigateur n’exécute pas les scripts.</p><a class="btn" href="?n=1">Ouvrir ma carte</a></noscript>
<script>
(function () {
  var list = [];
  try { list = JSON.parse(localStorage.getItem("rb_cards") || "[]"); } catch (e) {}
  if (!Array.isArray(list)) list = [];
  list = list.filter(function (t) { return typeof t === "string" && /^RBLOY_[A-Z2-9]{8,32}$/.test(t); }).slice(0, 5);
  location.replace(list.length ? "?c=" + encodeURIComponent(list.join(",")) : "?n=1");
})();
</script></main>`,
});

function errorPage(opts: {
  icon: keyof typeof ICONS;
  title: string;
  lines: string[];
  retry?: boolean;
}) {
  return htmlDocument({
    body: `<main>
<div class="badge" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${ICONS[opts.icon]}</svg></div>
<p class="eyebrow">Carte de fidélité</p>
<h1>${opts.title}</h1>
${opts.lines.map((line, index) => `<p${index > 0 ? ' class="hint"' : ""}>${line}</p>`).join("\n")}
${opts.retry ? '<a class="btn" href="?">Réessayer</a>' : ""}
</main>`,
  });
}

export const INVALID_QR_PAGE = errorPage({
  icon: "help",
  title: "Ce QR n’est plus valable",
  lines: [
    "Le QR code que vous avez scanné a peut-être été remplacé par l’institut.",
    "Demandez à l’équipe de vous montrer le QR de fidélité actuel, puis scannez-le à nouveau.",
  ],
});

export const PROGRAM_DISABLED_PAGE = errorPage({
  icon: "pause",
  title: "Le programme de fidélité est en pause",
  lines: [
    "L’institut n’accepte pas de nouvelles cartes pour le moment.",
    "Si vous avez déjà une carte, vos passages sont conservés. Renseignez-vous auprès de l’équipe.",
  ],
});

export const TECHNICAL_ERROR_PAGE = errorPage({
  icon: "alert",
  title: "Impossible de créer votre carte",
  lines: [
    "Un problème technique est survenu. Votre carte n’a pas été perdue.",
    "Réessayez dans un instant. Si le problème continue, demandez de l’aide à l’équipe de l’institut.",
  ],
  retry: true,
});

export function waitLabel(retryAfterSec: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  if (minutes < 60) return `dans ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  return `dans environ ${hours} h`;
}

export function tooManyRequestsPage(retryAfterSec: number) {
  return errorPage({
    icon: "clock",
    title: "Trop de demandes pour le moment",
    lines: [
      `Merci de patienter, vous pourrez réessayer <strong>${waitLabel(retryAfterSec)}</strong>.`,
      "Si vous avez déjà une carte, ouvrez-la directement depuis votre téléphone ou demandez à l’équipe de l’institut.",
    ],
  });
}
