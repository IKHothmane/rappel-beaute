import { NextResponse, type NextRequest } from "next/server";
import {
  requireFeatureWrite,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  adjustLoyaltyVisit,
  beginLoyaltyScan,
  confirmLoyaltyScan,
  markVisitRewardUsed,
} from "@/lib/loyalty/validation";
import { tenantRoute } from "@/lib/http/route-scope";

const errors: Record<string, [string, number]> = {
  PROGRAM_DISABLED: ["Le programme de fidélité est désactivé dans cet institut.", 400],
  CARD_NOT_FOUND: ["Carte introuvable pour cet institut.", 404],
  CARD_CHANGED: ["La fiche liée à cette carte a changé. Scannez à nouveau la carte.", 409],
  SCAN_INVALID: ["Le QR code ou la validation est invalide.", 400],
  SCAN_EXPIRED: ["Le scan a expiré. Scannez à nouveau la carte.", 409],
  ALREADY_VALIDATED: ["Ce scan a déjà été confirmé.", 409],
  REWARD_NOT_AVAILABLE: ["Cette récompense n'est plus disponible.", 409],
  REASON_REQUIRED: ["Indiquez la raison de la correction (3 caractères minimum).", 400],
  NO_CARD: ["Cette cliente n'a pas encore de carte de passages.", 404],
  VISIT_BELOW_ZERO: ["Le nombre de passages ne peut pas passer sous 0.", 409],
};

export const POST = tenantRoute(async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "loyalty");
  if (!auth.ok) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const raw = stripOrganizationId(body as Record<string, unknown>);
  const actor = {
    organizationId: auth.session.organizationId,
    actorId: auth.session.id,
    actorName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
  };

  try {
    if (raw.action === "scan") {
      if (typeof raw.token !== "string" || raw.token.length > 2048) throw new Error("SCAN_INVALID");
      const preview = await beginLoyaltyScan({ ...actor, rawToken: raw.token });
      return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
    }
    if (raw.action === "confirm") {
      if (typeof raw.validationId !== "string") throw new Error("SCAN_INVALID");
      const result = await confirmLoyaltyScan({ ...actor, validationId: raw.validationId });
      return NextResponse.json({ ok: true, ...result });
    }
    if (raw.action === "adjust-visit") {
      const write = await requireFeatureWrite(request, "loyalty");
      if (!write.ok) return write.response;
      if (raw.delta !== -1 || typeof raw.customerId !== "string" || !raw.customerId) {
        return NextResponse.json({ error: "Correction invalide." }, { status: 400 });
      }
      const result = await adjustLoyaltyVisit({
        ...actor,
        customerId: raw.customerId,
        delta: -1,
        reason: typeof raw.reason === "string" ? raw.reason : "",
      });
      return NextResponse.json({ ok: true, visits: result.visits });
    }
    if (raw.action === "use-reward") {
      if (typeof raw.rewardId !== "string" || !raw.rewardId) {
        return NextResponse.json({ error: "Récompense manquante." }, { status: 400 });
      }
      await markVisitRewardUsed(actor.organizationId, raw.rewardId, actor.actorId, actor.actorName);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known = errors[code];
    if (known) return NextResponse.json({ error: known[0], code }, { status: known[1] });
    console.error("[POST /api/loyalty/scan]", error);
    return NextResponse.json({ error: "Impossible de traiter la carte de fidélité." }, { status: 500 });
  }
});
