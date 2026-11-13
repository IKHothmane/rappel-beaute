import type { NextRequest } from "next/server";

export function editorialMutationAllowed(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!request.headers.get("content-type")?.startsWith("application/json")) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // Clients non navigateur ; la session plateforme reste obligatoire.
  const publicHost = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host
  )
    .split(",")[0]
    .trim();
  try {
    return new URL(origin).host === publicHost;
  } catch {
    return false;
  }
}
