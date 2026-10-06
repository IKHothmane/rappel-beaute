import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readWidgetSession } from "@/lib/db/assistant-session";
import { getClientIp } from "@/lib/http/client-ip";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";

export async function requireWidgetOrganization(
  request: NextRequest,
  rate?: { key: string; limit: number; windowMs: number },
) {
  const forbidden = ["organizationId", "employeeId", "staffId", "customerId", "appointmentId"];
  if (forbidden.some((key) => request.nextUrl.searchParams.has(key))) {
    return NextResponse.json({ error: "Paramètre non autorisé." }, { status: 403 });
  }
  const ip = getClientIp(request);
  const window = rate ?? RATE_POLICIES.publicRead;
  const rl = await consumeDimensions([
    {
      key: `${rate?.key ?? "assistant:catalog"}:${ip}`,
      limit: window.limit,
      windowMs: window.windowMs,
    },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Session absente." }, { status: 401 });
  const session = await readWidgetSession(token);
  if (!session) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  return session;
}
