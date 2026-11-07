"use client";

import type { Appointment } from "@/types/appointment";
import { AppointmentPayBadge } from "@/components/agenda/appointment-pay-badge";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_STYLE,
} from "@/modules/appointments/constants";
import { cn } from "@/lib/utils";
import { agendaAppointmentSurface, staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";

type AppointmentCardProps = {
  appointment: Appointment;
  compact?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
};

export function AppointmentCard({
  appointment,
  compact,
  draggable,
  onClick,
  style,
  className,
}: AppointmentCardProps) {
  const palette = useStaffPalette();
  const color = staffColor(appointment.staffId, palette);
  const muted = appointment.status === "CANCELLED" || appointment.status === "NO_SHOW";
  const surface = agendaAppointmentSurface(color, muted, appointment.status);
  const s = APPOINTMENT_STATUS_STYLE[appointment.status];
  const completed = appointment.status === "COMPLETED";
  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);
  const durationMin = (end.getTime() - start.getTime()) / 60_000;
  const short = compact || durationMin <= 30;
  const timeLabel = short
    ? start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : `${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — ${end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("appointmentId", appointment.id);
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      style={style}
      className={cn(
        "group relative flex h-full w-full flex-col",
        "overflow-hidden rounded-xl border",
        "p-2.5 pl-3.5 text-left",
        "shadow-[0_3px_12px_rgba(60,20,40,0.07)]",
        "transition-all duration-200",
        "hover:z-30 hover:shadow-lg",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#B83E72]",
        "motion-reduce:transition-none",
        surface.fill,
        surface.border,
        draggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1.5", surface.bar)} />
      <p
        className={cn(
          "truncate text-sm font-semibold",
          completed ? "text-[#4A1F7A]" : "text-ink",
          muted && "line-through",
        )}
      >
        {appointment.customerName.trim() || "Cliente"}
      </p>
      <p className="font-mono text-[10px] font-semibold text-ink/45">{timeLabel}</p>
      <p className="truncate text-xs text-ink/60">{appointment.serviceName}</p>
      <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-ink/45">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            completed ? "bg-[#7434B4]" : color.bar,
          )}
        />
        <span className="truncate">
          {appointment.staffName}
          {appointment.resourceName ? ` · ${appointment.resourceName}` : ""}
        </span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            completed
              ? "bg-[#7434B4] text-white"
              : cn(s.bg, s.text),
          )}
        >
          {APPOINTMENT_STATUS_LABEL[appointment.status]}
        </span>
        <AppointmentPayBadge appointment={appointment} />
      </div>
    </div>
  );
}
