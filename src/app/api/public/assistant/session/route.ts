import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import {
  AssistantSessionError,
  normalizeWidgetOrigin,
  openWidgetSession,
  readWidgetSession,
} from "@/lib/db/assistant-session";

function cors(response: NextResponse, origin: string | null) {
  if (!origin) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

function statusFor(code: AssistantSessionError["code"]) {
  if (code === "ORIGIN_DENIED" || code === "CLIENT_AUTHORITY") return 403;
  if (code === "WIDGET_NOT_FOUND") return 404;
  if (code === "RATE_LIMITED") return 429;
  return 400;
}

export async function OPTIONS(request: NextRequest) {
  const origin = normalizeWidgetOrigin(request.headers.get("origin") ?? "");
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(request: NextRequest) {
  const originHeader = request.headers.get("origin");
  const origin = normalizeWidgetOrigin(originHeader ?? "");
  const reply = (body: Record<string, unknown>, status: number) =>
    cors(NextResponse.json(body, { status }), origin);

  if (!origin) return reply({ error: "Domaine refusé." }, 403);

  let body: { publicId?: unknown; organizationId?: unknown };
  try {
    body = (await request.json()) as { publicId?: unknown; organizationId?: unknown };
  } catch {
    return reply({ error: "Requête invalide." }, 400);
  }
  if (typeof body.publicId !== "string" || !body.publicId.trim()) {
    return reply({ error: "Widget inconnu." }, 400);
  }

  try {
    const opened = await openWidgetSession({
      publicId: body.publicId.trim(),
      origin,
      ip: clientIp(request),
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
    });
    return reply({ token: opened.token, expiresAt: opened.expiresAt.toISOString() }, 200);
  } catch (error) {
    if (error instanceof AssistantSessionError) {
      return reply({ error: error.message }, statusFor(error.code));
    }
    return reply({ error: "Session impossible." }, 500);
  }
}

export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Session absente." }, { status: 401 });
  const session = await readWidgetSession(token);
  if (!session) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  return NextResponse.json({ organizationName: session.organizationName });
}
