import { NextResponse } from "next/server";
import { vapidPublicConfig } from "@/lib/push/vapid";
import { publicRoute } from "@/lib/http/route-scope";

export const GET = publicRoute(async function GET() {
  return NextResponse.json(vapidPublicConfig());
});
