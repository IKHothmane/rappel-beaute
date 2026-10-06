import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listWidgetFrameAncestors, normalizeWidgetOrigin } from "@/lib/db/assistant-session";

export async function GET(request: NextRequest) {
  const publicId = request.nextUrl.searchParams.get("publicId")?.trim() ?? "";
  const ancestors = publicId ? await listWidgetFrameAncestors(publicId) : [];
  const frameAncestors = ancestors
    .map((origin) => normalizeWidgetOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
  const csp =
    frameAncestors.length > 0
      ? `frame-ancestors ${frameAncestors.join(" ")}`
      : "frame-ancestors 'none'";

  const html = `<!DOCTYPE html>
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
        <label>Message <input id="chat-text" placeholder="Je veux une manucure lundi à 9h" /></label>
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
        <h2>Créneaux</h2>
        <label>Date <input id="slot-date" type="date" /></label>
        <div id="slots" class="times"></div>
        <form id="booking" hidden>
          <h2>Rendez-vous</h2>
          <p id="booking-summary"></p>
          <label>Prénom <input id="first-name" autocomplete="given-name" /></label>
          <label>Nom <input id="last-name" autocomplete="family-name" /></label>
          <label>Téléphone <input id="phone" autocomplete="tel" /></label>
          <button class="primary" type="submit">Proposer le rendez-vous</button>
          <div id="proposal"></div>
        </form>
        <form id="manage-form">
          <h2>Mon rendez-vous</h2>
          <label>Référence <input id="manage-ref" autocomplete="off" /></label>
          <label>Téléphone <input id="manage-phone" autocomplete="tel" /></label>
          <button class="primary" type="submit">Voir mon rendez-vous</button>
          <div id="manage"></div>
        </form>
      </div>
    </section>
    <footer>Le rendez-vous n'est enregistré qu'après confirmation.</footer>
  </main>
  <script>
    const publicId = ${JSON.stringify(publicId)};
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
        show(data.message || "Ce site n'est pas autorisé à afficher l'assistant.");
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
        empty.textContent = "Aucun élément public.";
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
        meta.textContent = item.durationMin + " min · " + money(item.price);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "slot";
        button.textContent = "Voir les créneaux";
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
        note.textContent = body.error || "Créneaux indisponibles.";
        box.appendChild(note);
        return;
      }
      const title = document.createElement("span");
      title.textContent = serviceName + " · " + date;
      box.appendChild(title);
      const times = (body.slots || []).map((slot) => slot.time);
      if (!times.length) {
        const note = document.createElement("span");
        note.textContent = "Aucun créneau libre.";
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
      document.getElementById("booking-summary").textContent = serviceName + " · " + date + " · " + time;
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
      note.textContent = body.serviceName + " · " + body.date + " · " + body.time + " · " + body.price + " DH";
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
        ? "Rendez-vous enregistré · " +
          body.serviceName +
          " · " +
          body.time +
          (body.reference ? " · Référence " + body.reference : "")
        : body.error || "Confirmation impossible.";
      proposal.appendChild(note);
      if (res.ok && body.reference) {
        document.getElementById("manage-ref").value = body.reference;
        if (body.appointmentStatus !== "Annulé") document.getElementById("manage-phone").value = document.getElementById("phone").value;
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
      note.textContent = item.serviceName + " · " + item.date + " · " + item.time + " · " + item.status;
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
      move.textContent = "Déplacer";
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
          empty.textContent = slotsBody.error || "Aucun créneau libre.";
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
      note.textContent = (kind === "cancel" ? "Annuler " : "Déplacer vers ") + body.date + " · " + body.time;
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
          ? (result.appointmentStatus === "Annulé"
            ? "Rendez-vous annulé · " + result.reference
            : "Rendez-vous déplacé · " + result.time + " · " + result.reference)
          : result.error || "Confirmation impossible.";
        box.appendChild(line);
      });
      box.append(note, confirm);
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": csp,
      "Cache-Control": "no-store",
    },
  });
}
