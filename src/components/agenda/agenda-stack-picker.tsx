"use client";

import { useEffect } from "react";
import { Layers, X } from "lucide-react";
import type { Appointment } from "@/types/appointment";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import { APPOINTMENT_STATUS_LABEL } from "@/modules/appointments/constants";

type Props = {
  appointments: Appointment[];
  onSelect: (id: string) => void;
  onClose: () => void;
};

function formatRange(apt: Appointment) {
  const start = new Date(apt.startAt);
  const end = new Date(apt.endAt);
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString("fr-FR", opts)} – ${end.toLocaleTimeString("fr-FR", opts)}`;
}

export function AgendaStackPicker({ appointments, onSelect, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div
      className="rb-fullscreen-overlay fixed inset-0 z-[220] flex items-end justify-center bg-[#261524]/45 p-3 backdrop-blur-[1px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agenda-stack-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#F0D9E3] bg-white shadow-[0_24px_60px_rgba(60,10,30,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#F5E5EC] px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#B90058]">
              <Layers size={14} aria-hidden />
              Créneau partagé
            </p>
            <h2 id="agenda-stack-title" className="mt-1 font-serif text-xl font-bold text-[#58152F]">
              {sorted.length} rendez-vous
            </h2>
            <p className="mt-1 text-sm text-[#765E6B]">
              Choisissez la carte à ouvrir.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-ink/50 transition hover:bg-[#FBF4F6] hover:text-ink"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {sorted.map((apt) => (
            <div key={apt.id} className="space-y-1.5">
              <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-[#F0D9E3] transition hover:ring-[#B83E72]/50">
                <AppointmentCard
                  appointment={apt}
                  onClick={() => onSelect(apt.id)}
                  className="min-h-[96px] cursor-pointer shadow-none"
                />
              </div>
              <p className="px-1 text-[11px] font-medium text-[#9A7F8C]">
                {formatRange(apt)} · {apt.staffName} · {APPOINTMENT_STATUS_LABEL[apt.status]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
