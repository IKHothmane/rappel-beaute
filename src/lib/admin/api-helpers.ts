import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePlatformSession } from "@/lib/auth/api-guard";

export function adminJson<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function adminError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function requireAdmin(request: NextRequest) {
  return requirePlatformSession(request);
}

export function requireSuperAdmin(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth;
  if (auth.session?.role !== "SUPER_ADMIN") {
    return {
      ok: false as const,
      response: adminError("Réservé au super administrateur.", 403),
    };
  }
  return auth;
}
