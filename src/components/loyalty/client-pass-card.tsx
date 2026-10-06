"use client";

import { useState } from "react";

type Appointment = { at: string; service: string; staff: string };
type Session = { name: string; used: number; total: number; remaining: number };

export function ClientPassCard({
  organizationName,
  firstName,
  appointments,
  sessions,
  qr,
}: {
  organizationName: string;
  firstName: string;
  appointments: Appointment[];
  sessions: Session[];
  qr: string;
}) {
  const [open, setOpen] = useState(false);
  const next = appointments[0];

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full rounded-3xl p-5 text-left text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, #221820 0%, #4A2033 48%, #ba0049 100%)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {organizationName}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold">{firstName}</p>
            <p className="mt-1 text-sm text-white/75">Carte cliente</p>
          </div>
          <span
            className="mt-1 h-8 w-11 rounded-md"
            style={{ background: "linear-gradient(135deg, #F0BF5C, #C79A3B)" }}
          />
        </div>
        <p className="mt-8 text-sm text-white/80">
          {next
            ? `Prochain rendez-vous · ${when(next.at)} · ${next.service}`
            : "Aucun rendez-vous à venir"}
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#FFDEA4]">
          {open ? "Séances affichées" : "Touchez la carte pour voir les séances"}
        </p>
      </button>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-sm font-bold text-ink">Rendez-vous</h2>
        {appointments.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">Aucun rendez-vous à venir.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {appointments.map((item) => (
              <li key={item.at + item.service} className="rounded-xl bg-[#FFEFF8] px-3 py-2 text-sm">
                <p className="font-semibold text-ink">{item.service}</p>
                <p className="text-ink/55">
                  {when(item.at)}
                  {item.staff ? ` · ${item.staff}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? (
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-bold text-ink">Séances</h2>
          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50">Aucune séance en cours.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {sessions.map((item) => (
                <li key={item.name} className="rounded-xl bg-[#FFEFF8] px-3 py-2 text-sm">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-ink/55">
                    {item.remaining} restante{item.remaining > 1 ? "s" : ""} · {item.used}/{item.total}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="rounded-2xl border border-line bg-white p-4 text-center">
        <p className="text-xs text-ink/45">QR de la carte</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code de la carte" width={180} height={180} className="mx-auto mt-2 h-44 w-44" />
      </div>
    </div>
  );
}

function when(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
