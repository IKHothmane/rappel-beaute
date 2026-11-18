import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { bindPublicInstitute } from "@/lib/db/tenant-context";
import { publicRoute } from "@/lib/http/route-scope";
import { consumeDimensions } from "@/lib/rate-limit";
import { JOIN_FORM_IP_LIMIT_PER_HOUR, joinCreationRateLimits, previewJoinQr } from "@/lib/loyalty/join-qr";
import { parseMarketingWhatsappConsent, MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE } from "@/lib/loyalty/card-review";
import { LOYALTY_NAME_MAX_LENGTH, normalizeLoyaltyPhone, validLoyaltyPhone } from "@/lib/loyalty/profile-input";
import {
  applyLoyaltySession,
  applyLoyaltyVerificationRequest,
  readLoyaltyVerificationRequest,
} from "@/lib/loyalty/customer-session";
import { claimVerificationRequest, createVerificationRequest } from "@/lib/loyalty/customer-verification";

const noStore = { "Cache-Control": "no-store" };

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ code, error }, { status, headers: noStore });
}

export const GET = publicRoute(async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const qr = await previewJoinQr(token);
  if (!qr) return fail(404, "JOIN_QR_INVALID", "Ce QR n’est plus valable.");
  return NextResponse.json({
    organizationName: qr.organizationName,
    programName: qr.programName,
    visitsPerReward: qr.visitsPerReward,
    rewardLabel: qr.rewardLabel,
    active: qr.active,
  }, { headers: noStore });
});

export const POST = publicRoute(async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return fail(415, "INVALID_INPUT", "Utilisez le formulaire de fidélité.");
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(400, "INVALID_INPUT", "Demande invalide.");
  }
  const input = body as Record<string, unknown>;
  if (typeof input.token !== "string" || input.token.length > 64) {
    return fail(400, "JOIN_QR_INVALID", "QR de l’institut manquant.");
  }
  const ip = clientIp(request);
  const dimensions = input.action === "claim"
    ? [{ key: `loyalty:claim:ip:${ip}`, limit: 120, windowMs: 60_000, sensitivity: "sensitive" as const }]
    : joinCreationRateLimits(ip, input.token, JOIN_FORM_IP_LIMIT_PER_HOUR);
  const limited = await consumeDimensions(dimensions);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez dans un instant.", code: "RATE_LIMITED" },
      { status: 429, headers: { ...noStore, "Retry-After": String(limited.retryAfterSec ?? 60) } });
  }
  const qr = await previewJoinQr(input.token);
  if (!qr) return fail(404, "JOIN_QR_INVALID", "Ce QR n’est plus valable.");
  if (!qr.active) return fail(409, "PROGRAM_DISABLED", "Le programme de fidélité est en pause.");
  const { organizationId } = qr;
  bindPublicInstitute(organizationId);

  try {
    if (input.action === "claim") {
      const deviceToken = readLoyaltyVerificationRequest(request, organizationId);
      if (!deviceToken) return fail(404, "VERIFICATION_NOT_FOUND", "Cette demande n’est plus disponible sur cet appareil.");
      const session = await claimVerificationRequest(organizationId, deviceToken);
      const response = NextResponse.json({ cardPath: `/carte/${session.cardToken}/` }, { headers: noStore });
      applyLoyaltySession(response, organizationId, session);
      applyLoyaltyVerificationRequest(response, organizationId, { token: "", expiresAt: new Date(0) });
      return response;
    }
    if (input.action !== "request" || (input.mode !== "enroll" && input.mode !== "recover")) {
      return fail(400, "INVALID_INPUT", "Demande invalide.");
    }
    const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
    const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
    if (!firstName || !lastName || firstName.length > LOYALTY_NAME_MAX_LENGTH || lastName.length > LOYALTY_NAME_MAX_LENGTH) {
      return fail(400, "INVALID_NAME", "Indiquez votre prénom et votre nom.");
    }
    const phone = typeof input.phone === "string" && validLoyaltyPhone(input.phone) ? normalizeLoyaltyPhone(input.phone) : "";
    if (!/^\+?\d{8,15}$/.test(phone)) return fail(400, "INVALID_PHONE", "Indiquez un numéro de téléphone valide.");
    const consent = parseMarketingWhatsappConsent(input.marketingWhatsappConsent);
    if (!consent.ok) return fail(400, "INVALID_CONSENT", MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE);

    const verification = await createVerificationRequest({
      organizationId, mode: input.mode, firstName, lastName, phone, marketingWhatsappConsent: consent.value,
    });
    const response = NextResponse.json({ code: verification.code, expiresAt: verification.expiresAt },
      { status: 201, headers: noStore });
    applyLoyaltyVerificationRequest(response, organizationId, verification);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "VERIFICATION_NOT_FOUND") {
        return fail(404, error.message, "Cette demande n’est plus disponible. Recommencez auprès de l’institut.");
      }
      if (error.message === "VERIFICATION_PENDING") {
        return fail(409, error.message, "L’équipe de l’institut doit encore confirmer votre demande.");
      }
    }
    console.error("[POST /api/public/loyalty-join] échec de la demande");
    return fail(500, "VERIFICATION_FAILED", "Impossible de traiter votre demande.");
  }
});
