import type { AIChatResult, AIGenerateMessageInput, AIGenerateMessageResult, AIUsageSnapshot } from "@/types/ai";
import type { WhatsAppTaskItem } from "@/types/whatsapp";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function fetchAIUsage(): Promise<AIUsageSnapshot> {
  const res = await fetch("/api/ai/usage/", fetchOpts);
  return parseJson(res);
}

export async function sendAIChat(input: {
  message: string;
  conversationId?: string | null;
}): Promise<AIChatResult> {
  const res = await fetch("/api/ai/chat/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function generateAIMessage(
  input: AIGenerateMessageInput,
): Promise<AIGenerateMessageResult> {
  const res = await fetch("/api/ai/generate-message/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function commitAIWhatsAppDraft(input: {
  customerId: string;
  message: string;
  kind: AIGenerateMessageInput["kind"];
  appointmentId?: string | null;
  sendDirect?: boolean;
}): Promise<{ task: WhatsAppTaskItem; autoSent: boolean; messageId?: string }> {
  const res = await fetch("/api/ai/whatsapp-draft/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}
