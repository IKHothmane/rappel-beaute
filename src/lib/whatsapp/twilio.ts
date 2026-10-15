import { normalizePhoneForWa } from "@/lib/db/whatsapp";
import type { SendWhatsAppApiResult } from "@/lib/whatsapp/send";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function twilioCredentialsPresent() {
  return Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN"));
}

export function parseInstituteWhatsappNumber(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const digits = normalizePhoneForWa(trimmed);
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: "Numéro WhatsApp invalide. Exemple : 0612345678." };
  }
  return { ok: true, value: `+${digits}` };
}

/** Numéro d'institut (+212…) vers le format Twilio whatsapp:+212… */
export function formatTwilioWhatsAppFrom(raw: string | null | undefined): string | null {
  const value = raw?.trim() || "";
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? `whatsapp:+${digits}` : null;
}

export const TWILIO_FROM_MISSING_MESSAGE =
  "Ajoutez le numéro WhatsApp de cet institut dans Paramètres → Institut.";

function twilioErrorMessage(message: string | undefined, status: number) {
  const text = message || "";
  if (/compliance profile is not approved|Trust Hub|KYC/i.test(text)) {
    return "Twilio refuse l'envoi : le profil WhatsApp de l'institut n'est pas encore validé. Terminez la vérification dans Twilio, menu Trust Hub.";
  }
  return text || `Twilio a refusé l'envoi (${status}).`;
}

export async function sendWhatsAppMessageViaTwilio(options: {
  toPhone: string;
  message: string;
  fromPhone: string;
}): Promise<SendWhatsAppApiResult> {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = formatTwilioWhatsAppFrom(options.fromPhone);
  if (!accountSid || !authToken) {
    return { ok: false, error: "TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN sont requis." };
  }
  if (!from) return { ok: false, error: TWILIO_FROM_MISSING_MESSAGE };

  const digits = normalizePhoneForWa(options.toPhone);
  if (!digits || digits.length < 8) {
    return { ok: false, error: "Le numéro du client est invalide." };
  }

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:+${digits}`,
    Body: options.message,
  });

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    const data = (await response.json()) as { sid?: string; message?: string; code?: number };
    if (!response.ok || !data.sid) {
      return { ok: false, error: twilioErrorMessage(data.message, response.status) };
    }
    return { ok: true, messageId: data.sid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "réseau";
    return { ok: false, error: `Échec d'envoi vers Twilio : ${message}` };
  }
}
