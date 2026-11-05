"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import {
  AGENDA_CLOSE_HOUR,
  AGENDA_OPEN_HOUR,
  AGENDA_WEEK_SLOT_HEIGHT_PX,
} from "@/modules/appointments/constants";
import { staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import {
  agendaBlockPosition,
  agendaYToSlot,
  buildAgendaLayout,
  type AgendaTimeLayout,
} from "@/components/agenda/agenda-time-scale";
import { layoutOverlappingEvents } from "@/components/agenda/agenda-overlap-layout";
import { isSameBusinessDay } from "@/lib/time/business-timezone";
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
  return isSameBusinessDay(a, b);
}

function blockStyle(layout: AgendaTimeLayout, start: Date, end: Date) {
  return agendaBlockPosition(layout, start, end, 64);
}

function isToday(d: Date) {
  const n = new Date();
  return sameDay(d, n);
}

function isSaturday(d: Date) {
  return d.getDay() === 6;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatDuration(mins: number) {
  if (mins < 60) return `${Math.max(1, Math.round(mins))} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function formatClock(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
        {
          slotHeight: AGENDA_WEEK_SLOT_HEIGHT_PX,
          emptyHeight: 52,
          gapHeight: 64,
        },
      ),
    [appointments],
  );
  const { rows, totalHeight } = layout;

  const cols = `56px repeat(${dates.length}, minmax(0, 1fr))`;

  return (
    <div className="hidden w-full min-w-0 overflow-hidden rounded-2xl border border-[#F1E8EC] bg-white shadow-[0_8px_30px_rgba(60,20,40,0.06)] md:block">
      <div className="w-full min-w-0">
          <div
            className="grid border-b border-[#F1E8EC] bg-white text-center"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="flex items-end justify-center px-2 pb-4 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35">
              Heure
            </div>
            {dates.map((d) => {
              const today = isToday(d);
              const sat = isSaturday(d);
              const selectedDay = sameDay(d, selected);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => onSelectDay(d)}
                  className={cn(
                    "relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 px-1 py-3 transition",
                    today && "bg-[#FFF5F8]",
                    sat && !today && "bg-[#FFFBF3]",
                    selectedDay && !today && "bg-[#FAF6F8]",
                  )}
                >
                  {today ? (
                    <span className="absolute inset-x-1 top-1.5 h-[calc(100%-0.4rem)] rounded-xl ring-2 ring-[#B83E72]/70" />
                  ) : null}
                  <span
                    className={cn(
                      "relative text-[11px] font-bold uppercase tracking-[0.1em]",
                      today ? "text-[#B83E72]" : "text-ink/40",
                    )}
                  >
                    {d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}.
                  </span>
                  <span
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-full text-[17px] font-bold leading-none",
                      today ? "bg-[#B83E72] text-white shadow-md shadow-[#B83E72]/25" : sat ? "text-[#C79A3B]" : "text-ink",
                    )}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: cols,
              height: totalHeight,
            }}
          >
            <div className="relative border-r border-[#F1E8EC] bg-[#FCF8FA]">
              {rows.map((row) =>
                row.kind === "gap" ? (
                  <div
                    key={`gap-${row.startIndex}`}
                    className="absolute left-0 right-0 flex items-center justify-center border-y border-dashed border-[#E8D6DE] bg-[#F7EEF2] px-0.5"
                    style={{ top: row.top, height: row.height }}
                  >
                    <span className="text-center font-mono text-[9px] leading-tight text-ink/40">
                      {row.start.label}
                      <br />
                      {row.endLabel}
                    </span>
                  </div>
                ) : (
                  <div
                    key={row.slot.label}
                    className="absolute left-0 right-0 border-t border-[#F1E8EC]/80 px-1 text-center font-mono text-[10px] text-ink/40"
                    style={{ top: row.top, height: row.height }}
                  >
                    <span className="relative -top-2.5 bg-[#FCF8FA] px-0.5">{row.slot.label}</span>
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
                    "relative min-w-0 overflow-hidden border-r border-[#F1E8EC] last:border-r-0",
                    today && "bg-[#FFF7FA] ring-2 ring-inset ring-[#B83E72]/55",
                    sat && !today && "bg-[#FFFBF3]/70",
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
                        className="absolute left-0 right-0 border-y border-dashed border-[#E8D6DE]/80 bg-[#F7EEF2]/70 hover:bg-primary/[0.05]"
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
                          "absolute left-0 right-0 border-t border-[#F1E8EC]/70 hover:bg-primary/[0.04]",
                          row.empty && "bg-[#FAF6F8]/40",
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
                        className="pointer-events-none absolute inset-x-1.5 z-[2] flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-ink/15 bg-[repeating-linear-gradient(-45deg,#F3F0F2,#F3F0F2_6px,#E9E4E7_6px,#E9E4E7_12px)] px-2 py-1 text-[10px] font-semibold text-ink/50"
                        style={blockStyle(layout, clipStart, clipEnd)}
                      >
                        {c.reason || "Pause"}
                      </div>
                    );
                  })}

                  {layoutOverlappingEvents(dayAppts).map(({ event: apt, left, width, columns }) => {
                    const start = new Date(apt.startAt);
                    const end = new Date(apt.endAt);
                    const color = staffColor(apt.staffId, palette);
                    const muted = apt.status === "CANCELLED" || apt.status === "NO_SHOW";
                    const active = apt.id === selectedAppointmentId;
                    const durationMin = (end.getTime() - start.getTime()) / 60_000;
                    const narrow = columns > 1;
                    const short = durationMin <= 35;
                    const name = apt.customerName.trim() || "Cliente";

                    return (
                      <div
                        key={apt.id}
                        className="absolute z-10 px-[3px]"
                        style={{
                          ...blockStyle(layout, start, end),
                          left: `${left}%`,
                          width: `${width}%`,
                          right: "auto",
                          minWidth: 0,
                        }}
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
                            "group relative flex h-full w-full cursor-grab flex-col overflow-hidden rounded-xl border border-white/70 text-left shadow-[0_2px_10px_rgba(60,20,40,0.08)] transition-all duration-200 hover:z-30 hover:shadow-lg active:cursor-grabbing",
                            color.soft,
                            muted && "bg-gray-100 opacity-70",
                            active && "ring-2 ring-[#B83E72]",
                            short || narrow ? "gap-1 p-2 pl-3" : "gap-1.5 p-2.5 pl-3.5",
                          )}
                        >
                          <span className={cn("absolute inset-y-1.5 left-1.5 w-1 rounded-full", muted ? "bg-gray-400" : color.bar)} />

                          <div className="flex min-w-0 items-start gap-2">
                            {!narrow ? (
                              <span
                                className={cn(
                                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm",
                                  muted ? "bg-gray-400" : color.bar,
                                )}
                              >
                                {initials(name)}
                              </span>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className={cn("truncate text-[13px] font-bold leading-tight text-ink", muted && "line-through")}>
                                {name}
                              </p>
                              <p className="truncate text-[12px] leading-snug text-ink/55">{apt.serviceName}</p>
                            </div>
                            {!short && !narrow ? (
                              <Users size={13} className={cn("mt-0.5 shrink-0 opacity-70", color.text)} />
                            ) : null}
                          </div>

                          {!short ? (
                            <div className="mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 pl-0.5 text-[11px] font-semibold text-ink/50">
                              <span className={cn("rounded-md px-1.5 py-0.5", color.soft, color.text)}>
                                {formatDuration(durationMin)}
                              </span>
                              <span className="truncate font-mono">
                                {formatClock(start)} – {formatClock(end)}
                              </span>
                            </div>
                          ) : (
                            <p className="truncate pl-0.5 font-mono text-[11px] font-semibold text-ink/45">
                              {formatClock(start)}
                            </p>
                          )}
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
  );
}
