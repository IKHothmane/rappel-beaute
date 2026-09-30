import type { Appointment } from "@/types/appointment";
import { upsertGoogleCalendarEvent } from "@/lib/google/calendar";
import {
  getAppointmentGoogleEventId,
  getOrganizationName,
  getValidGoogleAccessToken,
  setAppointmentGoogleEventId,
} from "@/lib/db/google-calendar";

const CANCELLED_STATUSES = new Set(["CANCELLED", "NO_SHOW"]);

function eventSummary(appointment: Appointment): string {
  return `${appointment.serviceName} · ${appointment.customerName}`;
}

function eventDescription(appointment: Appointment, orgName: string): string {
  const lines = [
    `Institut : ${orgName}`,
    `Praticienne : ${appointment.staffName}`,
    appointment.resourceName ? `Espace : ${appointment.resourceName}` : null,
    `Source : Rappel Beauty`,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function pushAppointmentToGoogle(
  organizationId: string,
  appointment: Appointment,
): Promise<void> {
  const auth = await getValidGoogleAccessToken(organizationId);
  if (!auth) return;

  const eventId = await getAppointmentGoogleEventId(appointment.id);
  const orgName = await getOrganizationName(organizationId);
  const cancelled = CANCELLED_STATUSES.has(appointment.status);

  const nextId = await upsertGoogleCalendarEvent({
    accessToken: auth.accessToken,
    calendarId: auth.calendarId,
    eventId,
    input: {
      summary: eventSummary(appointment),
      description: eventDescription(appointment, orgName),
      startAt: new Date(appointment.startAt),
      endAt: new Date(appointment.endAt),
      appointmentId: appointment.id,
      cancelled,
    },
  });

  if (nextId !== eventId) {
    await setAppointmentGoogleEventId(appointment.id, nextId);
  }
}

/** Ne bloque jamais la création / mise à jour du RDV. */
export function syncAppointmentToGoogle(
  organizationId: string,
  appointment: Appointment,
): void {
  void pushAppointmentToGoogle(organizationId, appointment).catch((error) => {
    console.error("[google-calendar sync]", appointment.id, error);
  });
}

const LIVE_STATUSES = new Set(["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS"]);

/** Envoie les RDV à venir (6 mois) vers le calendrier Google de l'institut. */
export async function pushUpcomingAppointmentsToGoogle(
  organizationId: string,
): Promise<{ synced: number; failed: number }> {
  const auth = await getValidGoogleAccessToken(organizationId);
  if (!auth) return { synced: 0, failed: 0 };

  const { listAppointmentsByOrg } = await import("@/lib/db/appointments");
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 6);

  const appointments = await listAppointmentsByOrg(organizationId, { from, to });
  let synced = 0;
  let failed = 0;

  for (const appointment of appointments) {
    if (!LIVE_STATUSES.has(appointment.status)) continue;
    try {
      await pushAppointmentToGoogle(organizationId, appointment);
      synced += 1;
    } catch (error) {
      failed += 1;
      console.error("[google-calendar bulk]", appointment.id, error);
    }
  }

  return { synced, failed };
}
