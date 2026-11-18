import { NextResponse, type NextRequest } from "next/server";
import { requireFeatureWrite } from "@/lib/auth/api-guard";
import { tenantRoute } from "@/lib/http/route-scope";
import { consumeDimensions, identityHash } from "@/lib/rate-limit";
import {
  approveVerificationRequest,
  previewVerificationRequest,
  revokeCustomerLoyaltySessions,
} from "@/lib/loyalty/customer-verification";

const headers = { "Cache-Control": "no-store" };

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ code, error }, { status, headers });
}

function parseCode(value: unknown) {
  if (typeof value !== "string" || value.length > 24) return null;
  const code = value.replace(/[ -]/g, "").toUpperCase();
  return /^[A-F0-9]{12}$/.test(code) ? code : null;
}

async function guard(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "loyalty");
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const { id, firstName, lastName, organizationId } = auth.session;
  if (auth.session.role !== "OWNER" && auth.session.role !== "MANAGER") {
    return { ok: false as const, response: fail(403, "FORBIDDEN", "Seuls le propriétaire et le gestionnaire peuvent vérifier une identité.") };
  }
  const limited = await consumeDimensions([
    { key: `loyalty:verification-staff:${identityHash(organizationId)}:${identityHash(id)}`,
      limit: 30, windowMs: 60_000, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) {
    return { ok: false as const, response: fail(429, "RATE_LIMITED", "Trop de demandes. Réessayez dans un instant.") };
  }
  return { ok: true as const, organizationId, actor: { id, name: `${firstName} ${lastName}`.trim() } };
}

export const GET = tenantRoute(async function GET(request: NextRequest) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const code = parseCode(request.nextUrl.searchParams.get("code"));
  if (!code) return fail(400, "INVALID_INPUT", "Indiquez le code présenté par la cliente.");
  const verification = await previewVerificationRequest(auth.organizationId, code);
  if (!verification) return fail(404, "VERIFICATION_NOT_FOUND", "Demande introuvable ou expirée.");
  return NextResponse.json({ request: verification }, { headers });
});

export const POST = tenantRoute(async function POST(request: NextRequest) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return fail(415, "INVALID_INPUT", "Demande invalide.");
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "INVALID_INPUT", "Demande invalide.");
  const input = body as Record<string, unknown>;
  const customerId = input.customerId;
  if (customerId !== undefined && (typeof customerId !== "string" || !/^[A-Za-z0-9_.:-]{1,80}$/.test(customerId))) {
    return fail(400, "INVALID_INPUT", "Fiche cliente invalide.");
  }
  const code = parseCode(input.code);
  if (input.action === "revoke" && !customerId) return fail(400, "CUSTOMER_REQUIRED", "Choisissez la fiche cliente.");
  if (input.action !== "revoke" && (!code || input.identityConfirmed !== true)) {
    return fail(400, "INVALID_INPUT", "Indiquez le code et confirmez la vérification de l’identité.");
  }
  try {
    if (input.action === "revoke" && typeof customerId === "string") {
      await revokeCustomerLoyaltySessions(auth.organizationId, customerId, auth.actor);
    } else {
      await approveVerificationRequest({
        organizationId: auth.organizationId, actor: auth.actor, code: code!,
        customerId: typeof customerId === "string" ? customerId : undefined,
        phoneChangeConfirmed: input.phoneChangeConfirmed === true,
      });
    }
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "VERIFICATION_NOT_FOUND":
          return fail(404, error.message, "Demande introuvable ou expirée.");
        case "CUSTOMER_NOT_FOUND":
        case "CARD_NOT_FOUND":
          return fail(404, error.message, "Fiche cliente ou carte active introuvable.");
        case "CUSTOMER_REQUIRED":
          return fail(400, error.message, "Identifiez la fiche existante avant de récupérer la carte.");
        case "PHONE_CHANGE_CONFIRMATION_REQUIRED":
          return fail(409, error.message, "Vérifiez le nouveau numéro de la cliente et confirmez son remplacement.");
        case "PHONE_ALREADY_KNOWN":
          return fail(409, error.message, "Vérifiez la fiche existante avant d’associer ce numéro.");
      }
    }
    console.error("[POST /api/loyalty/verification] échec de la demande");
    return fail(500, "VERIFICATION_FAILED", "Impossible de traiter la demande.");
  }
});
