import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { enrollFromJoinQr, previewJoinQr } from "@/lib/loyalty/join-qr";
import { consumeDimensions } from "@/lib/rate-limit";

function publicError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "JOIN_QR_INVALID") {
    return NextResponse.json({ error: "Ce QR n'est plus valable." }, { status: 404 });
  }
  if (code === "PROGRAM_DISABLED") {
    return NextResponse.json({ error: "Le programme de fidélité est désactivé." }, { status: 400 });
  }
  if (code === "INVALID_PHONE") {
    return NextResponse.json({ error: "Indiquez un téléphone de 8 à 10 chiffres." }, { status: 400 });
  }
  if (code === "INVALID_NAME") {
    return NextResponse.json({ error: "Indiquez le prénom et le nom." }, { status: 400 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const qr = await previewJoinQr(token);
  if (!qr) return NextResponse.json({ error: "Ce QR n'est plus valable." }, { status: 404 });
  return NextResponse.json({
    organizationName: qr.organizationName,
    programName: qr.programName,
    visitsPerReward: qr.visitsPerReward,
    rewardLabel: qr.rewardLabel,
    active: qr.active,
  });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limited = await consumeDimensions([
    { key: `loyalty:join:ip:${ip}`, limit: 20, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 3600) } },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  } | null;
  if (!body?.token) return NextResponse.json({ error: "QR manquant." }, { status: 400 });

  try {
    const created = await enrollFromJoinQr({
      token: body.token,
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      phone: body.phone ?? "",
      email: body.email,
    });
    return NextResponse.json({ ok: true, cardPath: `/carte/${created.cardToken}/` });
  } catch (error) {
    const known = publicError(error);
    if (known) return known;
    console.error("[POST /api/public/loyalty-join]", error);
    return NextResponse.json({ error: "Impossible de créer la carte." }, { status: 500 });
  }
}
