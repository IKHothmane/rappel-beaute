import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AgendaPremiumLayout } from "../../src/components/agenda/agenda-premium-layout";
import { AgendaWeekBoard } from "../../src/components/agenda/agenda-week-board";
import NouveauRendezVousModal from "../../src/components/agenda/nouveau-rendez-vous-modal";
import { SessionProvider } from "../../src/components/auth/session-provider";
import { ToastProvider } from "../../src/components/ui/toast";
import type { ServiceAgendaOption, ServiceFormOptions } from "../../src/types/service";
import type { OrganizationClosureItem } from "../../src/types/planning";
import "./agenda-preview.css";

const services: ServiceAgendaOption[] = [{ id: "s1", name: "Soin visage", price: 200, durationMin: 60, prepTimeMin: 0, cleanupTimeMin: 0, totalBlockMin: 60, deposit: 0, active: true, staffIds: ["st1"], resourceIds: ["r1"] }];
const options: ServiceFormOptions = { staff: [{ id: "st1", name: "Nadia", role: null, status: "ACTIVE" }], resources: [{ id: "r1", name: "Cabine 1", type: "CABIN" }], products: [] };
const closures: OrganizationClosureItem[] = [];
window.fetch = async (_url, init) => {
  if (init?.method && !["GET", "HEAD"].includes(init.method)) throw new Error("Aucune écriture autorisée dans la vidéo de démonstration.");
  const body = String(_url).includes("/auth/session")
    ? { user: { id: "demo", scope: "app", accountType: "ORGANIZATION", role: "OWNER", organizationId: "demo", orgName: "Institut Démonstration" } }
    : String(_url).includes("google-calendar") ? { configured: false, connected: false } : { data: [], pagination: { totalPages: 1 } };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
};

function Preview() {
  const [open, setOpen] = useState(false);
  const date = new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const next = new Date(date); next.setDate(date.getDate() - (date.getDay() + 6) % 7 + i); return next; });
  return <>
    <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 180, background: "white", borderRight: "1px solid #f0d9e3", padding: 24 }}>
      <strong style={{ color: "#ac0e4c", fontSize: 20 }}>Rappel Beauty</strong>
      <p style={{ marginTop: 40, color: "#ac0e4c", fontWeight: 700 }}>Agenda</p>
      <p style={{ marginTop: 18, color: "#887787", fontSize: 13 }}>Institut Démonstration</p>
      <p style={{ marginTop: 8, color: "#887787", fontSize: 12 }}>Données fictives</p>
    </aside>
    <main style={{ padding: 30, marginLeft: 180 }}>
      <AgendaPremiumLayout date={date} view="week" appointments={[]} todayCount={0} todayDeltaPct={null} confirmed={0} confirmedPct={null} pending={0} clientesToday={0} newClientesToday={0} forecast={0} forecastCount={0} occupancy={0} occupancyDelta={null} rangeLabel="Votre semaine" weekNumber={null} staff={options.staff} services={services} resources={options.resources} staffFilter="ALL" serviceFilter="ALL" resourceFilter="ALL" statusFilter="ALL" onStaffFilter={() => {}} onServiceFilter={() => {}} onResourceFilter={() => {}} onStatusFilter={() => {}} onViewChange={() => {}} onDateChange={() => {}} onPrev={() => {}} onNext={() => {}} onToday={() => {}} onCreate={() => setOpen(true)} onTutorialCreate={() => setOpen(true)} onTutorialClose={() => setOpen(false)} onAppointmentClick={() => {}}>
        <AgendaWeekBoard dates={days} selected={date} selectedAppointmentId={null} appointments={[]} onSelectDay={() => {}} onAppointmentClick={() => {}} />
      </AgendaPremiumLayout>
      <NouveauRendezVousModal open={open} tutorialMode onClose={() => setOpen(false)} appointments={[]} services={services} formOptions={options} staffContexts={[]} resourceContexts={[]} closures={closures} onCreate={() => { throw new Error("Démonstration sans enregistrement"); }} />
    </main>
    <div id="video-caption"><small>Tutoriel · Agenda</small><h2>Créer un rendez-vous</h2><p>Suivez les étapes sur l’écran.</p></div>
    <div id="video-cursor" style={{ left: -100, top: -100 }} />
  </>;
}
document.addEventListener("mousemove", event => { const el = document.getElementById("video-cursor"); if (el) { el.style.left = `${event.clientX}px`; el.style.top = `${event.clientY}px`; } });
document.addEventListener("mousedown", () => { const el = document.getElementById("video-cursor"); if (el) { el.classList.remove("click"); void el.offsetWidth; el.classList.add("click"); } });
createRoot(document.getElementById("root")!).render(<SessionProvider><ToastProvider><Preview /></ToastProvider></SessionProvider>);
