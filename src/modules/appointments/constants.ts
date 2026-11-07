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
    bg: "bg-[#F0E7FF]",
    border: "border-[#7434B4]/30",
    text: "text-[#7434B4]",
    dot: "bg-[#7434B4]",
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
/** Minuit : les créneaux vont de 8 h à 00 h (dernier départ 23 h 30). */
export const AGENDA_CLOSE_HOUR = 24;
export const AGENDA_SLOT_MINUTES = 30;
/** Hauteur d’un créneau de 30 min occupé (cartes lisibles type mockup). */
export const AGENDA_SLOT_HEIGHT_PX = 72;
/** Vue Semaine / 3 jours : créneaux encore plus hauts. */
export const AGENDA_WEEK_SLOT_HEIGHT_PX = 84;

export const STATUS_TRANSITIONS: Partial<
  Record<AppointmentStatus, AppointmentStatus[]>
> = {
  PENDING: ["CONFIRMED", "COMPLETED", "CANCELLED"],
  CONFIRMED: ["ARRIVED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};
