/**
 * Pages HTML légères renvoyées par /carte/rejoindre/[token] (scan du QR de l'institut).
 * Pas de dépendance JS, pas de police distante : une scan = une page qui s'affiche tout de suite.
 * Aucun texte venant de la requête n'est injecté dans le HTML (seul un nombre de minutes est calculé).
 */

const STYLE = `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px 16px;background:radial-gradient(120% 60% at 50% 0%,#FFE0EE 0%,rgba(255,224,238,0) 70%),linear-gradient(180deg,#FFF8FC 0%,#FFEDF5 100%);color:#3A2533;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.5}
main{position:relative;width:100%;max-width:26rem;padding:32px 24px 28px;text-align:center;background:#fff;border:1px solid #EFC9DB;border-radius:28px;box-shadow:0 18px 40px rgba(144,0,55,.10)}
.badge{display:flex;align-items:center;justify-content:center;width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:#FCE9F2;color:#A83E70}
.badge svg{width:32px;height:32px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.eyebrow{margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8A4466;overflow-wrap:anywhere}
h1{margin:8px 0 12px;font-family:Georgia,"Times New Roman",serif;font-size:1.5rem;font-weight:600;line-height:1.25;letter-spacing:-.01em;color:#3A2533;overflow-wrap:anywhere}
p{margin:0 0 8px;font-size:1rem;color:#5E4A56;overflow-wrap:anywhere}
.hint{font-size:.9375rem;color:#6B5763}
.btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;margin-top:20px;padding:12px 20px;border-radius:16px;background:linear-gradient(150deg,#C04A80,#A83E70);color:#fff;font-size:1rem;font-weight:700;text-decoration:none;box-shadow:0 8px 18px rgba(168,62,112,.28)}
.btn:hover{background:#8F3360}
a:focus-visible{outline:3px solid #3A2533;outline-offset:3px}
.foot{max-width:26rem;margin:0;font-size:.8125rem;text-align:center;color:#7A6270}
.foot a{color:#8A3A62}
@media (prefers-reduced-motion:no-preference){main{animation:rise .35s ease-out}@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}
`;

const ICONS = {
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  pause: '<circle cx="12" cy="12" r="10"/><path d="M10 15V9"/><path d="M14 15V9"/>',
  alert:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 15h4"/>',
} as const;

const FOOTER =
  '<p class="foot">Propulsé par Rappel Beauty · <a href="/confidentialite/" rel="noopener">Confidentialité</a></p>';

