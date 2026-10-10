import { NextResponse } from "next/server";
import { vapidPublicConfig } from "@/lib/push/vapid";

export async function GET() {
  return NextResponse.json(vapidPublicConfig());
}
