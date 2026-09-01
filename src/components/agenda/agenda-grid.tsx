"use client";

import {
  AGENDA_CLOSE_HOUR,
  AGENDA_OPEN_HOUR,
  AGENDA_SLOT_HEIGHT_PX,
  AGENDA_SLOT_MINUTES,
} from "@/modules/appointments/constants";
import { STAFF_BLOCKS } from "@/data/mock-agenda";
import type { Appointment } from "@/types/appointment";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import { cn } from "@/lib/utils";

type StaffCol = { id: string; name: string };

type AgendaGridProps = {
  date: Date;
  staff: StaffCol[];
  appointments: Appointment[];
  onAppointmentClick: (id: string) => void;
  onSlotDrop?: (staffId: string, hour: number, minute: number, appointmentId: string) => void;
};

function slotTop(date: Date) {
  const minutes = (date.getHours() - AGENDA_OPEN_HOUR) * 60 + date.getMinutes();
  return (minutes / AGENDA_SLOT_MINUTES) * AGENDA_SLOT_HEIGHT_PX;
}

function slotHeight(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60_000;
  return Math.max((mins / AGENDA_SLOT_MINUTES) * AGENDA_SLOT_HEIGHT_PX - 4, 40);
}

export function AgendaGrid({
  date,
  staff,
  appointments,
  onAppointmentClick,
  onSlotDrop,
}: AgendaGridProps) {
  const slots = Array.from(
    { length: ((AGENDA_CLOSE_HOUR - AGENDA_OPEN_HOUR) * 60) / AGENDA_SLOT_MINUTES },
    (_, i) => {
      const totalMin = AGENDA_OPEN_HOUR * 60 + i * AGENDA_SLOT_MINUTES;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return { h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
    },
  );

  const totalHeight = slots.length * AGENDA_SLOT_HEIGHT_PX;

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-line bg-white shadow-soft md:block">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div
            className="grid border-b border-line bg-[#FBF4F6]"
            style={{ gridTemplateColumns: `72px repeat(${staff.length}, minmax(140px, 1fr))` }}
          >
            <div className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-ink/40">
              Heure
            </div>
            {staff.map((s) => (
              <div key={s.id} className="border-l border-line px-3 py-3 text-sm font-semibold">
                {s.name}
              </div>
            ))}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `72px repeat(${staff.length}, minmax(140px, 1fr))`,
              height: totalHeight,
            }}
          >
            {/* Time labels + grid lines */}
            <div className="relative border-r border-line">
              {slots.map((slot, i) => (
                <div
                  key={slot.label}
                  className="absolute left-0 right-0 border-t border-line/70 px-2 font-mono text-[10px] text-ink/40"
                  style={{ top: i * AGENDA_SLOT_HEIGHT_PX, height: AGENDA_SLOT_HEIGHT_PX }}
                >
                  <span className="relative -top-2 bg-white px-1">{slot.label}</span>
                </div>
              ))}
            </div>

            {staff.map((col) => {
              const colAppts = appointments.filter((a) => a.staffId === col.id);

              return (
                <div
                  key={col.id}
                  className="relative border-r border-line last:border-r-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const aptId = e.dataTransfer.getData("appointmentId");
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const slotIdx = Math.floor(y / AGENDA_SLOT_HEIGHT_PX);
                    const slot = slots[slotIdx];
                    if (slot && aptId) onSlotDrop?.(col.id, slot.h, slot.m, aptId);
                  }}
                >
                  {slots.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-line/50"
                      style={{ top: i * AGENDA_SLOT_HEIGHT_PX }}
                    />
                  ))}

                  {/* Staff blocks (pause/congé) */}
                  {STAFF_BLOCKS.filter((b) => b.staffId === col.id).map((block) => {
                    const bStart = new Date(block.startAt);
                    if (
                      bStart.getFullYear() !== date.getFullYear() ||
                      bStart.getMonth() !== date.getMonth() ||
                      bStart.getDate() !== date.getDate()
                    ) {
                      return null;
                    }
                    const bEnd = new Date(block.endAt);
                    return (
                      <div
                        key={block.label}
                        className="absolute inset-x-1 rounded-lg border border-dashed border-amber-300 bg-amber-50/80 px-2 py-1 text-[10px] font-medium text-amber-800"
                        style={{
                          top: slotTop(bStart) + 2,
                          height: slotHeight(bStart, bEnd),
                        }}
                      >
                        {block.label}
                      </div>
                    );
                  })}

                  {colAppts.map((apt) => {
                    const start = new Date(apt.startAt);
                    const end = new Date(apt.endAt);
                    return (
                      <div
                        key={apt.id}
                        className="absolute inset-x-1 z-10"
                        style={{
                          top: slotTop(start) + 2,
                          height: slotHeight(start, end),
                        }}
                      >
                        <AppointmentCard
                          appointment={apt}
                          compact
                          draggable
                          onClick={() => onAppointmentClick(apt.id)}
                          className="h-full overflow-hidden"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgendaWeekStrip({
  dates,
  selected,
  onSelect,
  appointmentCounts,
}: {
  dates: Date[];
  selected: Date;
  onSelect: (d: Date) => void;
  appointmentCounts: Record<string, number>;
}) {
  return (
    <div className="hidden gap-2 md:grid md:grid-cols-7">
      {dates.map((d) => {
        const key = d.toISOString().slice(0, 10);
        const isSelected =
          d.getDate() === selected.getDate() &&
          d.getMonth() === selected.getMonth();
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(d)}
            className={cn(
              "rounded-xl border p-3 text-center transition",
              isSelected
                ? "border-primary bg-primary-light"
                : "border-line bg-white hover:border-primary/30",
            )}
          >
            <p className="font-mono text-[10px] uppercase text-ink/40">
              {d.toLocaleDateString("fr-FR", { weekday: "short" })}
            </p>
            <p className="mt-1 font-display text-xl font-semibold">{d.getDate()}</p>
            <p className="mt-0.5 text-[10px] text-ink/45">
              {appointmentCounts[key] ?? 0} RDV
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function AgendaMonthGrid({
  dates,
  anchor,
  appointments,
  onSelectDay,
}: {
  dates: Date[];
  anchor: Date;
  appointments: Appointment[];
  onSelectDay: (d: Date) => void;
}) {
  return (
    <div className="hidden rounded-2xl border border-line bg-white p-4 shadow-soft md:block">
      <div className="mb-3 grid grid-cols-7 gap-1 font-mono text-[10px] uppercase text-ink/40">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const count = appointments.filter((a) => {
            const s = new Date(a.startAt);
            return (
              s.getFullYear() === d.getFullYear() &&
              s.getMonth() === d.getMonth() &&
              s.getDate() === d.getDate()
            );
          }).length;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelectDay(d)}
              className={cn(
                "min-h-[72px] rounded-lg border p-2 text-left transition hover:border-primary/40",
                inMonth ? "border-line bg-white" : "border-transparent bg-[#FBF4F6]/50 text-ink/35",
              )}
            >
              <span className="font-mono text-sm font-semibold">{d.getDate()}</span>
              {count > 0 ? (
                <span className="mt-1 block rounded-full bg-primary-light px-1.5 py-0.5 text-center text-[10px] font-semibold text-primary">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
