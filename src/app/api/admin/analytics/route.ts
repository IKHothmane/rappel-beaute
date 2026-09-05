import type { NextRequest } from "next/server";
import { adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { getPlatformAnalytics } from "@/lib/db/platform-metrics";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const data = await getPlatformAnalytics();
  return adminJson(data);
}
