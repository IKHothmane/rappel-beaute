import {
  AI_MESSAGE_KINDS,
  type AICommitWhatsAppInput,
  type AIGenerateMessageInput,
  type AIMessageKind,
  type AIMessageLanguage,
  type AIMessageTone,
} from "@/types/ai";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

const TONES: AIMessageTone[] = ["professional", "warm", "short"];
const LANGS: AIMessageLanguage[] = ["fr", "darija", "ar"];

function asKind(v: unknown): AIMessageKind | undefined {
  const s = str(v);
  if (s && (AI_MESSAGE_KINDS as string[]).includes(s)) return s as AIMessageKind;
  return undefined;
}

/**
 * Parse le body generate-message.
 * Compat : `objective` seul → kind promotion.
 */
export function parseGenerateMessageBody(
  raw: Record<string, unknown>,
): { ok: true; data: AIGenerateMessageInput } | { ok: false; error: string } {
  const objective = str(raw.objective) ?? "";
  const kind = asKind(raw.kind) ?? (objective ? "promotion" : undefined);
  if (!kind) {
    return { ok: false, error: "Type de message requis (kind) ou objectif." };
  }

  const toneRaw = str(raw.tone);
  const tone: AIMessageTone =
    toneRaw && TONES.includes(toneRaw as AIMessageTone)
      ? (toneRaw as AIMessageTone)
      : "warm";

  const langRaw = str(raw.language);
  const language: AIMessageLanguage =
    langRaw && LANGS.includes(langRaw as AIMessageLanguage)
      ? (langRaw as AIMessageLanguage)
      : "fr";

  const variantRaw = raw.variantCount;
  let variantCount = 3;
  if (typeof variantRaw === "number" && Number.isFinite(variantRaw)) {
    variantCount = Math.min(5, Math.max(1, Math.round(variantRaw)));
  }

  const channelRaw = str(raw.channel);
  const channel =
    channelRaw === "sms" || channelRaw === "email" ? channelRaw : "whatsapp";

  return {
    ok: true,
    data: {
      kind,
      objective: objective || undefined,
      tone,
      language,
      promotion: str(raw.promotion) ?? null,
      channel,
      customerId: str(raw.customerId) ?? null,
      appointmentId: str(raw.appointmentId) ?? null,
      variantCount,
    },
  };
}

export function parseCommitWhatsAppBody(
  raw: Record<string, unknown>,
): { ok: true; data: AICommitWhatsAppInput } | { ok: false; error: string } {
  const customerId = str(raw.customerId);
  const message = str(raw.message);
  const kind = asKind(raw.kind);
  if (!customerId) return { ok: false, error: "Cliente requise." };
  if (!message) return { ok: false, error: "Message requis." };
  if (message.length > 2000) return { ok: false, error: "Message trop long." };
  if (!kind) return { ok: false, error: "Type de message requis." };
  const sendDirect = raw.sendDirect === true;
  return {
    ok: true,
    data: {
      customerId,
      message,
      kind,
      appointmentId: str(raw.appointmentId) ?? null,
      sendDirect,
    },
  };
}
