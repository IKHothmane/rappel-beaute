"use client";

import type { Appointment, AppointmentStatus } from "@/types/appointment";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_STYLE,
  STATUS_TRANSITIONS,
} from "@/modules/appointments/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppointmentDetailsProps = {
  appointment: Appointment;
  onEdit: () => void;
  onStatusChange: (status: AppointmentStatus) => void;
  onCancel: () => void;
};

export function AppointmentDetails({
  appointment,
  onEdit,
  onStatusChange,
  onCancel,
}: AppointmentDetailsProps) {
  const s = APPOINTMENT_STATUS_STYLE[appointment.status];
  const start = new Date(appointment.startAt);
  const transitions = STATUS_TRANSITIONS[appointment.status] ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-xl font-semibold">{appointment.serviceName}</p>
        <p className="mt-1 text-sm text-ink/60">{appointment.customerName}</p>
        <p className="mt-2 text-sm">
          {start.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          ·{" "}
          {start.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="text-sm text-ink/50">
          {appointment.staffName}
          {appointment.resourceName ? ` · ${appointment.resourceName}` : ""}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-[#FBF4F6] p-4">
        <p className="font-mono text-2xl font-bold">
          {appointment.price.toLocaleString("fr-MA")} MAD
        </p>
        {appointment.deposit ? (
          <p className="mt-1 text-xs text-ink/45">
            Acompte : {appointment.deposit.toLocaleString("fr-MA")} MAD
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
          s.bg,
          s.text,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", s.dot)} />
        {APPOINTMENT_STATUS_LABEL[appointment.status]}
      </div>

      {appointment.notes ? (
        <p className="text-sm text-ink/60">{appointment.notes}</p>
      ) : null}

      <div className="space-y-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" className="w-full" onClick={onEdit}>
          Modifier
        </Button>

        {transitions.includes("ARRIVED") ? (
          <Button
            type="button"
            variant="soft"
            className="w-full"
            onClick={() => onStatusChange("ARRIVED")}
          >
            Marquer présente
          </Button>
        ) : null}
        {transitions.includes("IN_PROGRESS") ? (
          <Button
            type="button"
            variant="soft"
            className="w-full"
            onClick={() => onStatusChange("IN_PROGRESS")}
          >
            Commencer le soin
          </Button>
        ) : null}
        {transitions.includes("COMPLETED") ? (
          <Button
            type="button"
            variant="soft"
            className="w-full"
            onClick={() => onStatusChange("COMPLETED")}
          >
            Terminer
          </Button>
        ) : null}
        {transitions.includes("CONFIRMED") ? (
          <Button
            type="button"
            variant="soft"
            className="w-full"
            onClick={() => onStatusChange("CONFIRMED")}
          >
            Confirmer
          </Button>
        ) : null}
        {transitions.includes("NO_SHOW") ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-red-600"
            onClick={() => onStatusChange("NO_SHOW")}
          >
            Marquer no-show
          </Button>
        ) : null}
        {transitions.includes("CANCELLED") ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-red-600"
            onClick={onCancel}
          >
            Annuler le rendez-vous
          </Button>
        ) : null}
      </div>
    </div>
  );
}
