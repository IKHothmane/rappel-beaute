import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite } from "@/lib/auth/api-guard";
import {
  creditVisitWithInstituteCode,
  issueLoyaltyCreditCode,
  listCreditServices,
} from "@/lib/loyalty/validation";

function creditError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "CODE_INVALID") {
    return NextResponse.json({ error: "Code institut invalide ou expiré." }, { status: 400 });
  }
  if (code === "CARD_NOT_FOUND") {
    return NextResponse.json({ error: "Carte introuvable pour cet institut." }, { status: 404 });
  }
  if (code === "SERVICE_NOT_FOUND") {
    return NextResponse.json({ error: "Choisissez une prestation de l'institut." }, { status: 400 });
  }
  if (code === "SERVICE_NOT_ELIGIBLE") {
    return NextResponse.json(
      { error: "Cette prestation n'est pas éligible au programme de passages." },
      { status: 409 },
    );
  }
  if (code === "PROGRAM_DISABLED") {
    return NextResponse.json({ error: "Le programme de fidélité est désactivé." }, { status: 400 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "loyalty");
  if (!auth.ok) return auth.response;
  const services = await listCreditServices(auth.session.organizationId);
  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "loyalty");
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    token?: string;
    code?: string;
    serviceId?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  try {
    if (body.action === "issue") {
      const issued = await issueLoyaltyCreditCode({
        organizationId: auth.session.organizationId,
        actorId: auth.session.id,
      });
      return NextResponse.json(issued);
    }
    if (body.action === "redeem") {
      const result = await creditVisitWithInstituteCode({
        organizationId: auth.session.organizationId,
        rawToken: String(body.token ?? ""),
        code: String(body.code ?? ""),
        serviceId: String(body.serviceId ?? ""),
        actorId: auth.session.id,
        actorName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      });
      return NextResponse.json({
        ok: true,
        customerName: result.customerName,
        serviceName: result.serviceName,
        cycle: result.cycle,
        visitsPerReward: result.visitsPerReward,
        visits: result.visits,
      });
    }
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    const known = creditError(error);
    if (known) return known;
    console.error("[POST /api/loyalty/credit-code]", error);
    return NextResponse.json({ error: "Impossible d'ajouter le passage." }, { status: 500 });
  }
}
