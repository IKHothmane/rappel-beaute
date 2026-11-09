"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function isoDate(day: Date) {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

export function DateCalendar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());

  return (
    <div className="mt-2" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!open) setMonth(value ? new Date(`${value}T12:00:00`) : new Date(`${today}T12:00:00`));
          setOpen(!open);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8D4DE] bg-[#FFF5F9] px-3 py-2 text-sm font-semibold text-[#B60050] hover:bg-[#FCE7F0]"
      >
        <CalendarDays size={17} aria-hidden />
        {open ? "Fermer le calendrier" : "Choisir dans le calendrier"}
      </button>
      {open ? (
        <div role="group" aria-label="Calendrier de rendez-vous" className="mt-2 rounded-2xl border border-[#E8D4DE] bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" aria-label="Mois précédent" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-2 text-[#B60050] hover:bg-[#FFF5F9]"><ChevronLeft size={18} /></button>
            <span aria-live="polite" className="text-sm font-semibold capitalize text-[#43303D]">{month.toLocaleDateString("fr-MA", { month: "long", year: "numeric" })}</span>
            <button type="button" aria-label="Mois suivant" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-2 text-[#B60050] hover:bg-[#FFF5F9]"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => <span key={index} aria-hidden className="py-1 text-xs font-semibold text-[#887787]">{label}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: days }, (_, index) => {
              const day = new Date(month.getFullYear(), month.getMonth(), index + 1);
              const iso = isoDate(day);
              return <button key={iso} type="button" aria-label={day.toLocaleDateString("fr-MA", { dateStyle: "full" })} aria-pressed={iso === value} aria-current={iso === today ? "date" : undefined} onClick={() => { onChange(iso); setOpen(false); }} className={cn("min-h-9 rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B60050]", iso === value ? "bg-[#B60050] font-bold text-white" : "text-[#43303D] hover:bg-[#FFF0F6]", iso === today && iso !== value && "ring-1 ring-inset ring-[#B60050] font-bold text-[#B60050]")}>{index + 1}</button>;
            })}
          </div>
          <button type="button" onClick={() => { onChange(today); setOpen(false); }} className="mt-3 w-full rounded-lg bg-[#FFF5F9] py-2 text-xs font-semibold text-[#B60050]">Aujourd’hui</button>
        </div>
      ) : null}
    </div>
  );
}
