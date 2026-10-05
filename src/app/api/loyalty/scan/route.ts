import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { markVisitRewardUsed, previewLoyaltyScan, validateLoyaltyVisit } from "@/lib/loyalty/validation";

function scanError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "PROGRAM_DISABLED") {
    return NextResponse.json(
      { error: "Le programme de fidélité est désactivé dans cet institut." },
      { status: 400 },
    );
  }
  if (code === "CARD_NOT_FOUND") {
    return NextResponse.json({ error: "Carte introuvable pour cet institut." }, { status: 404 });
  }
  if (code === "NO_COMPLETED_APPOINTMENT") {
    return NextResponse.json(
      { error: "Aucun rendez-vous terminé à valider pour cette cliente." },
      { status: 409 },
    );
  }
  if (code === "ALREADY_VALIDATED") {
    return NextResponse.json(
      { error: "Ce rendez-vous a déjà un passage fidélité." },
      { status: 409 },
    );
  }
  if (code === "APPOINTMENT_NOT_COMPLETED" || code === "APPOINTMENT_MISMATCH") {
    return NextResponse.json({ error: "Ce rendez-vous ne peut pas être validé." }, { status: 409 });
  }
  if (code === "REWARD_NOT_AVAILABLE") {
    return NextResponse.json({ error: "Cette récompense n'est plus disponible." }, { status: 409 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "loyalty");
  if (!auth.ok) return auth.response;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const preview = await previewLoyaltyScan(auth.session.organizationId, token);
    return NextResponse.json(preview);
  } catch (error) {
    const known = scanError(error);
    if (known) return known;
    console.error("[GET /api/loyalty/scan]", error);
    return NextResponse.json({ error: "Impossible de lire la carte." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "loyalty");
  if (!auth.ok) return auth.response;
  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    if (raw.action === "use-reward") {
      const rewardId = String(raw.rewardId ?? "");
      if (!rewardId) return NextResponse.json({ error: "Récompense manquante." }, { status: 400 });
      await markVisitRewardUsed(auth.session.organizationId, rewardId);
      return NextResponse.json({ ok: true });
    }
    const token = String(raw.token ?? "");
    const appointmentId = String(raw.appointmentId ?? "");
    if (!token || !appointmentId) {
      return NextResponse.json({ error: "Scan incomplet." }, { status: 400 });
    }
    const result = await validateLoyaltyVisit(
      auth.session.organizationId,
      token,
      appointmentId,
      auth.session.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    const known = scanError(error);
    if (known) return known;
    console.error("[POST /api/loyalty/scan]", error);
    return NextResponse.json({ error: "Impossible de valider le passage." }, { status: 500 });
  }
}
