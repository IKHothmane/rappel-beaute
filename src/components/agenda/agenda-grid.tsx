"use client";

import { useMemo, useState } from "react";
import { AGENDA_CLOSE_HOUR, AGENDA_OPEN_HOUR } from "@/modules/appointments/constants";
import type { Appointment } from "@/types/appointment";
import type { StaffAgendaContext } from "@/types/staff";
import { LEAVE_TYPE_LABEL } from "@/types/staff";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import { AgendaStackPicker } from "@/components/agenda/agenda-stack-picker";
import { agendaAppointmentSurface, staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import {
  agendaBlockPosition,
  agendaYToSlot,
  buildAgendaLayout,
  type AgendaTimeLayout,
} from "@/components/agenda/agenda-time-scale";
import {
  layoutOverlappingEvents,
  peersInOverlapGroup,
} from "@/components/agenda/agenda-overlap-layout";
import { cn } from "@/lib/utils";

type StaffCol = { id: string; name: string };

type AgendaGridProps = {
  date: Date;
  staff: StaffCol[];
  appointments: Appointment[];
  staffContexts?: StaffAgendaContext[];
  /** staff = colonnes employées ; resource = colonnes cabines (DnD change resourceId) */
  columnMode?: "staff" | "resource";
  onAppointmentClick: (id: string) => void;
  onSlotDrop?: (
    columnId: string,
    hour: number,
    minute: number,
    appointmentId: string,
  ) => void;
  onEmptySlotClick?: (columnId: string, hour: number, minute: number) => void;
};

function blockStyle(layout: AgendaTimeLayout, start: Date, end: Date) {
  return agendaBlockPosition(layout, start, end, 56);
}

export function AgendaGrid({
  date,
  staff,
  appointments,
  staffContexts = [],
  columnMode = "staff",
  onAppointmentClick,
  onSlotDrop,
  onEmptySlotClick,
}: AgendaGridProps) {
  const palette = useStaffPalette();
  const [stackPeers, setStackPeers] = useState<Appointment[] | null>(null);
  const liveStackPeers = useMemo(() => {
    if (!stackPeers) return null;
    const byId = new Map(appointments.map((a) => [a.id, a]));
    const next = stackPeers
      .map((peer) => byId.get(peer.id))
      .filter((a): a is Appointment => Boolean(a));
    return next.length > 0 ? next : null;
  }, [stackPeers, appointments]);
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
  const isEmpty = appointments.length === 0;

  return (
    <div className="hidden w-full min-w-0 overflow-hidden rounded-xl bg-white shadow-soft md:block">
      <div className="border-b border-line px-4 py-3 text-sm font-bold text-ink">
        {date
          .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
          .replace(/^\p{L}/u, (letter) => letter.toUpperCase())}
      </div>
      <div className="w-full min-w-0">
          <div
            className="grid border-b border-line bg-[#FBF4F6]"
            style={{ gridTemplateColumns: `56px repeat(${Math.max(staff.length, 1)}, minmax(0, 1fr))` }}
          >
            <div className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-ink/40">
              Heure
            </div>
            {staff.map((s) => {
              const color = columnMode === "staff" ? staffColor(s.id, palette) : null;
              return (
              <div key={s.id} className="flex items-center gap-2 border-l border-line px-3 py-3 text-sm font-semibold">
                {color ? <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color.bar)} /> : null}
                <span className="truncate">{s.name}</span>
              </div>
              );
            })}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `56px repeat(${Math.max(staff.length, 1)}, minmax(0, 1fr))`,
              height: totalHeight,
            }}
          >
            {isEmpty ? (
              <div className="pointer-events-none absolute inset-0 z-[5] flex items-start justify-center pt-16">
                <div className="rounded-2xl border border-[#F0DDE4] bg-white/90 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
                  <p className="text-sm font-semibold text-[#54112F]">Aucun rendez-vous pour cette journée</p>
                  <p className="mt-1 text-xs text-[#876879]">
                    Cliquez un créneau libre pour créer un rendez-vous.
                  </p>
                </div>
              </div>
            ) : null}
            {/* Time labels + grid lines */}
            <div className="relative border-r border-line">
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
                    className="absolute left-0 right-0 border-t border-line/70 px-2 font-mono text-[10px] text-ink/40"
                    style={{ top: row.top, height: row.height }}
                  >
                    <span className="relative -top-2 bg-white px-1">{row.slot.label}</span>
                  </div>
                ),
              )}
            </div>

            {staff.map((col) => {
              const colAppts = appointments.filter((a) =>
                columnMode === "resource" ? a.resourceId === col.id : a.staffId === col.id,
              );
              const positioned = layoutOverlappingEvents(colAppts);
              const ctx =
                columnMode === "staff"
                  ? staffContexts.find((c) => c.id === col.id)
                  : undefined;

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
                    const slot = agendaYToSlot(layout, y);
                    if (aptId) onSlotDrop?.(col.id, slot.h, slot.m, aptId);
                  }}
                >
                  {rows.map((row) =>
                    row.kind === "gap" ? (
                      <button
                        key={`gap-${row.startIndex}`}
                        type="button"
                        aria-label={`Heures libres ${row.label} ${col.name}`}
                        title={`Libre ${row.label}`}
                        className="absolute left-0 right-0 border-y border-dashed border-line/70 bg-[#FBF4F6]/90 hover:bg-primary/[0.05]"
                        style={{ top: row.top, height: row.height }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const slot = agendaYToSlot(layout, row.top + (e.clientY - rect.top));
                          onEmptySlotClick?.(col.id, slot.h, slot.m);
                        }}
                      />
                    ) : (
                      <button
                        key={row.slot.label}
                        type="button"
                        aria-label={`Créneau ${row.slot.label} ${col.name}`}
                        className={cn(
                          "absolute left-0 right-0 border-t border-line/50 hover:bg-primary/[0.04]",
                          row.empty && "bg-[#FBF4F6]/35",
                        )}
                        style={{ top: row.top, height: row.height }}
                        onClick={() => onEmptySlotClick?.(col.id, row.slot.h, row.slot.m)}
                      />
                    ),
                  )}

                  {/* Congés / absences approuvés (Staff réel) */}
                  {columnMode === "staff"
                    ? (ctx?.leaves ?? [])
                        .filter((leave) => {
                          const start = new Date(leave.startAt);
                          const end = new Date(leave.endAt);
                          const dayStart = new Date(date);
                          dayStart.setHours(0, 0, 0, 0);
                          const dayEnd = new Date(date);
                          dayEnd.setHours(23, 59, 59, 999);
                          return start <= dayEnd && end >= dayStart;
                        })
                        .map((leave) => {
                          const bStart = new Date(leave.startAt);
                          const bEnd = new Date(leave.endAt);
                          const dayStart = new Date(date);
                          dayStart.setHours(AGENDA_OPEN_HOUR, 0, 0, 0);
                          const dayEnd = new Date(date);
                          dayEnd.setHours(AGENDA_CLOSE_HOUR, 0, 0, 0);
                          const clipStart = bStart < dayStart ? dayStart : bStart;
                          const clipEnd = bEnd > dayEnd ? dayEnd : bEnd;
                          if (clipEnd <= clipStart) return null;
                          return (
                            <div
                              key={leave.id}
                              className="absolute inset-x-1 z-[2] rounded-lg border border-dashed border-amber-300 bg-amber-50/80 px-2 py-1 text-[10px] font-medium text-amber-800"
                              style={blockStyle(layout, clipStart, clipEnd)}
                            >
                              {LEAVE_TYPE_LABEL[leave.type] ?? "Absence"}
                            </div>
                          );
                        })
                    : null}

                  {positioned.map(
                    ({ event: apt, left, width, zIndex, columns, groupId }) => {
                    const start = new Date(apt.startAt);
                    const end = new Date(apt.endAt);
                    return (
                      <div
                        key={apt.id}
                        className="absolute px-[2px]"
                        style={{
                          ...blockStyle(layout, start, end),
                          left: `${left}%`,
                          width: `${width}%`,
                          right: "auto",
                          minWidth: 0,
                          zIndex,
                        }}
                        title={
                          columns > 1
                            ? `${columns} rendez-vous — cliquer pour choisir`
                            : undefined
                        }
                      >
                        <AppointmentCard
                          appointment={apt}
                          compact
                          draggable
                          onClick={() => {
                            if (columns > 1) {
                              setStackPeers(peersInOverlapGroup(positioned, groupId));
                              return;
                            }
                            onAppointmentClick(apt.id);
                          }}
                          className="h-full overflow-hidden shadow-md ring-1 ring-black/5"
                        />
                      </div>
                    );
                  },
                  )}
                </div>
              );
            })}
          </div>
      </div>

      {liveStackPeers ? (
        <AgendaStackPicker
          appointments={liveStackPeers}
          onClose={() => setStackPeers(null)}
          onSelect={(id) => {
            setStackPeers(null);
            onAppointmentClick(id);
          }}
        />
      ) : null}
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
  const palette = useStaffPalette();
  return (
    <div className="hidden rounded-xl bg-white p-4 shadow-soft md:block">
      <h2 className="mb-3 text-sm font-bold text-ink">
        {anchor
          .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
          .replace(/^\p{L}/u, (letter) => letter.toUpperCase())}
      </h2>
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
          const dayAppts = appointments.filter((a) => {
            const s = new Date(a.startAt);
            return (
              s.getFullYear() === d.getFullYear() &&
              s.getMonth() === d.getMonth() &&
              s.getDate() === d.getDate()
            );
          });
          const count = dayAppts.length;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelectDay(d)}
              className={cn(
                "min-h-[88px] rounded-lg border p-2 text-left transition hover:border-primary/40",
                inMonth ? "border-line bg-white" : "border-transparent bg-[#FBF4F6]/50 text-ink/35",
              )}
            >
              <span className="font-mono text-sm font-semibold">{d.getDate()}</span>
              <span className="mt-1 flex flex-col gap-0.5">
                {dayAppts.slice(0, 3).map((apt) => {
                  const muted = apt.status === "CANCELLED" || apt.status === "NO_SHOW";
                  const surface = agendaAppointmentSurface(
                    staffColor(apt.staffId, palette),
                    muted,
                    apt.status,
                  );
                  const time = new Date(apt.startAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <span
                      key={apt.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] font-semibold text-ink",
                        surface.fill,
                        muted && "line-through",
                      )}
                    >
                      {time} {apt.customerName.trim() || "Cliente"}
                    </span>
                  );
                })}
                {count > 3 ? (
                  <span className="text-[10px] font-semibold text-ink/45">+{count - 3}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