function htmlDocument(opts: { head?: string; body: string }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#FFF8FC">
<title>Ma carte de fidélité</title>
<style>${STYLE}</style>${opts.head ?? ""}</head>
<body>${opts.body}${FOOTER}</body></html>`;
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

const ENROLLMENT_STYLE = `[hidden]{display:none!important}
.lead{margin:0 0 4px;font-size:1rem}
.steps{display:flex;align-items:center;justify-content:center;gap:8px;margin:18px 0 4px;padding:0;list-style:none;font-size:.8125rem;color:#7A6270}
.steps li{display:flex;align-items:center;gap:6px}
.steps li+li::before{content:"";width:18px;height:2px;border-radius:2px;background:#EFC9DB}
.steps b{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#F7E3EC;color:#8A3A62;font-size:.75rem}
main[data-step="1"] .steps li:nth-child(1),main[data-step="2"] .steps li:nth-child(2){color:#3A2533;font-weight:700}
main[data-step="1"] .steps li:nth-child(1) b,main[data-step="2"] .steps li:nth-child(2) b{background:#A83E70;color:#fff}
form{margin-top:18px;text-align:left}
fieldset{margin:0 0 16px;padding:0;border:0}
legend{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:#FBEFF4}
.seg label{margin:0;font-weight:650}
.seg input{position:absolute;opacity:0;pointer-events:none}
.seg span{display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px;border-radius:11px;text-align:center;font-size:.9375rem;color:#6B5763;cursor:pointer}
.seg input:checked+span{background:#fff;color:#3A2533;box-shadow:0 2px 8px rgba(144,0,55,.14)}
.seg input:focus-visible+span{outline:3px solid #A83E70;outline-offset:2px}
.field{display:block;margin-bottom:14px;font-weight:650;font-size:.9375rem;color:#3A2533}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
input:not([type=radio]):not([type=checkbox]){display:block;width:100%;min-height:50px;margin-top:6px;padding:10px 14px;border:1.5px solid #D9B7C7;border-radius:14px;background:#fff;color:#3A2533;font:inherit;font-size:1rem;font-weight:400}
input::placeholder{color:#A58B99}
input:not([type=radio]):not([type=checkbox]):focus{border-color:#A83E70;outline:3px solid rgba(168,62,112,.22);outline-offset:0}
.help{display:block;margin-top:4px;font-size:.8125rem;font-weight:400;color:#7A6270}
.consent{display:flex;align-items:flex-start;gap:10px;margin:2px 0 16px;padding:12px;border-radius:14px;background:#FFF5F9;border:1px solid #F3D6E4;font-size:.875rem;font-weight:400;color:#5E4A56;cursor:pointer}
.consent input{flex:none;width:20px;height:20px;margin:2px 0 0;accent-color:#A83E70}
button{cursor:pointer}
button.btn{width:100%;margin-top:4px;border:0;font:inherit;font-weight:700}
button:disabled{opacity:.6;cursor:wait}
button.subtle{margin:12px 0 0;padding:10px;border:0;background:none;color:#883258;font:inherit;font-size:.9375rem;text-decoration:underline}
button:focus-visible,input:focus-visible{outline:3px solid #A83E70;outline-offset:3px}
#notice:not(:empty){margin-top:14px;padding:10px 12px;border-radius:12px;background:#FFF0F4;border:1px solid #F5C6D6;color:#8A1F4A;font-size:.9375rem;text-align:left}
#pending{margin-top:18px}
#pending h2{margin:0 0 10px;font-family:Georgia,"Times New Roman",serif;font-size:1.25rem;color:#3A2533}
.codebox{padding:18px 12px;margin:8px 0 12px;border:2px dashed #D98BB0;border-radius:18px;background:#FFF5F9}
output{display:block;margin:0;font:700 clamp(1.35rem,8vw,2.1rem) ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:#8F2F5C;overflow-wrap:anywhere}
.copy{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin-top:10px;padding:8px 18px;border:1.5px solid #D98BB0;border-radius:999px;background:#fff;color:#8F2F5C;font:inherit;font-size:.9375rem;font-weight:700}
.next{margin:16px 0 0;padding:0;list-style:none;text-align:left;font-size:.9375rem;color:#5E4A56}
.next li{display:flex;gap:10px;margin-bottom:8px}
.next li::before{content:"✓";flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#F7E3EC;color:#8A3A62;font-size:.75rem;font-weight:700}
`;

export function enrollmentPage({ token, organizationName }: { token: string; organizationName: string }) {
  return htmlDocument({
    head: `<style>${ENROLLMENT_STYLE}</style>`,
    body: `<main data-step="1">
<div class="badge" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${ICONS.card}</svg></div>
<p class="eyebrow">${escapeHtml(organizationName)}</p>
<h1>Votre carte de fidélité</h1>
<p class="lead">Gardez vos passages et vos avantages dans une carte sur votre téléphone. Aucun mot de passe à retenir.</p>
<ol class="steps" aria-label="Étapes">
  <li><b>1</b> Vos infos</li>
  <li><b>2</b> Code à montrer</li>
  <li><b>3</b> Votre carte</li>
</ol>
<noscript><p>Activez JavaScript pour envoyer une demande depuis ce navigateur.</p></noscript>
<form id="request" data-token="${escapeHtml(token)}" hidden>
  <fieldset class="seg">
    <legend>Votre démarche</legend>
    <label><input name="mode" type="radio" value="enroll" checked><span>Créer ma carte</span></label>
    <label><input name="mode" type="radio" value="recover"><span>Retrouver ma carte</span></label>
  </fieldset>
  <div class="row">
    <label class="field">Prénom <input name="firstName" autocomplete="given-name" maxlength="80" placeholder="Sara" required></label>
    <label class="field">Nom <input name="lastName" autocomplete="family-name" maxlength="80" placeholder="Alami" required></label>
  </div>
  <label class="field">Téléphone (WhatsApp) <input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="06 12 34 56 78" required><span class="help">Le numéro que l’institut a déjà pour vous, ou celui que vous utilisez.</span></label>
  <label class="consent" id="marketing"><input name="marketingWhatsappConsent" type="checkbox"><span>J’accepte de recevoir les offres de l’institut sur WhatsApp. (facultatif)</span></label>
  <button class="btn" type="submit">Obtenir mon code de vérification</button>
</form>
<section id="pending" hidden>
  <h2 id="pending-title" tabindex="-1">Montrez ce code à l’équipe</h2>
  <div class="codebox">
    <output id="code" aria-labelledby="pending-title"></output>
    <button class="copy" id="copy" type="button">Copier le code</button>
  </div>
  <ul class="next">
    <li>L’équipe vérifie votre identité et valide le code.</li>
    <li>Revenez ensuite sur cette page et ouvrez votre carte, depuis ce même navigateur.</li>
  </ul>
  <button class="btn" id="claim-main" type="button">J’ai fait valider mon code : ouvrir ma carte</button>
</section>
<button class="subtle" id="claim" type="button" hidden>J’ai déjà fait valider mon code</button>
<button class="subtle" id="restart" type="button" hidden>Faire une nouvelle demande</button>
<p id="notice" role="status" aria-live="polite"></p>
<script>
(function () {
  var root = document.querySelector("main");
  var form = document.getElementById("request");
  var pending = document.getElementById("pending");
  var start = form.querySelector("button");
  var claim = document.getElementById("claim");
  var claimMain = document.getElementById("claim-main");
  var restart = document.getElementById("restart");
  var copy = document.getElementById("copy");
  var notice = document.getElementById("notice");
  var marketing = document.getElementById("marketing");
  if (new URLSearchParams(window.location.search).get("mode") === "recover") {
    form.querySelector('[value="recover"]').checked = true;
  }
  form.hidden = claim.hidden = false;
  function updateConsent() {
    marketing.hidden = form.querySelector('[value="recover"]').checked;
    start.textContent = form.querySelector('[value="recover"]').checked
      ? "Obtenir mon code pour retrouver ma carte"
      : "Obtenir mon code de vérification";
  }
  form.addEventListener("change", updateConsent);
  updateConsent();

  function lock(value) {
    start.disabled = claim.disabled = claimMain.disabled = restart.disabled = value;
  }

  async function post(body) {
    notice.textContent = "";
    lock(true);
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
      lock(false);
    }
  }

  async function open() {
    var data = await post({ action: "claim" });
    if (data && /^\\/carte\\/RBLOY_[A-Z2-9]{8,32}\\/$/.test(data.cardPath)) location.replace(data.cardPath);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var fields = Object.fromEntries(new FormData(form));
    fields.marketingWhatsappConsent = !marketing.hidden && Boolean(fields.marketingWhatsappConsent);
    var data = await post(Object.assign(fields, { action: "request" }));
    if (!data || typeof data.code !== "string") return;
    document.getElementById("code").textContent = data.code;
    form.hidden = true;
    claim.hidden = true;
    root.dataset.step = "2";
    pending.hidden = restart.hidden = false;
    document.getElementById("pending-title").focus();
  });
  claim.addEventListener("click", open);
  claimMain.addEventListener("click", open);
  copy.addEventListener("click", function () {
    var code = document.getElementById("code").textContent || "";
    if (!code || !navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(function () {
      copy.textContent = "Code copié ✓";
      setTimeout(function () { copy.textContent = "Copier le code"; }, 2000);
    }, function () {});
  });
  restart.addEventListener("click", function () {
    form.hidden = claim.hidden = false;
    pending.hidden = restart.hidden = true;
    root.dataset.step = "1";
    notice.textContent = "";
    form.querySelector('input:checked').focus();
  });
})();
</script></main>`,
  });
}

const DIRECT_STYLE = `[hidden]{display:none!important}
.lead{margin:0 0 4px;font-size:1rem}
form{margin-top:18px;text-align:left}
.field{display:block;margin-bottom:14px;font-weight:650;font-size:.9375rem;color:#3A2533}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
input:not([type=checkbox]){display:block;width:100%;min-height:50px;margin-top:6px;padding:10px 14px;border:1.5px solid #D9B7C7;border-radius:14px;background:#fff;color:#3A2533;font:inherit;font-size:1rem;font-weight:400}
input::placeholder{color:#A58B99}
input:not([type=checkbox]):focus{border-color:#A83E70;outline:3px solid rgba(168,62,112,.22);outline-offset:0}
.help{display:block;margin-top:4px;font-size:.8125rem;font-weight:400;color:#7A6270}
.consent{display:flex;align-items:flex-start;gap:10px;margin:2px 0 16px;padding:12px;border-radius:14px;background:#FFF5F9;border:1px solid #F3D6E4;font-size:.875rem;font-weight:400;color:#5E4A56;cursor:pointer}
.consent input{flex:none;width:20px;height:20px;min-height:0;margin:2px 0 0;accent-color:#A83E70}
button.btn{width:100%;margin-top:4px;border:0;font:inherit;font-weight:700;cursor:pointer}
button:disabled{opacity:.6;cursor:wait}
button:focus-visible,input:focus-visible{outline:3px solid #A83E70;outline-offset:3px}
#notice:not(:empty){margin-top:14px;padding:10px 12px;border-radius:12px;background:#FFF0F4;border:1px solid #F5C6D6;color:#8A1F4A;font-size:.9375rem;text-align:left}
.subtle{display:inline-block;margin-top:14px;padding:10px;color:#883258;font-size:.9375rem}
#known{margin-top:14px;text-align:left}
#known .btn{margin-top:10px}
`;

/**
 * Page affichée au scan quand l'appareil n'a pas encore de carte : la cliente remplit son profil (prénom, nom,
 * téléphone), la carte est créée aussitôt et s'ouvre, sans code ni passage par l'équipe. Un numéro déjà connu de
 * l'institut n'est jamais rattaché ici : la page renvoie alors vers « Retrouver ma carte » (validation par l'équipe).
 */
export function directEnrollPage({ token, organizationName }: { token: string; organizationName: string }) {
  return htmlDocument({
    head: `<style>${DIRECT_STYLE}</style>`,
    body: `<main>
<div class="badge" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${ICONS.card}</svg></div>
<p class="eyebrow">${escapeHtml(organizationName)}</p>
<h1>Créez votre carte de fidélité</h1>
<p class="lead">Renseignez vos informations : votre carte s’ouvre aussitôt.</p>
<noscript><p>Activez JavaScript pour créer votre carte, ou demandez de l’aide à l’équipe de l’institut.</p></noscript>
<form id="request" data-token="${escapeHtml(token)}" hidden>
  <div class="row">
    <label class="field">Prénom <input name="firstName" autocomplete="given-name" maxlength="40" minlength="2" data-kind="name" placeholder="Sara" required></label>
    <label class="field">Nom <input name="lastName" autocomplete="family-name" maxlength="40" minlength="2" data-kind="name" placeholder="Alami" required></label>
  </div>
  <label class="field">Téléphone (WhatsApp) <input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" minlength="8" pattern="[0-9]{8,10}" title="8 à 10 chiffres, sans espace" placeholder="0612345678" required><span class="help">10 chiffres maximum, sans espace.</span></label>
  <label class="consent"><input name="marketingWhatsappConsent" type="checkbox"><span>J’accepte de recevoir les offres de l’institut sur WhatsApp. (facultatif)</span></label>
  <button class="btn" type="submit">Créer ma carte</button>
</form>
<p id="notice" role="status" aria-live="polite"></p>
<p class="hint">Déjà cliente ? Saisissez le même numéro de téléphone : votre carte s’ouvre.</p>
<script>
(function () {
  var form = document.getElementById("request");
  var button = form.querySelector("button");
  var notice = document.getElementById("notice");
  var busy = false;
  form.hidden = false;
  var phone = form.elements.phone;
  // Téléphone : chiffres uniquement, 10 maximum. Un numéro collé en +212 / 00212 devient 0XXXXXXXXX.
  function cleanPhone(value) {
    var digits = String(value).replace(/\\D/g, "");
    if (digits.indexOf("00212") === 0) digits = "0" + digits.slice(5);
    else if (digits.indexOf("212") === 0 && digits.length >= 12) digits = "0" + digits.slice(3);
    return digits.slice(0, 10);
  }
  phone.addEventListener("input", function () {
    var cleaned = cleanPhone(phone.value);
    if (phone.value !== cleaned) phone.value = cleaned;
  });
  // Prénom et nom : lettres, espace, apostrophe et tiret seulement (40 caractères maximum).
  Array.prototype.forEach.call(form.querySelectorAll('[data-kind="name"]'), function (input) {
    input.addEventListener("input", function () {
      var cleaned = input.value.replace(/[^\\p{L}\\p{M} '’-]/gu, "").replace(/\\s{2,}/g, " ").slice(0, 40);
      if (input.value !== cleaned) input.value = cleaned;
    });
  });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    button.disabled = true;
    notice.textContent = "";
    try {
      var fields = Object.fromEntries(new FormData(form));
      fields.marketingWhatsappConsent = Boolean(fields.marketingWhatsappConsent);
      var response = await fetch("/api/public/loyalty-join/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign(fields, { action: "enroll", token: form.dataset.token }))
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de créer votre carte.");
      if (/^\\/carte\\/RBLOY_[A-Z2-9]{8,32}\\/$/.test(data.cardPath)) { location.replace(data.cardPath); return; }
      throw new Error("Impossible de créer votre carte.");
    } catch (error) {
      notice.textContent = error.message || "Réessayez dans un instant.";
    } finally {
      busy = false;
      button.disabled = false;
    }
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
