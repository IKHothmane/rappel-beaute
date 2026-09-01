import type { AppointmentStatus } from "@/types/appointment";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  ARRIVED: "Arrivée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  NO_SHOW: "No-show",
};

/** Couleurs réservées aux statuts RDV */
export const APPOINTMENT_STATUS_STYLE: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  PENDING: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    bg: "bg-primary-light",
    border: "border-primary/25",
    text: "text-primary-dark",
    dot: "bg-primary",
  },
  ARRIVED: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    dot: "bg-sky-500",
  },
  IN_PROGRESS: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-800",
    dot: "bg-violet-500",
  },
  COMPLETED: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  NO_SHOW: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

export const AGENDA_OPEN_HOUR = 8;
export const AGENDA_CLOSE_HOUR = 20;
export const AGENDA_SLOT_MINUTES = 30;
export const AGENDA_SLOT_HEIGHT_PX = 52;

export const STATUS_TRANSITIONS: Partial<
  Record<AppointmentStatus, AppointmentStatus[]>
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};
