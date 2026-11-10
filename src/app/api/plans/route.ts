import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { listPlans } from "@/lib/subscriptions/plans";
import { tenantRoute } from "@/lib/http/route-scope";

export const GET = tenantRoute(async function GET(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;

  const plans = await listPlans(true);
  return NextResponse.json({ plans });
});
