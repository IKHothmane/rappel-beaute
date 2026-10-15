import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { canManageGoogleCalendar } from "@/lib/rbac";
import {
  googleAuthorizeUrl,
  googleRedirectUri,
  isGoogleCalendarConfigured,
  signGoogleOAuthState,
} from "@/lib/google/calendar";

function agendaError(request: NextRequest, reason: string) {
  const here = request.nextUrl.origin.replace(/\/$/, "");
  const origin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(here)
    ? here
    : (process.env.NEXT_PUBLIC_APP_URL || here).replace(/\/$/, "");
  const url = new URL(`${origin}/agenda/`);
  url.searchParams.set("google", "error");
  url.searchParams.set("reason", reason);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    url.searchParams.set("__host", "app");
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;

  if (!canManageGoogleCalendar(auth.session.role)) {
    return agendaError(request, "forbidden");
  }

  if (!isGoogleCalendarConfigured()) {
    return agendaError(request, "not-configured");
  }

  const redirectUri = googleRedirectUri(request.nextUrl.origin);
  const state = signGoogleOAuthState({
    purpose: "gcal",
    orgId: auth.session.organizationId,
    userId: auth.session.id,
    redirectUri,
  });

  return NextResponse.redirect(googleAuthorizeUrl({ redirectUri, state }));
}
