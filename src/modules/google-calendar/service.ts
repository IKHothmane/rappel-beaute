import type { GoogleCalendarOption, GoogleCalendarStatus } from "@/types/google-calendar";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const res = await fetch("/api/integrations/google-calendar/status/", fetchOpts);
  return parseJson<GoogleCalendarStatus>(res);
}

export async function listGoogleCalendarOptions(): Promise<GoogleCalendarOption[]> {
  const res = await fetch("/api/integrations/google-calendar/calendars/", fetchOpts);
  const body = await parseJson<{ calendars: GoogleCalendarOption[] }>(res);
  return body.calendars;
}

export async function selectGoogleCalendar(
  calendarId: string,
  calendarName: string,
): Promise<{ synced: number; failed: number }> {
  const res = await fetch("/api/integrations/google-calendar/calendars/", {
    ...fetchOpts,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarId, calendarName }),
  });
  const body = await parseJson<{ ok: boolean; synced?: number; failed?: number }>(res);
  return { synced: body.synced ?? 0, failed: body.failed ?? 0 };
}

export async function syncAgendaToGoogle(): Promise<{ synced: number; failed: number }> {
  const res = await fetch("/api/integrations/google-calendar/sync/", {
    ...fetchOpts,
    method: "POST",
  });
  return parseJson<{ synced: number; failed: number }>(res);
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const res = await fetch("/api/integrations/google-calendar/disconnect/", {
    ...fetchOpts,
    method: "POST",
  });
  await parseJson<{ ok: boolean }>(res);
}
