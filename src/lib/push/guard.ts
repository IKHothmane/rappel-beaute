import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { consumeDimensions } from "@/lib/rate-limit";

export async function limitCustomerPush(request: NextRequest, token: string) {
  const ip = clientIp(request);
  return consumeDimensions([
    { key: `push:ip:${ip}`, limit: 20, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
    { key: `push:token:${token || "none"}`, limit: 8, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
  ]);
}

export function tooMany() {
  return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
}
