"use client";

import { useMemo } from "react";
import {
  AGENDA_CLOSE_HOUR,
  AGENDA_OPEN_HOUR,
  APPOINTMENT_STATUS_LABEL,
} from "@/modules/appointments/constants";
import { agendaAppointmentSurface, staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import { AppointmentPayBadge } from "@/components/agenda/appointment-pay-badge";
import {
  agendaBlockPosition,
  agendaYToSlot,
  buildAgendaLayout,
  type AgendaTimeLayout,
} from "@/components/agenda/agenda-time-scale";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/appointment";
import type { OrganizationClosureItem } from "@/types/planning";

type AgendaWeekBoardProps = {
  dates: Date[];
  selected: Date;
  selectedAppointmentId: string | null;
  appointments: Appointment[];
  closures?: OrganizationClosureItem[];
  onSelectDay: (d: Date) => void;
  onAppointmentClick: (id: string) => void;
  onEmptySlotClick?: (day: Date, hour: number, minute: number) => void;
  onDrop?: (day: Date, hour: number, minute: number, appointmentId: string) => void;
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function blockStyle(layout: AgendaTimeLayout, start: Date, end: Date) {
  return agendaBlockPosition(layout, start, end, 44);
}

function isToday(d: Date) {
  const n = new Date();
  return sameDay(d, n);
}

function isSaturday(d: Date) {
  return d.getDay() === 6;
}

export function AgendaWeekBoard({
  dates,
  selected,
  selectedAppointmentId,
  appointments,
  closures = [],
  onSelectDay,
  onAppointmentClick,
  onEmptySlotClick,
  onDrop,
}: AgendaWeekBoardProps) {
  const palette = useStaffPalette();
  const layout = useMemo(
    () =>
      buildAgendaLayout(
        appointments.map((appointment) => ({
          start: new Date(appointment.startAt),
          end: new Date(appointment.endAt),
        })),
      ),
    [appointments],
  );
  const { rows, totalHeight } = layout;

  const counts = dates.map(
    (d) => appointments.filter((a) => sameDay(new Date(a.startAt), d) && a.status !== "CANCELLED").length,
  );
  const maxCount = Math.max(0, ...counts);
  const starIndex = counts.findIndex((c) => c === maxCount && maxCount > 0);

  return (
    <div className="hidden overflow-hidden rounded-xl bg-white shadow-soft md:block">
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div
            className="grid bg-[#FBF4F6] text-center text-sm font-semibold"
            style={{ gridTemplateColumns: `72px repeat(${dates.length}, minmax(120px, 1fr))` }}
          >
            <div className="flex items-center justify-center bg-[#F0DDE9]/40 px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Heure
            </div>
            {dates.map((d, i) => {
              const today = isToday(d);
              const sat = isSaturday(d);
              const star = i === starIndex && !today;
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => onSelectDay(d)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 transition",
                    today && "bg-primary/10",
                    sat && !today && "bg-[#FFF1D6]/80",
                    sameDay(d, selected) && !today && "bg-[#FBF4F6]",
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                    {d.toLocaleDateString("fr-FR", { weekday: "short" })}{" "}
                    {d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
                  </span>
                  <span
                    className={cn(
                      "text-2xl font-bold leading-tight",
                      today ? "text-primary" : sat ? "text-gold" : "text-ink",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {today ? (
                    <span className="mt-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Aujourd&apos;hui
                    </span>
                  ) : star ? (
                    <span className="mt-0.5 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Jour fort
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink/45">{counts[i]} RDV</span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `72px repeat(${dates.length}, minmax(120px, 1fr))`,
              height: totalHeight,
            }}
          >
            <div className="relative border-r border-line bg-[#FBF4F6]/40">
              {rows.map((row) =>
                row.kind === "gap" ? (
                  <div
                    key={`gap-${row.startIndex}`}
                    className="absolute left-0 right-0 flex items-center justify-center border-y border-dashed border-line bg-[#FBF4F6] px-0.5"
                    style={{ top: row.top, height: row.height }}
                  >
                    <span className="text-center font-mono text-[9px] leading-tight text-ink/45">
                      {row.start.label}
                      <br />
                      {row.endLabel}
                    </span>
                  </div>
                ) : (
                  <div
                    key={row.slot.label}
                    className="absolute left-0 right-0 border-t border-line/60 px-1 text-center font-mono text-[10px] text-ink/40"
                    style={{ top: row.top, height: row.height }}
                  >
                    <span className="relative -top-2 bg-transparent">{row.slot.label}</span>
                  </div>
                ),
              )}
            </div>

            {dates.map((day) => {
              const dayAppts = appointments.filter((a) => sameDay(new Date(a.startAt), day));
              const today = isToday(day);
              const sat = isSaturday(day);
              const dayClosures = closures.filter((c) => {
                const s = new Date(c.startAt);
                const e = new Date(c.endAt);
                const start = new Date(day);
                start.setHours(0, 0, 0, 0);
                const end = new Date(day);
                end.setHours(23, 59, 59, 999);
                return s <= end && e >= start;
              });

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative border-r border-line last:border-r-0",
                    today && "bg-primary/[0.04]",
                    sat && !today && "bg-[#FFF1D6]/20",
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const aptId = e.dataTransfer.getData("appointmentId");
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const slot = agendaYToSlot(layout, y);
                    if (aptId) onDrop?.(day, slot.h, slot.m, aptId);
                  }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const slot = agendaYToSlot(layout, y);
                    onEmptySlotClick?.(day, slot.h, slot.m);
                  }}
                >
                  {rows.map((row) =>
                    row.kind === "gap" ? (
                      <button
                        key={`gap-${row.startIndex}`}
                        type="button"
                        aria-label={`Heures libres ${row.label}`}
                        title={`Libre ${row.label}`}
                        className="absolute left-0 right-0 border-y border-dashed border-line/70 bg-[#FBF4F6]/90 hover:bg-primary/[0.05]"
                        style={{ top: row.top, height: row.height }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const slot = agendaYToSlot(layout, row.top + (e.clientY - rect.top));
                          onEmptySlotClick?.(day, slot.h, slot.m);
                        }}
                      />
                    ) : (
                      <button
                        key={row.slot.label}
                        type="button"
                        aria-label={`Créneau ${row.slot.label}`}
                        className={cn(
                          "absolute left-0 right-0 border-t border-line/40 hover:bg-primary/[0.04]",
                          row.empty && "bg-[#FBF4F6]/35",
                        )}
                        style={{ top: row.top, height: row.height }}
                        onClick={() => onEmptySlotClick?.(day, row.slot.h, row.slot.m)}
                      />
                    ),
                  )}

                  {dayClosures.map((c) => {
                    const bStart = new Date(c.startAt);
                    const bEnd = new Date(c.endAt);
                    const dayStart = new Date(day);
                    dayStart.setHours(AGENDA_OPEN_HOUR, 0, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(AGENDA_CLOSE_HOUR, 0, 0, 0);
                    const clipStart = bStart < dayStart ? dayStart : bStart;
                    const clipEnd = bEnd > dayEnd ? dayEnd : bEnd;
                    if (clipEnd <= clipStart) return null;
                    return (
                      <div
                        key={c.id}
                        className="pointer-events-none absolute inset-x-1 z-[2] rounded-lg bg-ink/[0.06] px-2 py-1 text-[10px] font-semibold text-ink/60"
                        style={blockStyle(layout, clipStart, clipEnd)}
                      >
                        {c.reason || "Créneau bloqué"}
                      </div>
                    );
                  })}

                  {dayAppts.map((apt) => {
                    const start = new Date(apt.startAt);
                    const end = new Date(apt.endAt);
                    const color = staffColor(apt.staffId, palette);
                    const muted = apt.status === "CANCELLED" || apt.status === "NO_SHOW";
                    const surface = agendaAppointmentSurface(color, muted);
                    const active = apt.id === selectedAppointmentId;
                    return (
                      <div
                        key={apt.id}
                        className="absolute inset-x-1 z-10"
                        style={blockStyle(layout, start, end)}
                      >
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("appointmentId", apt.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt.id);
                          }}
                          className={cn(
                            "relative flex h-full w-full cursor-grab flex-col justify-between overflow-hidden rounded-lg border p-2 text-left shadow-sm transition hover:shadow-md active:cursor-grabbing",
                            surface.fill,
                            surface.border,
                            active && "ring-2 ring-primary",
                          )}
                        >
                          <span className={cn("absolute inset-y-0 left-0 w-1.5", surface.bar)} />
                          <div className="pl-1.5">
                            <div className="flex items-start justify-between gap-1">
                              <span className={cn("truncate text-xs font-bold text-ink", muted && "line-through")}>
                                {apt.customerName.trim() || "Cliente"}
                              </span>
                              <span className="flex shrink-0 flex-col items-end gap-0.5">
                                <span className="text-[10px] font-semibold text-ink/45">
                                  {APPOINTMENT_STATUS_LABEL[apt.status]}
                                </span>
                                <AppointmentPayBadge appointment={apt} />
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-ink/55">{apt.serviceName}</p>
                          </div>
                          <div className="mt-1 flex items-center justify-between rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold">
                            <span>{apt.price.toLocaleString("fr-MA")} MAD</span>
                            <span className={color.text}>{apt.staffName.split(" ")[0]}</span>
                          </div>
                        </button>
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
