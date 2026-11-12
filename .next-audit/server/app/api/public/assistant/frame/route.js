!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},t=(new e.Error).stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="50bfae27-bd01-4e95-83cf-3705d981a8a5",e._sentryDebugIdIdentifier="sentry-dbid-50bfae27-bd01-4e95-83cf-3705d981a8a5")}catch(e){}}(),(()=>{var e={};e.id=8335,e.ids=[8335],e.modules={80613:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=80613,e.exports=t},14464:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=14464,e.exports=t},8541:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=8541,e.exports=t},12308:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=12308,e.exports=t},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61212:e=>{"use strict";e.exports=require("async_hooks")},61282:e=>{"use strict";e.exports=require("child_process")},84770:e=>{"use strict";e.exports=require("crypto")},27920:e=>{"use strict";e.exports=require("diagnostics_channel")},17702:e=>{"use strict";e.exports=require("events")},92048:e=>{"use strict";e.exports=require("fs")},85807:e=>{"use strict";e.exports=require("module")},98216:e=>{"use strict";e.exports=require("net")},19801:e=>{"use strict";e.exports=require("os")},55315:e=>{"use strict";e.exports=require("path")},96119:e=>{"use strict";e.exports=require("perf_hooks")},35816:e=>{"use strict";e.exports=require("process")},74026:e=>{"use strict";e.exports=require("string_decoder")},82452:e=>{"use strict";e.exports=require("tls")},74175:e=>{"use strict";e.exports=require("tty")},17360:e=>{"use strict";e.exports=require("url")},21764:e=>{"use strict";e.exports=require("util")},6162:e=>{"use strict";e.exports=require("worker_threads")},8678:e=>{"use strict";e.exports=import("pg")},92761:e=>{"use strict";e.exports=require("node:async_hooks")},17718:e=>{"use strict";e.exports=require("node:child_process")},92110:e=>{"use strict";e.exports=require("node:diagnostics_channel")},87561:e=>{"use strict";e.exports=require("node:fs")},88849:e=>{"use strict";e.exports=require("node:http")},22286:e=>{"use strict";e.exports=require("node:https")},85690:e=>{"use strict";e.exports=require("node:inspector")},87503:e=>{"use strict";e.exports=require("node:net")},70612:e=>{"use strict";e.exports=require("node:os")},49411:e=>{"use strict";e.exports=require("node:path")},51747:e=>{"use strict";e.exports=require("node:readline")},84492:e=>{"use strict";e.exports=require("node:stream")},31764:e=>{"use strict";e.exports=require("node:tls")},47261:e=>{"use strict";e.exports=require("node:util")},24086:e=>{"use strict";e.exports=require("node:worker_threads")},65628:e=>{"use strict";e.exports=require("node:zlib")},70769:(e,t,n)=>{"use strict";n.a(e,async(e,o)=>{try{n.r(t),n.d(t,{DELETE:()=>x,GET:()=>y,HEAD:()=>w,OPTIONS:()=>v,PATCH:()=>g,POST:()=>h,PUT:()=>b});var r=n(98930),i=n(21967),a=n(54580),s=n(46485),c=n(91604),d=n(73575),l=e([c]);c=(l.then?(await l)():l)[0];let p=(0,d.Pd)(async function(e){let t=e.nextUrl.searchParams.get("publicId")?.trim()??"",n=(t?await (0,c.xI)(t):[]).map(e=>(0,c.wE)(e)).filter(e=>!!e),o=n.length>0?`frame-ancestors ${n.join(" ")}`:"frame-ancestors 'none'",r=`<!DOCTYPE html>
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
</html>`;return new s.NextResponse(r,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":o,"Cache-Control":"no-store"}})}),m={...a},f="workUnitAsyncStorage"in m?m.workUnitAsyncStorage:"requestAsyncStorage"in m?m.requestAsyncStorage:void 0;function u(e,t){return"phase-production-build"===process.env.NEXT_PHASE||"function"!=typeof e?e:new Proxy(e,{apply:(e,n,o)=>{let a;try{let e=(0,r.x)([f,"optionalAccess",e=>e.getStore,"call",e=>e()]);a=(0,r.x)([e,"optionalAccess",e=>e.headers])}catch(e){}return i.wrapRouteHandlerWithSentry(e,{method:t,parameterizedRoute:"/api/public/assistant/frame",headers:a}).apply(n,o)}})}let y=u(p,"GET"),h=u(void 0,"POST"),b=u(void 0,"PUT"),g=u(void 0,"PATCH"),x=u(void 0,"DELETE"),w=u(void 0,"HEAD"),v=u(void 0,"OPTIONS");o()}catch(e){o(e)}})},7902:(e,t,n)=>{"use strict";n.a(e,async(e,o)=>{try{n.r(t),n.d(t,{originalPathname:()=>f,patchFetch:()=>d,requestAsyncStorage:()=>u,routeModule:()=>l,serverHooks:()=>m,staticGenerationAsyncStorage:()=>p});var r=n(32829),i=n(85358),a=n(66806),s=n(70769),c=e([s]);s=(c.then?(await c)():c)[0];let l=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/public/assistant/frame/route",pathname:"/api/public/assistant/frame",filename:"route",bundlePath:"app/api/public/assistant/frame/route"},resolvedPagePath:"D:\\rappel beauty\\src\\app\\api\\public\\assistant\\frame\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:m}=l,f="/api/public/assistant/frame/route";function d(){return(0,a.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:p})}o()}catch(e){o(e)}})},32829:(e,t,n)=>{"use strict";e.exports=n(30517)},89482:(e,t,n)=>{"use strict";function o(){let e=process.env.SESSION_SECRET;if(!e||e.length<32)throw Error("SESSION_SECRET must be set (min 32 chars) in production.");return e}function r(){let e=process.env.ENCRYPTION_KEY;if(!e||e.length<16)throw Error("ENCRYPTION_KEY must be set (min 16 chars) in production.");return e}n.d(t,{F:()=>o,m:()=>r})},91604:(e,t,n)=>{"use strict";n.a(e,async(e,o)=>{try{n.d(t,{XD:()=>h,_I:()=>u,c4:()=>p,oU:()=>f,wE:()=>l,xI:()=>m});var r=n(84770),i=n(8678),a=n(90831),s=n(60478),c=e([i]);i=(c.then?(await c)():c)[0];let y=(0,a.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));class h extends Error{constructor(e,t){super(e),this.code=t,this.name="AssistantSessionError"}}function d(e){return(0,r.createHash)("sha256").update(e).digest("hex")}function l(e){try{let t=new URL(e);if("https:"!==t.protocol&&"http:"!==t.protocol)return null;return t.origin}catch{return null}}async function u(e){let t=l(e.origin);if(!t)throw new h("Domaine refus\xe9.","ORIGIN_DENIED");if(!(await (0,s.Tv)([{key:`assistant:widget:ip:${e.ip}`,...s.GC.assistantWidget.ip,sensitivity:"sensitive"},{key:`assistant:widget:pub:${e.publicId}`,...s.GC.assistantWidget.widget,sensitivity:"sensitive"}])).allowed)throw new h("Trop de demandes.","RATE_LIMITED");let n=(await y.query(`SELECT id, "organizationId", status
     FROM "PublicWidget"
     WHERE "publicId" = $1`,[e.publicId])).rows[0];if(!n||"ACTIVE"!==n.status)throw new h("Widget introuvable.","WIDGET_NOT_FOUND");if(e.organizationId&&e.organizationId!==n.organizationId)throw new h("Institut non autoris\xe9.","CLIENT_AUTHORITY");let o=await y.query('SELECT 1 FROM "PublicWidgetOrigin" WHERE "widgetId" = $1 AND origin = $2',[n.id,t]);if(0===o.rowCount)throw new h("Domaine refus\xe9.","ORIGIN_DENIED");let i=(0,r.randomBytes)(32).toString("hex"),a=new Date(Date.now()+18e5);return await y.query(`INSERT INTO "AssistantWidgetSession" (id, "widgetId", "organizationId", "tokenHash", "expiresAt")
     VALUES ($1, $2, $3, $4, $5)`,[`wss_${(0,r.randomBytes)(8).toString("hex")}`,n.id,n.organizationId,d(i),a]),{token:i,organizationId:n.organizationId,expiresAt:a}}async function p(e){return(await y.query(`SELECT s.id, s."organizationId", o.name AS "organizationName"
     FROM "AssistantWidgetSession" s
     JOIN "Organization" o ON o.id = s."organizationId"
     WHERE s."tokenHash" = $1 AND s."expiresAt" > NOW()`,[d(e)])).rows[0]??null}async function m(e){return(await y.query(`SELECT o.origin
     FROM "PublicWidgetOrigin" o
     JOIN "PublicWidget" w ON w.id = o."widgetId"
     WHERE w."publicId" = $1 AND w.status = 'ACTIVE'`,[e])).rows.map(e=>e.origin)}let b="pub_preview";async function f(){let e=await y.query("SELECT id FROM \"Organization\" WHERE slug = 'institut-royal' LIMIT 1"),t=e.rows[0]?.id;if(!t)return;await y.query(`INSERT INTO "PublicWidget" (id, "organizationId", "publicId", name, status, "updatedAt")
     VALUES ('wdg_preview', $1, $2, 'Aper\xe7u assistant', 'ACTIVE', NOW())
     ON CONFLICT ("publicId") DO UPDATE SET status = 'ACTIVE', "updatedAt" = NOW()`,[t,b]);let n=await y.query('SELECT id FROM "PublicWidget" WHERE "publicId" = $1',[b]),o=n.rows[0]?.id;if(o)for(let e of["http://localhost:3000","http://127.0.0.1:3000","https://rappelbeauty.com","https://www.rappelbeauty.com"])await y.query(`INSERT INTO "PublicWidgetOrigin" (id, "widgetId", origin)
       VALUES ($1, $2, $3)
       ON CONFLICT ("widgetId", origin) DO NOTHING`,[`ori_${e.replace(/[^a-z0-9]/gi,"").slice(0,24)}`,o,e])}o()}catch(e){o(e)}})},79311:(e,t,n)=>{"use strict";n.d(t,{G_:()=>u,Nu:()=>d,X2:()=>l,f$:()=>c,fO:()=>s,uF:()=>p,yN:()=>r});var o=n(92761);class r extends Error{constructor(e){super(e),this.code="TENANT_CONTEXT_MISSING",this.name="TenantContextError"}}let i=globalThis,a=i.__rappelTenantScope??=new o.AsyncLocalStorage;function s(e,t){return a.run(e,t)}function c(){return a.getStore()}function d(e,t){return s({kind:"job",reason:e},t)}function l(e){let t=a.getStore();if(!t)return;let n=e?.trim()||null;if("tenant"===t.kind&&t.organizationId&&n&&t.organizationId!==n)throw new r("Institut diff\xe9rent dans une m\xeame requ\xeate.");t.kind="tenant",t.organizationId=n,delete t.reason}function u(e=process.env.RLS_ENFORCE){let t=e?.trim();return t?"all"===t?{kind:"all"}:{kind:"list",ids:new Set(t.split(",").map(e=>e.trim()).filter(Boolean))}:{kind:"off"}}function p(e){let{scope:t,setting:n,limitedRole:o}=e,r=e=>o?{action:"bypass",warn:e}:{action:"passthrough",warn:e};return"off"===n.kind?r():t?"tenant"!==t.kind?r():t.organizationId?"all"===n.kind||n.ids.has(t.organizationId)?o?{action:"tenant",organizationId:t.organizationId}:{action:"passthrough",warn:"RLS_ENFORCE actif avec un r\xf4le qui ignore les r\xe8gles : aucune protection."}:r():{action:"refuse",message:"Route institut sans institut d\xe9fini."}:"all"===n.kind?{action:"refuse",message:"Acc\xe8s base sans port\xe9e d\xe9clar\xe9e."}:r("Acc\xe8s base sans port\xe9e d\xe9clar\xe9e.")}},90831:(e,t,n)=>{"use strict";n.d(t,{S:()=>u});var o=n(67394),r=n(79311);let i="SELECT set_config('app.current_org', $1, true), set_config('app.rls_bypass', $2, true)",a=/^\s*(BEGIN|START\s+TRANSACTION)\b/i,s=/^\s*(COMMIT|END|ABORT|ROLLBACK(?!\s+(WORK\s+|TRANSACTION\s+)?TO\b))\b/i,c=new Set;function d(e){return"tenant"===e.action?[e.organizationId,"off"]:"bypass"===e.action?["","on"]:null}function l(e,t){let n=e.query,r=e.release.bind(e),c=t=>n.apply(e,t),d=!1,l=!1,u=!1,p=e=>{l=!0,o.k.warn("connexion PostgreSQL perdue pendant un emprunt",{route:"db/tenant-pool",detail:e.message})};e.on("error",p);let m=Promise.resolve(),f=e=>{let t=m.then(e);return m=t.catch(()=>void 0),t};return e.query=(...e)=>{if("function"==typeof e[e.length-1])return c(e);let n=function(e){if("string"==typeof e)return e;let t=e?.text;return"string"==typeof t?t:""}(e[0]);return a.test(n)?(d=!0,f(async()=>{let n=await c(e);return t&&await c([i,t]),n})):d?(s.test(n)&&(d=!1),f(()=>c(e))):t?f(async()=>{await c(["BEGIN"]);try{await c([i,t]);let n=await c(e);return await c(["COMMIT"]),n}catch(e){throw await c(["ROLLBACK"]).catch(()=>{l=!0}),e}}):f(()=>c(e))},e.release=t=>{if(u)return;u=!0;let n=t=>{e.removeListener("error",p),delete e.query,r(t)};if(t||l){n(t||!0);return}m.then(()=>{if(l){n(!0);return}if(!d){n();return}o.k.warn("transaction encore ouverte au retour de connexion : annul\xe9e",{route:"db/tenant-pool"}),c(["ROLLBACK"]).then(()=>n(),()=>n(!0))})},e}function u(e){let t=e.connect.bind(e),n=e.query.bind(e),i=null;async function a(){if(null!==i)return i;try{let e=await n("SELECT (rolsuper OR rolbypassrls) AS privileged FROM pg_roles WHERE rolname = current_user");return i=e.rows[0]?.privileged!==!0}catch{return!0}}async function s(){let e=(0,r.uF)({scope:(0,r.f$)(),setting:(0,r.G_)(),limitedRole:await a()});if("refuse"===e.action)throw new r.yN(e.message);return"warn"in e&&e.warn&&function(e){let t=Error().stack?.split("\n").find(e=>e.includes("/src/")&&!e.includes("tenant-"))??"",n=`${e}|${t.trim()}`;c.size>200||c.has(n)||(c.add(n),o.k.error(e,{route:"db/tenant-pool",origin:t.trim()}))}(e.warn),e}return e.on?.("error",e=>{o.k.warn("connexion PostgreSQL inactive perdue",{route:"db/tenant-pool",detail:e.message})}),e.connect=e=>"function"==typeof e?t(e):(async()=>{let e=await s();return l(await t(),d(e))})(),e.query=(...e)=>"function"==typeof e[e.length-1]?n(...e):(async()=>{let o=d(await s());if(!o)return n(...e);let r=l(await t(),o);try{return await r.query(...e)}finally{r.release()}})(),e}},73575:(e,t,n)=>{"use strict";n.d(t,{DV:()=>c,GI:()=>l,Pd:()=>s,f_:()=>a,gA:()=>d});var o=n(46485),r=n(79311);function i(e){return t=>async(...n)=>{try{return await (0,r.fO)(e(),()=>t(...n))}catch(e){if(e instanceof r.yN)return o.NextResponse.json({error:"Acc\xe8s refus\xe9.",code:e.code},{status:403});throw e}}}let a=i(()=>({kind:"tenant",organizationId:null})),s=i(()=>({kind:"public",reason:"route publique"})),c=i(()=>({kind:"platform",reason:"back-office"})),d=i(()=>({kind:"job",reason:"cron"}));function l(e,t){return(...n)=>(0,r.fO)({kind:e,reason:`page ${e}`},()=>t(...n))}},67394:(e,t,n)=>{"use strict";n.d(t,{k:()=>i});let o=new Set(["password","passwordHash","token","session","jwt","authorization","cookie","secret","database_url","databaseurl","apikey","api_key","s3_secret","pushtoken","authenticationtoken","signercert","signerkey"]);function r(e,t,r){let i={ts:new Date().toISOString(),level:e,message:t,...r?function e(t){if(null==t||"object"!=typeof t)return t;if(Array.isArray(t))return t.map(e);let n={};for(let[r,i]of Object.entries(t))o.has(r.toLowerCase())?n[r]="[REDACTED]":n[r]=e(i);return n}(r):{}},a=JSON.stringify(i);"error"===e?(console.error(a),(process.env.SENTRY_DSN||process.env.NEXT_PUBLIC_SENTRY_DSN)&&Promise.resolve().then(n.t.bind(n,21967,23)).then(e=>{let{ts:n,level:o,message:r,...a}=i;e.captureMessage(t,{level:"error",extra:a,tags:{route:String(a.route??"")||void 0}})}).catch(()=>void 0)):"warn"===e?console.warn(a):console.log(a)}let i={debug:(e,t)=>r("debug",e,t),info:(e,t)=>r("info",e,t),warn:(e,t)=>r("warn",e,t),error:(e,t)=>r("error",e,t)}},60478:(e,t,n)=>{"use strict";n.d(t,{GC:()=>a,W6:()=>p,Tv:()=>u,Ug:()=>i.Ug,KP:()=>i.KP,lS:()=>i.lS,WQ:()=>m});var o=n(40322),r=n(67394),i=n(61328);let a={login:{ip:{limit:10,windowMs:9e5},account:{limit:10,windowMs:9e5},pair:{limit:10,windowMs:9e5}},forgotPassword:{ip:{limit:5,windowMs:36e5},account:{limit:3,windowMs:36e5}},activate:{ip:{limit:5,windowMs:9e5},token:{limit:5,windowMs:9e5}},signup:{ip:{limit:5,windowMs:36e5},account:{limit:3,windowMs:36e5}},changePassword:{user:{limit:10,windowMs:9e5},ip:{limit:20,windowMs:9e5}},booking:{ip:{limit:10,windowMs:6e5},phone:{limit:3,windowMs:36e5},pair:{limit:3,windowMs:36e5}},assistantWidget:{ip:{limit:30,windowMs:6e5},widget:{limit:60,windowMs:6e5}},productOrder:{ip:{limit:10,windowMs:6e5},phone:{limit:20,windowMs:36e5}},publicRead:{limit:120,windowMs:6e4},availability:{limit:60,windowMs:6e4},ai:{user:{limit:20,windowMs:6e4},ip:{limit:40,windowMs:6e4}}},s=new Map,c=new Map;async function d(e){let t=await (0,o.QY)();if(!t)return null;let n=`rl:${e.key}`,r=Math.ceil(e.windowMs/1e3),i=await t.multi().incr(n).expire(n,r,"NX").ttl(n).exec();if(!i)return null;let a=i[0],s=i[2];return a>e.limit?{allowed:!1,retryAfterSec:s>0?s:r}:{allowed:!0}}async function l(e){try{let t=await d(e);if(t)return t}catch(e){r.k.warn("rate limit redis error",{error:e instanceof Error?e.message:"unknown"})}return"sensitive"===e.sensitivity&&r.k.warn("rate limit redis down — fallback sensible",{keyPrefix:e.key.split(":")[0]}),function(e,t){let n=Date.now(),o=s.get(e.key);return!o||n>=o.resetAt?(s.set(e.key,{count:1,resetAt:n+e.windowMs}),{allowed:!0}):o.count>=t?{allowed:!1,retryAfterSec:Math.ceil((o.resetAt-n)/1e3)}:(o.count+=1,{allowed:!0})}(e,"sensitive"!==e.sensitivity?e.limit:Math.max(1,Math.ceil(e.limit/3)))}async function u(e){let t=null;for(let n of e){let e=await l(n);if(!e.allowed){let n=e.retryAfterSec??0;(!t||n>(t.retryAfterSec??0))&&(t=e)}}return t??{allowed:!0}}async function p(e,t){let n=`rl:idem:${e}`;try{let e=await (0,o.QY)();if(e){let o=await e.set(n,"1",{NX:!0,EX:t});return"OK"===o}}catch{}let r=Date.now(),i=c.get(e);return(!i||!(i>r))&&(c.set(e,r+1e3*t),!0)}async function m(e){c.delete(e);try{let t=await (0,o.QY)();t&&await t.del(`rl:idem:${e}`)}catch{}}},61328:(e,t,n)=>{"use strict";n.d(t,{KP:()=>i,Ug:()=>a,lS:()=>s});var o=n(84770),r=n(89482);function i(e){return(0,o.createHmac)("sha256",(0,r.F)()).update(e).digest("hex").slice(0,32)}function a(e){return i(e.trim().toLowerCase())}function s(e){return i(e.replace(/\D/g,"").slice(-9)||"unknown")}},40322:(e,t,n)=>{"use strict";n.d(t,{QY:()=>s,XC:()=>c});var o=n(75034),r=n(67394);let i=null,a=null;async function s(){let e=process.env.REDIS_URL;return e?i?.isOpen?i:(a||(a=(async()=>{try{let t=(0,o.createClient)({url:e,socket:{connectTimeout:3e3,reconnectStrategy:!1}});return t.on("error",e=>{r.k.warn("Redis client error",{error:String(e)})}),await t.connect(),i=t}catch(e){return r.k.warn("Redis unavailable — fallback m\xe9moire",{error:String(e)}),null}finally{a=null}})()),a):null}async function c(){try{let e=await s();if(!e)return!1;let t=await e.ping();return"PONG"===t}catch{return!1}}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),o=t.X(0,[9085,3192,6485,5034],()=>n(7902));module.exports=o})();