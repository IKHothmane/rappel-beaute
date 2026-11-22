import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL } from "@/lib/email/signup-lead";
import { clientIp } from "@/lib/http/client-ip";
import { publicRoute } from "@/lib/http/route-scope";
import { logger } from "@/lib/logger";
import { claimIdempotency, consumeDimensions, releaseIdempotency } from "@/lib/rate-limit";
import { SITE } from "@/lib/site";
import { verifyTrialFeedbackToken } from "@/lib/subscriptions/trial-feedback";
import { escapeHtml } from "@/lib/website-quote/email";

/**
 * POST /api/public/trial-feedback : avis d'un propriétaire à la fin de son essai (lien signé de l'e-mail).
 * Aucun stockage : l'avis est transmis par e-mail à l'équipe. Un seul avis par abonnement et par jour.
 */
const ROUTE = "/api/public/trial-feedback";
const HOUR_MS = 60 * 60_000;
const MAX_BODY_BYTES = 8 * 1024;
const TEXT_MAX = 1000;
const headers = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...headers, ...extra } });
}

// Dans les zones de texte, seuls \t, \n et \r sont admis.
const FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n?/g, "\n").trim();
  return text.length <= TEXT_MAX && !FORBIDDEN.test(text) ? text : null;
}

export const POST = publicRoute(async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return json({ error: "Demande invalide." }, 415);
  }
  const raw = await request.text().catch(() => null);
  if (raw === null || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return json({ error: "Demande invalide." }, 400);
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Demande invalide." }, 400);
  }
  // Champ piège : un robot le remplit, une personne ne le voit pas.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true }, 200);

  const subject = verifyTrialFeedbackToken(body.token);
  if (!subject) return json({ error: "Ce lien n'est pas valide. Utilisez le lien reçu par e-mail." }, 400);

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: "Choisissez une note de 1 à 5." }, 400);
  const liked = cleanText(body.liked);
  const improve = cleanText(body.improve);
  if (liked === null || improve === null) return json({ error: "Votre message est trop long ou invalide." }, 400);

  if (!isEmailConfigured()) {
    logger.error("trial feedback email not configured", { route: ROUTE });
    return json({ error: "L'envoi est momentanément indisponible. Écrivez-nous à " + SITE.email + "." }, 503);
  }

  const ip = clientIp(request);
  const limited = await consumeDimensions([
    { key: `trial-feedback:ip:${ip}`, limit: 10, windowMs: HOUR_MS, sensitivity: "sensitive" },
    { key: "trial-feedback:global", limit: 200, windowMs: HOUR_MS },
  ]);
  if (!limited.allowed) {
    return json({ error: "Trop de demandes. Réessayez plus tard." }, 429, { "Retry-After": String(limited.retryAfterSec ?? 3600) });
  }

  const fingerprint = createHash("sha256").update(JSON.stringify([subject.subscriptionId, rating, liked, improve])).digest("hex");
  const key = `trial-feedback:${fingerprint}`;
  if (!(await claimIdempotency(key, 24 * 60 * 60))) return json({ ok: true }, 200);

  const rows: Array<[string, string]> = [
    ["Institut", subject.orgName || "—"],
    ["Note", `${rating} / 5`],
    ["Ce qui a plu", liked || "Non renseigné"],
    ["À améliorer", improve || "Non renseigné"],
  ];
  const text = ["Avis reçu à la fin d'un essai Rappel Beauty.", "", ...rows.map(([label, value]) => `${label} : ${value}`)].join("\n");
  const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:24px;background:#f7f4f1;font-family:Arial,sans-serif;color:#1f1a17;">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;"><tr><td>
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b0894d;">${escapeHtml(SITE.name)}</p>
<h1 style="margin:0 0 16px;font-size:22px;">Avis de fin d'essai</h1>
<table role="presentation" style="width:100%;font-size:15px;line-height:1.45;">${rows
    .map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b635e;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>
</td></tr></table></body></html>`;

  try {
    await sendTransactionalEmail({
      to: PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
      subject: `Avis de fin d'essai — ${subject.orgName || "institut"} (${rating}/5)`,
      html,
      text,
    });
    return json({ ok: true }, 200);
  } catch (error) {
    await releaseIdempotency(key).catch(() => undefined);
    logger.error("trial feedback email failed", { route: ROUTE, reason: error instanceof Error ? error.name : "unknown" });
    return json({ error: "Votre avis n'a pas pu être envoyé. Réessayez dans un instant." }, 503);
  }
});
