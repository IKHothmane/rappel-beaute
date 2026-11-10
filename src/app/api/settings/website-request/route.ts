import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite, stripOrganizationId } from "@/lib/auth/api-guard";
import { EmailSendError, isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import {
  WEBSITE_REQUEST_NOTIFY_EMAIL,
  websiteRequestEmail,
} from "@/lib/email/website-request";
import { tenantRoute } from "@/lib/http/route-scope";

export const POST = tenantRoute(async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "settings");
  if (!auth.ok) return auth.response;

  if (auth.session.role !== "OWNER") {
    return NextResponse.json(
      { error: "Seul le propriétaire peut demander un site web." },
      { status: 403 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "L'envoi d'e-mail n'est pas configuré pour le moment." },
      { status: 503 },
    );
  }

  let body: { message?: unknown };
  try {
    body = stripOrganizationId((await request.json()) as Record<string, unknown>) as {
      message?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Le message est trop long (2 000 caractères max)." },
      { status: 400 },
    );
  }

  const personName =
    [auth.session.firstName, auth.session.lastName].filter(Boolean).join(" ").trim() ||
    auth.session.email;

  const content = websiteRequestEmail({
    personName,
    institut: auth.session.orgName || "Institut",
    email: auth.session.email,
    orgSlug: auth.session.orgSlug || "",
    message,
  });

  try {
    await sendTransactionalEmail({
      to: WEBSITE_REQUEST_NOTIFY_EMAIL,
      subject: content.subject,
      html: content.html,
      text: content.text,
      replyTo: auth.session.email,
    });
  } catch (error) {
    if (error instanceof EmailSendError) {
      return NextResponse.json({ error: error.userMessage }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Impossible d'envoyer la demande. Réessayez." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
});
