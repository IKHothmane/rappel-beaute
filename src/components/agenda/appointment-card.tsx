"use client";

import type { Appointment } from "@/types/appointment";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_STYLE,
} from "@/modules/appointments/constants";
import { cn } from "@/lib/utils";

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
  const s = APPOINTMENT_STATUS_STYLE[appointment.status];
  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);
  const timeLabel = `${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — ${end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

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
        "group w-full rounded-xl border p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        s.bg,
        s.border,
        draggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {!compact ? (
        <p className="font-mono text-[10px] font-semibold text-ink/45">{timeLabel}</p>
      ) : null}
      <p className={cn("mt-0.5 truncate text-sm font-semibold", s.text)}>
        {appointment.serviceName}
      </p>
      <p className="truncate text-xs text-ink/60">{appointment.customerName}</p>
      {!compact ? (
        <p className="mt-1 truncate text-[10px] text-ink/45">
          {appointment.staffName}
          {appointment.resourceName ? ` · ${appointment.resourceName}` : ""}
        </p>
      ) : null}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
        <span className={cn("text-[10px] font-semibold", s.text)}>
          {APPOINTMENT_STATUS_LABEL[appointment.status]}
        </span>
      </div>
    </div>
  );
}
