import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { pool } from "@/lib/db/pool";
import { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL } from "@/lib/email/signup-lead";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import { tenantRoute } from "@/lib/http/route-scope";
import { logger } from "@/lib/logger";
import { claimIdempotency, consumeDimensions, identityHash, releaseIdempotency } from "@/lib/rate-limit";
import { websiteQuoteEmail } from "@/lib/website-quote/email";
import { parseWebsiteQuote } from "@/lib/website-quote/validation";
import { WEBSITE_OFFERS } from "@/components/website-creation/offers";

/**
 * POST /api/website-quote : demande de site web envoyée directement depuis Paramètres > Abonnement.
 * Les coordonnées viennent du compte connecté et de l'institut, jamais du corps de la requête :
 * seul le type de projet est choisi par l'utilisateur. Réservé au propriétaire.
 */
const ROUTE = "/api/website-quote";
const HOUR_MS = 60 * 60_000;
const DUPLICATE_WINDOW_SEC = 24 * 60 * 60;
const headers = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...headers, ...extra } });
}

export const POST = tenantRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;

  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  if (session.role !== "OWNER") {
    return json({ error: "Seul le propriétaire de l'institut peut demander un site web." }, 403);
  }

  const body: unknown = await request.json().catch(() => null);
  const projectId = body && typeof body === "object" && !Array.isArray(body) ? (body as { project?: unknown }).project : null;
  const offer = WEBSITE_OFFERS.find((o) => o.id === projectId);
  if (!offer) return json({ error: "Type de site inconnu." }, 400);

  if (!isEmailConfigured()) {
    logger.error("website quote (app) email not configured", { route: ROUTE });
    return json({ error: "L'envoi de la demande est momentanément indisponible. Contactez-nous par e-mail." }, 503);
  }

  const limited = await consumeDimensions([
    { key: `website-quote:org:${identityHash(session.organizationId)}`, limit: 4, windowMs: HOUR_MS, sensitivity: "sensitive" },
    { key: "website-quote:global", limit: 60, windowMs: HOUR_MS },
  ]);
  if (!limited.allowed) {
    return json({ error: "Trop de demandes. Réessayez plus tard." }, 429, { "Retry-After": String(limited.retryAfterSec ?? 3600) });
  }

  const { rows } = await pool.query<{
    name: string; phone: string | null; email: string | null; city: string | null; website: string | null; slug: string;
  }>(
    `SELECT name, phone, email, city, website, slug FROM "Organization" WHERE id = $1`,
    [session.organizationId],
  );
  const org = rows[0];
  if (!org) return json({ error: "Institut introuvable." }, 404);

  const fullName = `${session.firstName} ${session.lastName}`.trim();
  const message = [
    "Demande envoyée depuis l'application (Paramètres > Abonnement).",
    org.city ? `Ville : ${org.city}` : "",
    org.website ? `Site actuel : ${org.website}` : "",
    `Identifiant public : ${org.slug}`,
  ].filter(Boolean).join("\n");

  const parsed = parseWebsiteQuote({
    name: fullName,
    institute: org.name,
    email: session.email || org.email || "",
    phone: session.loginPhone || org.phone || "",
    project: offer.title,
    message,
  });
  if (!parsed.ok || parsed.honeypot) {
    // Coordonnées de l'institut incomplètes : on le dit clairement plutôt que d'envoyer une demande inexploitable.
    return json(
      { error: parsed.ok ? "Demande invalide." : `${parsed.error} Complétez les coordonnées de votre institut puis réessayez.` },
      422,
    );
  }
  const quote = parsed.value;

  const fingerprint = createHash("sha256")
    .update(JSON.stringify([session.organizationId, offer.id]))
    .digest("hex");
  const idempotencyKey = `website-quote:app:${fingerprint}`;
  if (!(await claimIdempotency(idempotencyKey, DUPLICATE_WINDOW_SEC))) {
    return json({ ok: true, alreadySent: true }, 200);
  }

  try {
    const mail = websiteQuoteEmail(quote, "l'application (Paramètres > Abonnement)");
    const sent = await sendTransactionalEmail({
      to: PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
      replyTo: quote.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    logger.info("website quote (app) email sent", { route: ROUTE, messageId: sent.messageId });
    return json({ ok: true }, 200);
  } catch (error) {
    await releaseIdempotency(idempotencyKey).catch(() => undefined);
    logger.error("website quote (app) email failed", {
      route: ROUTE,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return json({ error: "Votre demande n'a pas pu être envoyée. Réessayez dans un instant." }, 503);
  }
});
