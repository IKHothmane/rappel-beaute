import { logger } from "@/lib/logger";
import { SITE } from "@/lib/site";

export class EmailSendError extends Error {
  constructor(
    message = "EMAIL_SEND_FAILED",
    public userMessage = "Impossible d'envoyer l'e-mail. Réessayez.",
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

/** `sara@example.com` -> `s***@e***.com` : les journaux ne contiennent jamais un destinataire en clair. */
export function maskEmail(value: string): string {
  const at = value.lastIndexOf("@");
  if (at < 1) return "***";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local[0]}***@${host[0] ?? ""}***${tld}`;
}

/** Retire toute adresse e-mail d'un texte (corps d'erreur du fournisseur qui peut citer le destinataire). */
export function scrubEmails(text: string): string {
  return text.replace(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}/g, "[email]");
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function mailFromAddress(): string {
  return process.env.MAIL_FROM?.trim() || `Rappel Beauty <${SITE.email}>`;
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ messageId: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new EmailSendError("EMAIL_NOT_CONFIGURED");
  }

  const from = mailFromAddress();
  logger.info("resend send start", {
    route: "email/send",
    to: maskEmail(opts.to),
    from,
    subject: opts.subject,
  });

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        reply_to: opts.replyTo?.trim() || SITE.email,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? String((error as { cause?: unknown }).cause)
        : error instanceof Error
          ? error.message
          : "unknown";
    logger.error("resend network error", { route: "email/send", detail: scrubEmails(cause) });
    throw new EmailSendError(
      "EMAIL_NETWORK",
      "Impossible de joindre le service e-mail. Vérifiez la connexion puis réessayez.",
    );
  }

  if (!res.ok) {
    const raw = (await res.text().catch(() => "")).slice(0, 400);
    logger.error("resend send failed", {
      route: "email/send",
      status: res.status,
      detail: scrubEmails(raw),
    });
    let userMessage = "Impossible d'envoyer l'e-mail. Réessayez.";
    try {
      const parsed = JSON.parse(raw) as { message?: string; name?: string };
      const msg = (parsed.message ?? "").toLowerCase();
      if (msg.includes("not verified")) {
        userMessage =
          "Le domaine d'envoi n'est pas encore vérifié chez Resend. Ajoutez les DNS, puis réessayez.";
      } else if (msg.includes("restricted") || parsed.name === "restricted_api_key") {
        userMessage =
          "La clé Resend n'autorise pas cet envoi. Vérifiez le domaine lié à la clé API.";
      }
    } catch {
      /* ignore */
    }
    throw new EmailSendError("EMAIL_SEND_FAILED", userMessage);
  }

  const payload = (await res.json().catch(() => null)) as { id?: string } | null;
  const messageId = payload?.id ?? null;
  logger.info("resend send ok", {
    route: "email/send",
    to: maskEmail(opts.to),
    from,
    messageId,
  });
  return { messageId };
}
