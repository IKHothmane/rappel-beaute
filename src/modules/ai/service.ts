import type {
  AIChatResult,
  AIConversationDetail,
  AIConversationSummary,
  AIDashboardInsight,
  AIGenerateMessageInput,
  AIGenerateMessageResult,
  AIRecommendation,
  AIUsageSnapshot,
} from "@/types/ai";
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

export async function fetchAIConversations(): Promise<AIConversationSummary[]> {
  const res = await fetch("/api/ai/conversations/", fetchOpts);
  const data = await parseJson<{ data: AIConversationSummary[] }>(res);
  return data.data;
}

export async function fetchAIConversation(id: string): Promise<AIConversationDetail> {
  const res = await fetch(`/api/ai/conversations/${id}/`, fetchOpts);
  return parseJson(res);
}

export async function deleteAIConversationApi(id: string): Promise<void> {
  const res = await fetch(`/api/ai/conversations/${id}/`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson(res);
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

/** Révèle progressivement le texte (simule le streaming côté client) */
export async function streamReveal(
  text: string,
  onDelta: (chunk: string, full: string) => void,
  opts?: { chunkSize?: number; delayMs?: number },
): Promise<void> {
  const size = opts?.chunkSize ?? 12;
  const delay = opts?.delayMs ?? 16;
  let full = "";
  for (let i = 0; i < text.length; i += size) {
    const chunk = text.slice(i, i + size);
    full += chunk;
    onDelta(chunk, full);
    await new Promise((r) => setTimeout(r, delay));
  }
}

export async function fetchDashboardAIInsight(): Promise<AIDashboardInsight> {
  const res = await fetch("/api/ai/analyze-dashboard/", {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}

export async function fetchAIRecommendations(): Promise<AIRecommendation[]> {
  const res = await fetch("/api/ai/recommendations/", {
    method: "POST",
    credentials: "include",
  });
  const data = await parseJson<{ data: AIRecommendation[] }>(res);
  return data.data;
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
