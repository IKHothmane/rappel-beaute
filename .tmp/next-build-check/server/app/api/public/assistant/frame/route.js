"use strict";(()=>{var e={};e.id=8335,e.ids=[8335,3895],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},84770:e=>{e.exports=require("crypto")},17702:e=>{e.exports=require("events")},98216:e=>{e.exports=require("net")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},8678:e=>{e.exports=import("pg")},45693:(e,t,n)=>{n.a(e,async(e,o)=>{try{n.r(t),n.d(t,{originalPathname:()=>f,patchFetch:()=>l,requestAsyncStorage:()=>p,routeModule:()=>d,serverHooks:()=>u,staticGenerationAsyncStorage:()=>m});var i=n(49303),a=n(88716),r=n(60670),s=n(44721),c=e([s]);s=(c.then?(await c)():c)[0];let d=new i.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/public/assistant/frame/route",pathname:"/api/public/assistant/frame",filename:"route",bundlePath:"app/api/public/assistant/frame/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\public\\assistant\\frame\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:p,staticGenerationAsyncStorage:m,serverHooks:u}=d,f="/api/public/assistant/frame/route";function l(){return(0,r.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:m})}o()}catch(e){o(e)}})},49303:(e,t,n)=>{e.exports=n(30517)},38238:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"ReflectAdapter",{enumerable:!0,get:function(){return n}});class n{static get(e,t,n){let o=Reflect.get(e,t,n);return"function"==typeof o?o.bind(e):o}static set(e,t,n,o){return Reflect.set(e,t,n,o)}static has(e,t){return Reflect.has(e,t)}static deleteProperty(e,t){return Reflect.deleteProperty(e,t)}}},95014:(e,t)=>{function n(e,t){let n;let o=e.split("/");return(t||[]).some(t=>!!o[1]&&o[1].toLowerCase()===t.toLowerCase()&&(n=t,o.splice(1,1),e=o.join("/")||"/",!0)),{pathname:e,detectedLocale:n}}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"normalizeLocalePath",{enumerable:!0,get:function(){return n}})},37847:(e,t)=>{function n(e){return e.replace(/\/$/,"")||"/"}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"removeTrailingSlash",{enumerable:!0,get:function(){return n}})},44721:(e,t,n)=>{n.a(e,async(e,o)=>{try{n.r(t),n.d(t,{GET:()=>s});var i=n(87070),a=n(42863),r=e([a]);async function s(e){let t=e.nextUrl.searchParams.get("publicId")?.trim()??"",n=(t?await (0,a.xI)(t):[]).map(e=>(0,a.wE)(e)).filter(e=>!!e),o=n.length>0?`frame-ancestors ${n.join(" ")}`:"frame-ancestors 'none'",r=`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rappel Beauty Assistant</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #fff7f8; color: #1f1a17; }
    main { min-height: 100vh; display: flex; flex-direction: column; }
    header { padding: 16px 18px 12px; background: #fff; border-bottom: 1px solid #f0dde9; }
    header p { margin: 0; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8b3a4a; }
    header h1 { margin: 4px 0 0; font-size: 20px; }
    header span { display: block; margin-top: 4px; font-family: system-ui, sans-serif; font-size: 13px; color: #6b635e; }
    section { flex: 1; padding: 18px; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; display: flex; flex-direction: column; gap: 14px; }
    .bubble { background: #fff; border-radius: 16px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(31,26,23,.06); }
    h2 { margin: 0 0 8px; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: #8b3a4a; }
    ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
    li { background: #fff; border-radius: 12px; padding: 10px 12px; }
    li strong { display: block; }
    li span { color: #6b635e; font-size: 12px; }
    button.slot, button.time, button.primary { border: 0; background: #f7e7ee; color: #8b3a4a; border-radius: 999px; padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer; }
    button.slot { margin-top: 8px; }
    button.primary { background: #8b3a4a; color: #fff; margin-top: 10px; }
    .times { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #6b635e; }
    input { border: 1px solid #f0dde9; border-radius: 10px; padding: 8px 10px; font: inherit; color: #1f1a17; }
    #proposal { font-size: 13px; }
    #chat { margin-top: 0; }
    #chat-log p { margin: 0 0 10px; white-space: pre-line; }
    footer { padding: 12px 16px 16px; font-family: system-ui, sans-serif; font-size: 12px; color: #6b635e; }
  </style>
</head>
<body>
  <main>
    <header>
      <p>Rappel Beauty</p>
      <h1>Assistant</h1>
      <span id="org">Connexion au widget…</span>
    </header>
    <section>
      <form id="chat">
        <div id="chat-log"></div>
        <label>Message <input id="chat-text" placeholder="Je veux une manucure lundi \xe0 9h" /></label>
        <button class="primary" type="submit">Envoyer</button>
      </form>
      <div class="bubble" id="message">Ouverture de la session…</div>
      <div id="catalog" hidden>
        <h2>Services</h2>
        <ul id="services"></ul>
        <h2>Produits</h2>
        <ul id="products"></ul>
        <h2>Promotions</h2>
        <ul id="promotions"></ul>
        <h2>Cr\xe9neaux</h2>
        <label>Date <input id="slot-date" type="date" /></label>
        <div id="slots" class="times"></div>
        <form id="booking" hidden>
          <h2>Rendez-vous</h2>
          <p id="booking-summary"></p>
          <label>Pr\xe9nom <input id="first-name" autocomplete="given-name" /></label>
          <label>Nom <input id="last-name" autocomplete="family-name" /></label>
          <label>T\xe9l\xe9phone <input id="phone" autocomplete="tel" /></label>
          <button class="primary" type="submit">Proposer le rendez-vous</button>
          <div id="proposal"></div>
        </form>
        <form id="manage-form">
          <h2>Mon rendez-vous</h2>
          <label>R\xe9f\xe9rence <input id="manage-ref" autocomplete="off" /></label>
          <label>T\xe9l\xe9phone <input id="manage-phone" autocomplete="tel" /></label>
          <button class="primary" type="submit">Voir mon rendez-vous</button>
          <div id="manage"></div>
        </form>
      </div>
    </section>
    <footer>Le rendez-vous n'est enregistr\xe9 qu'apr\xe8s confirmation.</footer>
  </main>
  <script>
    const publicId = ${JSON.stringify(t)};
    const message = document.getElementById("message");
    const org = document.getElementById("org");
    function show(text, name) {
      message.textContent = text;
      if (name) org.textContent = name;
    }
    window.parent.postMessage({ source: "rappel-assistant", type: "ready", publicId }, "*");
    window.addEventListener("message", async (event) => {
      const data = event.data || {};
      if (data.source !== "rappel-assistant" || event.source !== window.parent) return;
      if (data.type === "error") {
        show(data.message || "Ce site n'est pas autoris\xe9 \xe0 afficher l'assistant.");
        return;
      }
      if (data.type !== "session" || typeof data.token !== "string") return;
      const res = await fetch("/api/public/assistant/session/", {
        headers: { Authorization: "Bearer " + data.token },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body.error || "Session impossible.");
        return;
      }
      show("Bonjour. Voici le catalogue de l'institut.", body.organizationName || "Institut");
      document.body.dataset.token = data.token;
      await loadCatalog(data.token);
    });
    document.getElementById("chat").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("chat-text");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      const log = document.getElementById("chat-log");
      const mine = document.createElement("p");
      mine.textContent = text;
      log.appendChild(mine);
      const res = await fetch("/api/public/assistant/messages/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (document.body.dataset.token || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });
      const body = await res.json().catch(() => ({}));
      const reply = document.createElement("p");
      reply.textContent = body.reply || body.error || "Message impossible.";
      log.appendChild(reply);
    });
    function money(value) {
      return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value) + " DH";
    }
    function fill(list, items, render) {
      list.replaceChildren();
      if (!items.length) {
        const empty = document.createElement("li");
        empty.textContent = "Aucun \xe9l\xe9ment public.";
        list.appendChild(empty);
        return;
      }
      for (const item of items) list.appendChild(render(item));
    }
    async function loadCatalog(token) {
      const headers = { Authorization: "Bearer " + token };
      const [servicesRes, productsRes, promotionsRes] = await Promise.all([
        fetch("/api/public/assistant/services/", { headers }),
        fetch("/api/public/assistant/products/", { headers }),
        fetch("/api/public/assistant/promotions/", { headers }),
      ]);
      if (!servicesRes.ok) {
        show("Le catalogue de cet institut est indisponible.");
        return;
      }
      const services = await servicesRes.json();
      const products = productsRes.ok ? await productsRes.json() : { products: [] };
      const promotions = promotionsRes.ok ? await promotionsRes.json() : { promotions: [] };
      document.getElementById("catalog").hidden = false;
      const dateInput = document.getElementById("slot-date");
      if (!dateInput.value) {
        dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
      }
      fill(document.getElementById("services"), services.services || [], (item) => {
        const li = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = item.name;
        const meta = document.createElement("span");
        meta.textContent = item.durationMin + " min \xb7 " + money(item.price);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "slot";
        button.textContent = "Voir les cr\xe9neaux";
        button.addEventListener("click", () => showSlots(token, item.id, item.name));
        li.append(name, meta, button);
        return li;
      });
      fill(document.getElementById("products"), products.products || [], (item) => {
        const li = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = item.name;
        const meta = document.createElement("span");
        meta.textContent = money(item.salePrice);
        li.append(name, meta);
        return li;
      });
      fill(document.getElementById("promotions"), promotions.promotions || [], (item) => {
        const li = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = item.name;
        li.appendChild(name);
        return li;
      });
    }
    async function showSlots(token, serviceId, serviceName) {
      const dateInput = document.getElementById("slot-date");
      const date = dateInput.value;
      const box = document.getElementById("slots");
      box.replaceChildren();
      if (!date) {
        const note = document.createElement("span");
        note.textContent = "Choisissez une date.";
        box.appendChild(note);
        return;
      }
      const res = await fetch(
        "/api/public/assistant/availability/?serviceId=" +
          encodeURIComponent(serviceId) +
          "&date=" +
          encodeURIComponent(date),
        { headers: { Authorization: "Bearer " + token } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const note = document.createElement("span");
        note.textContent = body.error || "Cr\xe9neaux indisponibles.";
        box.appendChild(note);
        return;
      }
      const title = document.createElement("span");
      title.textContent = serviceName + " \xb7 " + date;
      box.appendChild(title);
      const times = (body.slots || []).map((slot) => slot.time);
      if (!times.length) {
        const note = document.createElement("span");
        note.textContent = "Aucun cr\xe9neau libre.";
        box.appendChild(note);
        return;
      }
      for (const time of times) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "time";
        chip.textContent = time;
        chip.addEventListener("click", () => selectSlot(token, serviceId, serviceName, date, time));
        box.appendChild(chip);
      }
    }
    function selectSlot(token, serviceId, serviceName, date, time) {
      const form = document.getElementById("booking");
      form.hidden = false;
      form.dataset.serviceId = serviceId;
      form.dataset.serviceName = serviceName;
      form.dataset.date = date;
      form.dataset.time = time;
      form.dataset.token = token;
      document.getElementById("booking-summary").textContent = serviceName + " \xb7 " + date + " \xb7 " + time;
      document.getElementById("proposal").replaceChildren();
    }
    document.getElementById("booking").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const proposal = document.getElementById("proposal");
      proposal.replaceChildren();
      const note = document.createElement("p");
      const key = form.dataset.idempotency || crypto.randomUUID();
      form.dataset.idempotency = key;
      const res = await fetch("/api/public/assistant/appointments/propose/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + form.dataset.token,
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          serviceId: form.dataset.serviceId,
          date: form.dataset.date,
          time: form.dataset.time,
          firstName: document.getElementById("first-name").value,
          lastName: document.getElementById("last-name").value,
          phone: document.getElementById("phone").value,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        note.textContent = body.error || "Proposition impossible.";
        proposal.appendChild(note);
        form.dataset.idempotency = "";
        return;
      }
      note.textContent = body.serviceName + " \xb7 " + body.date + " \xb7 " + body.time + " \xb7 " + body.price + " DH";
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "primary";
      confirm.textContent = "Confirmer le rendez-vous";
      confirm.addEventListener("click", () => confirmAppointment(form.dataset.token, body.actionId, proposal));
      proposal.append(note, confirm);
    });
    async function confirmAppointment(token, actionId, proposal) {
      const res = await fetch("/api/public/assistant/appointments/confirm/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionId }),
      });
      const body = await res.json().catch(() => ({}));
      proposal.replaceChildren();
      const note = document.createElement("p");
      note.textContent = res.ok
        ? "Rendez-vous enregistr\xe9 \xb7 " +
          body.serviceName +
          " \xb7 " +
          body.time +
          (body.reference ? " \xb7 R\xe9f\xe9rence " + body.reference : "")
        : body.error || "Confirmation impossible.";
      proposal.appendChild(note);
      if (res.ok && body.reference) {
        document.getElementById("manage-ref").value = body.reference;
        if (body.appointmentStatus !== "Annul\xe9") document.getElementById("manage-phone").value = document.getElementById("phone").value;
      }
    }
    document.getElementById("manage-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const box = document.getElementById("manage");
      box.replaceChildren();
      const token = document.body.dataset.token || "";
      const reference = document.getElementById("manage-ref").value;
      const phone = document.getElementById("manage-phone").value;
      const res = await fetch(
        "/api/public/assistant/appointments/?reference=" +
          encodeURIComponent(reference) +
          "&phone=" +
          encodeURIComponent(phone),
        { headers: { Authorization: "Bearer " + token } },
      );
      const body = await res.json().catch(() => ({}));
      const note = document.createElement("p");
      if (!res.ok) {
        note.textContent = body.error || "Rendez-vous introuvable.";
        box.appendChild(note);
        return;
      }
      const item = body.appointment;
      note.textContent = item.serviceName + " \xb7 " + item.date + " \xb7 " + item.time + " \xb7 " + item.status;
      box.appendChild(note);
      if (!item.manageable) return;
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "primary";
      cancel.textContent = "Annuler";
      cancel.addEventListener("click", () => proposeChange(token, "cancel", { reference, phone }, box));
      const move = document.createElement("button");
      move.type = "button";
      move.className = "slot";
      move.textContent = "D\xe9placer";
      move.addEventListener("click", async () => {
        const date = document.getElementById("slot-date").value;
        const slotsRes = await fetch(
          "/api/public/assistant/availability/?date=" +
            encodeURIComponent(date) +
            "&reference=" +
            encodeURIComponent(reference) +
            "&phone=" +
            encodeURIComponent(phone),
          { headers: { Authorization: "Bearer " + token } },
        );
        const slotsBody = await slotsRes.json().catch(() => ({}));
        box.replaceChildren(note);
        if (!slotsRes.ok || !(slotsBody.slots || []).length) {
          const empty = document.createElement("p");
          empty.textContent = slotsBody.error || "Aucun cr\xe9neau libre.";
          box.appendChild(empty);
          return;
        }
        for (const slot of slotsBody.slots) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "time";
          chip.textContent = slot.time;
          chip.addEventListener("click", () =>
            proposeChange(token, "reschedule", { reference, phone, date, time: slot.time }, box),
          );
          box.appendChild(chip);
        }
      });
      box.append(cancel, move);
    });
    async function proposeChange(token, kind, payload, box) {
      const path = kind === "cancel"
        ? "/api/public/assistant/appointments/cancel/"
        : "/api/public/assistant/appointments/reschedule/";
      const res = await fetch(path, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      box.replaceChildren();
      const note = document.createElement("p");
      if (!res.ok) {
        note.textContent = body.error || "Proposition impossible.";
        box.appendChild(note);
        return;
      }
      note.textContent = (kind === "cancel" ? "Annuler " : "D\xe9placer vers ") + body.date + " \xb7 " + body.time;
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "primary";
      confirm.textContent = "Confirmer";
      confirm.addEventListener("click", async () => {
        const done = await fetch("/api/public/assistant/appointments/confirm/", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ actionId: body.actionId }),
        });
        const result = await done.json().catch(() => ({}));
        box.replaceChildren();
        const line = document.createElement("p");
        line.textContent = done.ok
          ? (result.appointmentStatus === "Annul\xe9"
            ? "Rendez-vous annul\xe9 \xb7 " + result.reference
            : "Rendez-vous d\xe9plac\xe9 \xb7 " + result.time + " \xb7 " + result.reference)
          : result.error || "Confirmation impossible.";
        box.appendChild(line);
      });
      box.append(note, confirm);
    }
  </script>
</body>
</html>`;return new i.NextResponse(r,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":o,"Cache-Control":"no-store"}})}a=(r.then?(await r)():r)[0],o()}catch(e){o(e)}})},92110:(e,t,n)=>{function o(){let e=process.env.SESSION_SECRET;if(!e||e.length<32)throw Error("SESSION_SECRET must be set (min 32 chars) in production.");return e}function i(){let e=process.env.ENCRYPTION_KEY;if(!e||e.length<16)throw Error("ENCRYPTION_KEY must be set (min 16 chars) in production.");return e}n.d(t,{F:()=>o,m:()=>i})},42863:(e,t,n)=>{n.a(e,async(e,o)=>{try{n.d(t,{XD:()=>b,_I:()=>d,c4:()=>p,oU:()=>u,wE:()=>l,xI:()=>m});var i=n(84770),a=n(8678),r=n(66990),s=e([a]);let f=new(a=(s.then?(await s)():s)[0]).Pool({connectionString:process.env.DATABASE_URL});class b extends Error{constructor(e,t){super(e),this.code=t,this.name="AssistantSessionError"}}function c(e){return(0,i.createHash)("sha256").update(e).digest("hex")}function l(e){try{let t=new URL(e);if("https:"!==t.protocol&&"http:"!==t.protocol)return null;return t.origin}catch{return null}}async function d(e){let t=l(e.origin);if(!t)throw new b("Domaine refus\xe9.","ORIGIN_DENIED");if(!(await (0,r.Tv)([{key:`assistant:widget:ip:${e.ip}`,...r.GC.assistantWidget.ip,sensitivity:"sensitive"},{key:`assistant:widget:pub:${e.publicId}`,...r.GC.assistantWidget.widget,sensitivity:"sensitive"}])).allowed)throw new b("Trop de demandes.","RATE_LIMITED");let n=(await f.query(`SELECT id, "organizationId", status
     FROM "PublicWidget"
     WHERE "publicId" = $1`,[e.publicId])).rows[0];if(!n||"ACTIVE"!==n.status)throw new b("Widget introuvable.","WIDGET_NOT_FOUND");if(e.organizationId&&e.organizationId!==n.organizationId)throw new b("Institut non autoris\xe9.","CLIENT_AUTHORITY");let o=await f.query('SELECT 1 FROM "PublicWidgetOrigin" WHERE "widgetId" = $1 AND origin = $2',[n.id,t]);if(0===o.rowCount)throw new b("Domaine refus\xe9.","ORIGIN_DENIED");let a=(0,i.randomBytes)(32).toString("hex"),s=new Date(Date.now()+18e5);return await f.query(`INSERT INTO "AssistantWidgetSession" (id, "widgetId", "organizationId", "tokenHash", "expiresAt")
     VALUES ($1, $2, $3, $4, $5)`,[`wss_${(0,i.randomBytes)(8).toString("hex")}`,n.id,n.organizationId,c(a),s]),{token:a,organizationId:n.organizationId,expiresAt:s}}async function p(e){return(await f.query(`SELECT s.id, s."organizationId", o.name AS "organizationName"
     FROM "AssistantWidgetSession" s
     JOIN "Organization" o ON o.id = s."organizationId"
     WHERE s."tokenHash" = $1 AND s."expiresAt" > NOW()`,[c(e)])).rows[0]??null}async function m(e){return(await f.query(`SELECT o.origin
     FROM "PublicWidgetOrigin" o
     JOIN "PublicWidget" w ON w.id = o."widgetId"
     WHERE w."publicId" = $1 AND w.status = 'ACTIVE'`,[e])).rows.map(e=>e.origin)}let y="pub_preview";async function u(){let e=await f.query("SELECT id FROM \"Organization\" WHERE slug = 'institut-royal' LIMIT 1"),t=e.rows[0]?.id;if(!t)return;await f.query(`INSERT INTO "PublicWidget" (id, "organizationId", "publicId", name, status, "updatedAt")
     VALUES ('wdg_preview', $1, $2, 'Aper\xe7u assistant', 'ACTIVE', NOW())
     ON CONFLICT ("publicId") DO UPDATE SET status = 'ACTIVE', "updatedAt" = NOW()`,[t,y]);let n=await f.query('SELECT id FROM "PublicWidget" WHERE "publicId" = $1',[y]),o=n.rows[0]?.id;if(o)for(let e of["http://localhost:3000","http://127.0.0.1:3000","https://rappelbeauty.com","https://www.rappelbeauty.com"])await f.query(`INSERT INTO "PublicWidgetOrigin" (id, "widgetId", origin)
       VALUES ($1, $2, $3)
       ON CONFLICT ("widgetId", origin) DO NOTHING`,[`ori_${e.replace(/[^a-z0-9]/gi,"").slice(0,24)}`,o,e])}o()}catch(e){o(e)}})},43895:(e,t,n)=>{n.d(t,{k:()=>a});let o=new Set(["password","passwordHash","token","session","jwt","authorization","cookie","secret","database_url","databaseurl","apikey","api_key","s3_secret","pushtoken","authenticationtoken","signercert","signerkey"]);function i(e,t,n){let i=JSON.stringify({ts:new Date().toISOString(),level:e,message:t,...n?function e(t){if(null==t||"object"!=typeof t)return t;if(Array.isArray(t))return t.map(e);let n={};for(let[i,a]of Object.entries(t))o.has(i.toLowerCase())?n[i]="[REDACTED]":n[i]=e(a);return n}(n):{}});"error"===e?console.error(i):"warn"===e?console.warn(i):console.log(i)}let a={debug:(e,t)=>i("debug",e,t),info:(e,t)=>i("info",e,t),warn:(e,t)=>i("warn",e,t),error:(e,t)=>i("error",e,t)}},66990:(e,t,n)=>{n.d(t,{GC:()=>r,W6:()=>m,Tv:()=>p,Ug:()=>a.Ug,KP:()=>a.KP,lS:()=>a.lS,WQ:()=>u});var o=n(27045),i=n(43895),a=n(19703);let r={login:{ip:{limit:10,windowMs:9e5},account:{limit:10,windowMs:9e5},pair:{limit:10,windowMs:9e5}},forgotPassword:{ip:{limit:5,windowMs:36e5},account:{limit:3,windowMs:36e5}},activate:{ip:{limit:5,windowMs:9e5},token:{limit:5,windowMs:9e5}},signup:{ip:{limit:5,windowMs:36e5},account:{limit:3,windowMs:36e5}},changePassword:{user:{limit:10,windowMs:9e5},ip:{limit:20,windowMs:9e5}},booking:{ip:{limit:10,windowMs:6e5},phone:{limit:3,windowMs:36e5},pair:{limit:3,windowMs:36e5}},assistantWidget:{ip:{limit:30,windowMs:6e5},widget:{limit:60,windowMs:6e5}},productOrder:{ip:{limit:10,windowMs:6e5},phone:{limit:20,windowMs:36e5}},publicRead:{limit:120,windowMs:6e4},availability:{limit:60,windowMs:6e4},ai:{user:{limit:20,windowMs:6e4},ip:{limit:40,windowMs:6e4}}},s=new Map,c=new Map;async function l(e){let t=await (0,o.QY)();if(!t)return null;let n=`rl:${e.key}`,i=Math.ceil(e.windowMs/1e3),a=await t.multi().incr(n).expire(n,i,"NX").ttl(n).exec();if(!a)return null;let r=a[0],s=a[2];return r>e.limit?{allowed:!1,retryAfterSec:s>0?s:i}:{allowed:!0}}async function d(e){try{let t=await l(e);if(t)return t}catch(e){i.k.warn("rate limit redis error",{error:e instanceof Error?e.message:"unknown"})}return"sensitive"===e.sensitivity&&i.k.warn("rate limit redis down — fallback sensible",{keyPrefix:e.key.split(":")[0]}),function(e,t){let n=Date.now(),o=s.get(e.key);return!o||n>=o.resetAt?(s.set(e.key,{count:1,resetAt:n+e.windowMs}),{allowed:!0}):o.count>=t?{allowed:!1,retryAfterSec:Math.ceil((o.resetAt-n)/1e3)}:(o.count+=1,{allowed:!0})}(e,"sensitive"!==e.sensitivity?e.limit:Math.max(1,Math.ceil(e.limit/3)))}async function p(e){let t=null;for(let n of e){let e=await d(n);if(!e.allowed){let n=e.retryAfterSec??0;(!t||n>(t.retryAfterSec??0))&&(t=e)}}return t??{allowed:!0}}async function m(e,t){let n=`rl:idem:${e}`;try{let e=await (0,o.QY)();if(e){let o=await e.set(n,"1",{NX:!0,EX:t});return"OK"===o}}catch{}let i=Date.now(),a=c.get(e);return(!a||!(a>i))&&(c.set(e,i+1e3*t),!0)}async function u(e){c.delete(e);try{let t=await (0,o.QY)();t&&await t.del(`rl:idem:${e}`)}catch{}}},19703:(e,t,n)=>{n.d(t,{KP:()=>a,Ug:()=>r,lS:()=>s});var o=n(84770),i=n(92110);function a(e){return(0,o.createHmac)("sha256",(0,i.F)()).update(e).digest("hex").slice(0,32)}function r(e){return a(e.trim().toLowerCase())}function s(e){return a(e.replace(/\D/g,"").slice(-9)||"unknown")}},27045:(e,t,n)=>{n.d(t,{QY:()=>s,XC:()=>c});var o=n(79984),i=n(43895);let a=null,r=null;async function s(){let e=process.env.REDIS_URL;return e?a?.isOpen?a:(r||(r=(async()=>{try{let t=(0,o.createClient)({url:e,socket:{connectTimeout:3e3,reconnectStrategy:!1}});return t.on("error",e=>{i.k.warn("Redis client error",{error:String(e)})}),await t.connect(),a=t}catch(e){return i.k.warn("Redis unavailable — fallback m\xe9moire",{error:String(e)}),null}finally{r=null}})()),r):null}async function c(){try{let e=await s();if(!e)return!1;let t=await e.ping();return"PONG"===t}catch{return!1}}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),o=t.X(0,[8948,7070,9984],()=>n(45693));module.exports=o})();