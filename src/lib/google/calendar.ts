import { getSessionSecret, signJwt, verifyJwt } from "@/lib/auth/crypto";
import { publicAppOrigin, SITE } from "@/lib/site";
import { BUSINESS_TZ } from "@/lib/time/business-timezone";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_LIST_SCOPE = "https://www.googleapis.com/auth/calendar.calendarlist.readonly";
const EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email";
const SCOPES = `${CALENDAR_SCOPE} ${CALENDAR_LIST_SCOPE} ${EMAIL_SCOPE}`;

const TIMEZONE = BUSINESS_TZ;

export type GoogleOAuthState = {
  purpose: "gcal";
  orgId: string;
  userId: string;
  redirectUri: string;
};

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
};

export type GoogleCalendarEventInput = {
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  appointmentId: string;
  cancelled?: boolean;
};

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_NOT_CONFIGURED");
  return id;
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_NOT_CONFIGURED");
  return secret;
}

export function googleRedirectUri(origin: string): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = (publicAppOrigin() || origin).replace(/\/$/, "");
  return `${base}/api/integrations/google-calendar/callback`;
}

export function signGoogleOAuthState(payload: GoogleOAuthState): string {
  return signJwt(payload, getSessionSecret(), 10 * 60);
}

export function verifyGoogleOAuthState(token: string): GoogleOAuthState | null {
  const payload = verifyJwt<GoogleOAuthState & Record<string, unknown>>(
    token,
    getSessionSecret(),
  );
  if (
    !payload ||
    payload.purpose !== "gcal" ||
    !payload.orgId ||
    !payload.userId ||
    !payload.redirectUri
  ) {
    return null;
  }
  return {
    purpose: "gcal",
    orgId: payload.orgId,
    userId: payload.userId,
    redirectUri: payload.redirectUri,
  };
}

export function googleAuthorizeUrl(opts: { redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "select_account consent",
    include_granted_scopes: "false",
    state: opts.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function parseTokenResponse(res: Response): Promise<GoogleTokenSet> {
  const body = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || "GOOGLE_TOKEN_ERROR");
  }
  const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 3600;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + Math.max(60, expiresIn - 60) * 1000),
  };
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokenSet> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return parseTokenResponse(res);
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenSet> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  const tokens = await parseTokenResponse(res);
  return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<{
  email: string;
  accountId: string | null;
}> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await res.json()) as { email?: string; sub?: string; error?: string };
  if (!res.ok || !body.email) {
    throw new Error("GOOGLE_USERINFO_ERROR");
  }
  return { email: body.email, accountId: body.sub ?? null };
}

export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    /* révocation best-effort */
  }
}

function eventBody(input: GoogleCalendarEventInput) {
  return {
    summary: input.summary,
    description: input.description || undefined,
    start: { dateTime: input.startAt.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: input.endAt.toISOString(), timeZone: TIMEZONE },
    status: input.cancelled ? "cancelled" : "confirmed",
    source: {
      title: SITE.name,
      url: (publicAppOrigin() || SITE.appUrl) + "/agenda/",
    },
    extendedProperties: {
      private: { rappelAppointmentId: input.appointmentId },
    },
  };
}

async function calendarFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export type GoogleCalendarListItem = {
  id: string;
  name: string;
  primary: boolean;
  canWrite: boolean;
};

export async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendarListItem[]> {
  const res = await calendarFetch(accessToken, "/users/me/calendarList?minAccessRole=writer");
  const body = (await res.json()) as {
    items?: Array<{
      id?: string;
      summary?: string;
      primary?: boolean;
      accessRole?: string;
    }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(body.error?.message || `GOOGLE_CALENDAR_LIST_${res.status}`);
  }
  return (body.items ?? [])
    .filter((item) => Boolean(item.id))
    .map((item) => ({
      id: item.id!,
      name: item.summary?.trim() || item.id!,
      primary: Boolean(item.primary),
      canWrite: item.accessRole === "owner" || item.accessRole === "writer",
    }));
}

export function pickDefaultGoogleCalendar(
  items: GoogleCalendarListItem[],
  orgName: string,
): GoogleCalendarListItem {
  const writable = items.filter((item) => item.canWrite);
  const pool = writable.length > 0 ? writable : items;
  const needle = orgName.trim().toLowerCase();
  const named = pool.find((item) => item.name.trim().toLowerCase() === needle);
  if (named) return named;
  const primary = pool.find((item) => item.primary);
  if (primary) return primary;
  return pool[0] ?? { id: "primary", name: "Agenda principal", primary: true, canWrite: true };
}

export async function upsertGoogleCalendarEvent(opts: {
  accessToken: string;
  calendarId: string;
  eventId: string | null;
  input: GoogleCalendarEventInput;
}): Promise<string | null> {
  const calendarId = encodeURIComponent(opts.calendarId || "primary");
  const body = JSON.stringify(eventBody(opts.input));

  if (opts.input.cancelled) {
    if (!opts.eventId) return null;
    const del = await calendarFetch(
      opts.accessToken,
      `/calendars/${calendarId}/events/${encodeURIComponent(opts.eventId)}`,
      { method: "DELETE" },
    );
    if (del.status === 404 || del.status === 410 || del.ok) return null;
    const patch = await calendarFetch(
      opts.accessToken,
      `/calendars/${calendarId}/events/${encodeURIComponent(opts.eventId)}`,
      { method: "PATCH", body },
    );
    if (!patch.ok) throw new Error(`GOOGLE_EVENT_CANCEL_${patch.status}`);
    return opts.eventId;
  }

  if (opts.eventId) {
    const patch = await calendarFetch(
      opts.accessToken,
      `/calendars/${calendarId}/events/${encodeURIComponent(opts.eventId)}`,
      { method: "PATCH", body },
    );
    if (patch.ok) {
      const json = (await patch.json()) as { id?: string };
      return json.id ?? opts.eventId;
    }
    if (patch.status !== 404 && patch.status !== 410) {
      throw new Error(`GOOGLE_EVENT_PATCH_${patch.status}`);
    }
  }

  const insert = await calendarFetch(
    opts.accessToken,
    `/calendars/${calendarId}/events`,
    { method: "POST", body },
  );
  if (!insert.ok) {
    throw new Error(`GOOGLE_EVENT_INSERT_${insert.status}`);
  }
  const json = (await insert.json()) as { id?: string };
  return json.id ?? null;
}
