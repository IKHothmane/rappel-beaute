import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePlatformSession } from "@/lib/auth/api-guard";

export function adminJson<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function adminError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function requireAdmin(request: NextRequest) {
  return requirePlatformSession(request);
}
