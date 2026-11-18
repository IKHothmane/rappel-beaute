import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import { clientIp } from "@/lib/http/client-ip";
import { publicRoute } from "@/lib/http/route-scope";
import { logger } from "@/lib/logger";
import { claimIdempotency, consumeDimensions, releaseIdempotency } from "@/lib/rate-limit";
import { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL } from "@/lib/email/signup-lead";
import { websiteQuoteEmail } from "@/lib/website-quote/email";
import { parseWebsiteQuote } from "@/lib/website-quote/validation";

const ROUTE = "/api/public/website-quote";
const HOUR_MS = 60 * 60_000;
const MAX_BODY_BYTES = 16 * 1024;
const DUPLICATE_WINDOW_SEC = 10 * 60;
const headers = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...headers, ...extra } });
}

export const POST = publicRoute(async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return json({ error: "Utilisez le formulaire de demande de devis." }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "Demande trop volumineuse." }, 413);
  }
  const raw = await request.text().catch(() => null);
  if (raw === null) return json({ error: "Demande invalide." }, 400);
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return json({ error: "Demande trop volumineuse." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Demande invalide." }, 400);
  }

  const parsed = parseWebsiteQuote(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  // Robot : réponse identique à un succès, aucun envoi et aucun compteur consommé.
  if (parsed.honeypot) return json({ ok: true }, 200);
  const quote = parsed.value;

  if (!isEmailConfigured()) {
    logger.error("website quote email not configured", { route: ROUTE });
    return json({ error: "L'envoi de la demande est momentanément indisponible. Contactez-nous directement par e-mail ou par téléphone." }, 503);
  }

  // Clés à cardinalité bornée : une par IP validée (ou « unknown ») et un compteur global.
  const ip = clientIp(request);
  const limited = await consumeDimensions([
    { key: `website-quote:ip:${ip}`, limit: 5, windowMs: HOUR_MS, sensitivity: "sensitive" },
    { key: "website-quote:global", limit: 60, windowMs: HOUR_MS },
  ]);
  if (!limited.allowed) {
    return json(
      { error: "Trop de demandes. Réessayez plus tard." },
      429,
      { "Retry-After": String(limited.retryAfterSec ?? 3600) },
    );
  }

  // Un double clic ou un renvoi identique ne doit pas produire un second e-mail.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([quote.email, quote.institute, quote.project, quote.message]))
    .digest("hex");
  const idempotencyKey = `website-quote:${fingerprint}`;
  if (!(await claimIdempotency(idempotencyKey, DUPLICATE_WINDOW_SEC))) {
    return json({ ok: true }, 200);
  }

  try {
    const mail = websiteQuoteEmail(quote);
    const sent = await sendTransactionalEmail({
      to: PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
      replyTo: quote.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    logger.info("website quote email sent", { route: ROUTE, messageId: sent.messageId });
    return json({ ok: true }, 200);
  } catch (error) {
    await releaseIdempotency(idempotencyKey).catch(() => undefined);
    // Pas de détail du fournisseur ni de donnée du visiteur dans les journaux.
    logger.error("website quote email failed", {
      route: ROUTE,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return json({ error: "Votre demande n'a pas pu être envoyée. Réessayez dans un instant ou contactez-nous directement." }, 503);
  }
});
