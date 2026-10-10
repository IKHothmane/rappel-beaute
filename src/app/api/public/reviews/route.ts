import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { consumeDimensions } from "@/lib/rate-limit";
import {
  listPublishedReviews,
  previewPublicReview,
  reportPublishedReview,
  submitPublicReview,
  type ReviewGateCode,
} from "@/lib/reviews/public-review";

function gateResponse(code: ReviewGateCode) {
  if (code === "TOKEN_EXPIRED") {
    return NextResponse.json({ error: "Ce lien d'avis a expiré." }, { status: 410 });
  }
  if (code === "DUPLICATE") {
    return NextResponse.json({ error: "Un avis existe déjà pour ce rendez-vous." }, { status: 409 });
  }
  if (code === "NOT_ELIGIBLE") {
    return NextResponse.json({ error: "Ce rendez-vous ne peut pas recevoir d'avis." }, { status: 403 });
  }
  if (code === "RATING_INVALID") {
    return NextResponse.json({ error: "Choisissez une note de 1 à 5." }, { status: 400 });
  }
  if (code === "COMMENT_INVALID") {
    return NextResponse.json({ error: "Le commentaire doit contenir entre 8 et 800 caractères." }, { status: 400 });
  }
  return NextResponse.json({ error: "Lien d'avis invalide." }, { status: 404 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!slug) return NextResponse.json({ error: "Institut introuvable." }, { status: 404 });
  if (!token) {
    const list = await listPublishedReviews(slug);
    return NextResponse.json(list);
  }
  const preview = await previewPublicReview(slug, token);
  if (!preview.ok) return gateResponse(preview.code);
  return NextResponse.json(preview);
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    token?: string;
    rating?: number;
    comment?: string;
    action?: string;
    reviewId?: string;
    reason?: string;
  } | null;
  if (!body?.slug) return NextResponse.json({ error: "Institut introuvable." }, { status: 404 });

  const limited = await consumeDimensions([
    { key: `review:public:ip:${ip}`, limit: 8, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
    {
      key: `review:public:token:${String(body.token ?? body.reviewId ?? "none")}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
      sensitivity: "sensitive",
    },
  ]);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 3600) } },
    );
  }

  if (body.action === "report") {
    const ok = await reportPublishedReview(body.slug, String(body.reviewId ?? ""), String(body.reason ?? ""));
    if (!ok) return NextResponse.json({ error: "Signalement impossible." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const rating = Number(body.rating);
  const result = await submitPublicReview({
    slug: body.slug,
    token: String(body.token ?? ""),
    rating,
    comment: String(body.comment ?? ""),
  });
  if (!result.ok) return gateResponse(result.code);
  return NextResponse.json({ ok: true });
}
