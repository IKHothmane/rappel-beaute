import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPublicProductOrder } from "@/lib/db/public-shop";
import { getClientIp } from "@/lib/http/client-ip";
import {
  claimIdempotency,
  consumeDimensions,
  identityHash,
  phoneKey,
  RATE_POLICIES,
  releaseIdempotency,
} from "@/lib/rate-limit";
import type { PublicProductOrderInput } from "@/types/public-booking";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const ip = getClientIp(request);

  const ipRl = await consumeDimensions([
    {
      key: `order:ip:${slug}:${ip}`,
      ...RATE_POLICIES.productOrder.ip,
      sensitivity: "sensitive",
    },
  ]);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Trop de commandes. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(ipRl.retryAfterSec ?? 60) } },
    );
  }

  let body: PublicProductOrderInput;
  try {
    body = (await request.json()) as PublicProductOrderInput;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = phoneKey(body.customer?.phone ?? "");
  const phoneRl = await consumeDimensions([
    {
      key: `order:phone:${phone}`,
      ...RATE_POLICIES.productOrder.phone,
      sensitivity: "sensitive",
    },
  ]);
  if (!phoneRl.allowed) {
    return NextResponse.json(
      { error: "Trop de commandes pour ce numéro. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(phoneRl.retryAfterSec ?? 3600) } },
    );
  }

  const headerKey = request.headers.get("idempotency-key")?.trim();
  const lines = (body.lines ?? [])
    .map((l) => `${l.productId}:${l.quantity}`)
    .sort()
    .join(",");
  const idem =
    headerKey && headerKey.length <= 80
      ? identityHash(`${slug}:${headerKey}`)
      : identityHash(`${slug}:${phone}:${lines}`);
  const fresh = await claimIdempotency(`order:${idem}`, 120);
  if (!fresh) {
    return NextResponse.json(
      { error: "Cette commande a déjà été envoyée." },
      { status: 409 },
    );
  }

  try {
    const result = await createPublicProductOrder(slug, body);
    return NextResponse.json(result);
  } catch (error) {
    await releaseIdempotency(`order:${idem}`);
    const message =
      error instanceof Error ? error.message : "Impossible d’enregistrer la demande.";
    const status =
      message.includes("introuvable") || message.includes("disponibles")
        ? 404
        : message.includes("Stock") ||
            message.includes("Panier") ||
            message.includes("Téléphone") ||
            message.includes("Nom") ||
            message.includes("Quantité") ||
            message.includes("Trop")
          ? 400
          : 500;
    if (status === 500) {
      console.error("[POST /api/public/[slug]/product-orders]", error);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
