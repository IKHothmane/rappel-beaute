import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { listPlans, updatePlan } from "@/lib/subscriptions/plans";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const activeOnly = request.nextUrl.searchParams.get("all") !== "1";
  const plans = await listPlans(activeOnly);
  return adminJson({ plans });
}

export async function POST(request: NextRequest) {
  return adminError("Création de plan via seed/migration uniquement en V1.", 501);
}
