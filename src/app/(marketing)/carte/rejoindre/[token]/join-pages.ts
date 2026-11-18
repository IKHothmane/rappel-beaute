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
.eyebrow{margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8A4466}
h1{margin:8px 0 12px;font-family:Georgia,"Times New Roman",serif;font-size:1.5rem;font-weight:600;line-height:1.25;letter-spacing:-.01em;color:#3A2533;overflow-wrap:anywhere}
p{margin:0 0 8px;font-size:1rem;color:#5E4A56;overflow-wrap:anywhere}
.hint{font-size:.9375rem;color:#6B5763}
.btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;margin-top:20px;padding:12px 20px;border-radius:14px;background:#A83E70;color:#fff;font-size:1rem;font-weight:700;text-decoration:none}
.btn:hover{background:#8F3360}
a:focus-visible{outline:3px solid #3A2533;outline-offset:3px}
`;

const ICONS = {
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  pause: '<circle cx="12" cy="12" r="10"/><path d="M10 15V9"/><path d="M14 15V9"/>',
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


function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function enrollmentPage({ token, organizationName }: { token: string; organizationName: string }) {
  return htmlDocument({
    head: '<style>[hidden]{display:none!important}form{margin-top:20px;text-align:left}fieldset{margin:0 0 16px;padding:0;border:0}label{display:block;margin-bottom:12px;font-weight:650}input:not([type=radio]){display:block;width:100%;min-height:44px;margin-top:4px;padding:8px;border:1px solid #815567;border-radius:8px;color:inherit;font:inherit}button{cursor:pointer}button.btn{width:100%;border:0;font:inherit;font-weight:700}button:disabled{opacity:.6;cursor:wait}button.subtle{margin:12px 0 0;padding:8px;border:0;background:none;color:#883258;font:inherit;text-decoration:underline}button:focus-visible,input:focus-visible{outline:3px solid #A83E70;outline-offset:3px}#notice:not(:empty){margin-top:12px;background:#FFF0F4;padding:8px;border-radius:8px}output{display:block;margin:8px 0 14px;font:700 clamp(1.2rem,7vw,2rem) ui-monospace,monospace;overflow-wrap:anywhere}</style>',
    body: `<main>
<p class="eyebrow">${escapeHtml(organizationName)}</p>
<h1>Votre carte de fidélité</h1>
<p>Présentez votre demande à l’équipe de l’institut pour qu’elle vérifie votre identité.</p>
<noscript><p>Activez JavaScript pour envoyer une demande depuis ce navigateur.</p></noscript>
<form id="request" data-token="${escapeHtml(token)}" hidden>
  <fieldset>
    <legend>Votre démarche</legend>
    <label><input name="mode" type="radio" value="enroll" checked> Créer ma carte</label>
    <label><input name="mode" type="radio" value="recover"> Retrouver ma carte</label>
  </fieldset>
  <label>Prénom <input name="firstName" autocomplete="given-name" maxlength="80" required></label>
  <label>Nom <input name="lastName" autocomplete="family-name" maxlength="80" required></label>
  <label>Téléphone <input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" required></label>
  <label id="marketing"><input name="marketingWhatsappConsent" type="checkbox"> J’accepte de recevoir les offres de l’institut sur WhatsApp.</label>
  <button class="btn" type="submit">Obtenir un code de vérification</button>
</form>
<section id="pending" hidden>
  <h2 id="pending-title" tabindex="-1">Montrez ce code à l’équipe</h2>
  <output id="code" aria-labelledby="pending-title"></output>
  <p>Après validation, ouvrez votre carte depuis ce même navigateur.</p>
</section>
<button class="subtle" id="claim" type="button" hidden>Ouvrir ma carte après validation</button>
<button class="subtle" id="restart" type="button" hidden>Faire une nouvelle demande</button>
<p id="notice" role="status" aria-live="polite"></p>
<script>
(function () {
  var form = document.getElementById("request");
  var pending = document.getElementById("pending");
  var start = form.querySelector("button");
  var claim = document.getElementById("claim");
  var restart = document.getElementById("restart");
  var notice = document.getElementById("notice");
  var marketing = document.getElementById("marketing");
  if (new URLSearchParams(window.location.search).get("mode") === "recover") {
    form.querySelector('[value="recover"]').checked = true;
  }
  form.hidden = claim.hidden = false;
  function updateConsent() {
    marketing.hidden = form.querySelector('[value="recover"]').checked;
  }
  form.addEventListener("change", updateConsent);
  updateConsent();

  async function post(body) {
    notice.textContent = "";
    start.disabled = claim.disabled = restart.disabled = true;
    try {
      var response = await fetch("/api/public/loyalty-join/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign(body, { token: form.dataset.token }))
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Demande impossible.");
      return data;
    } catch (error) {
      notice.textContent = error.message || "Réessayez dans un instant.";
      return null;
    } finally {
      start.disabled = claim.disabled = restart.disabled = false;
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var fields = Object.fromEntries(new FormData(form));
    fields.marketingWhatsappConsent = !marketing.hidden && Boolean(fields.marketingWhatsappConsent);
    var data = await post(Object.assign(fields, { action: "request" }));
    if (!data || typeof data.code !== "string") return;
    document.getElementById("code").textContent = data.code;
    form.hidden = true;
    pending.hidden = restart.hidden = false;
    document.getElementById("pending-title").focus();
  });
  claim.addEventListener("click", async function () {
    var data = await post({ action: "claim" });
    if (data && /^\\/carte\\/RBLOY_[A-Z2-9]{8,32}\\/$/.test(data.cardPath)) location.replace(data.cardPath);
  });
  restart.addEventListener("click", function () {
    form.hidden = false;
    pending.hidden = restart.hidden = true;
    notice.textContent = "";
    form.querySelector('input:checked').focus();
  });
})();
</script></main>`,
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
