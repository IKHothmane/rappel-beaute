"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AssistantAiPremium, {
  type AssistantMessage,
} from "@/components/ai/assistant-ai-premium";
import { AiAssistantMobile } from "@/components/ai/ai-assistant-mobile";
import type { ChatLine } from "@/components/ai/ai-assistant-shared";
import { useCurrentUser } from "@/components/auth/session-provider";
import { AgendaSkeleton } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { fetchAIUsage, sendAIChat } from "@/modules/ai/service";
import type { AIUsageSnapshot } from "@/types/ai";

function clock() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function AiAssistantPage() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [usage, setUsage] = useState<AIUsageSnapshot | null>(null);
  const [seedMessages, setSeedMessages] = useState<AssistantMessage[] | null>(null);
  const [boot, setBoot] = useState(true);
  const conversationIdRef = useRef<string | null>(null);

  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const refreshUsage = useCallback(async () => {
    try {
      setUsage(await fetchAIUsage());
    } catch {
      /* plan locked handled on send */
    }
  }, []);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    void (async () => {
      await refreshUsage();
      setBoot(false);
    })();
  }, [refreshUsage]);

  const quotaBlocked = usage?.maxMessages === 0;

  function newChat() {
    setConversationId(null);
    conversationIdRef.current = null;
    setSeedMessages(null);
    setLines([]);
    setMessage("");
  }

  async function askAssistant(question: string): Promise<string> {
    if (quotaBlocked) {
      throw new Error("L’assistant n’est pas inclus dans votre forfait actuel.");
    }
    const result = await sendAIChat({
      message: question,
      conversationId: conversationIdRef.current,
    });
    setConversationId(result.conversationId);
    conversationIdRef.current = result.conversationId;
    await refreshUsage();
    return result.reply;
  }

  async function sendMobile(textOverride?: string) {
    const text = (textOverride ?? message).trim();
    if (!text || loading || quotaBlocked) return;
    setLoading(true);
    setAnalyzing(true);
    setLines((prev) => [...prev, { role: "user", content: text, at: clock() }]);
    setMessage("");

    try {
      const reply = await askAssistant(text);
      setAnalyzing(false);
      setLines((prev) => [
        ...prev,
        { role: "assistant", content: reply, at: clock() },
      ]);
    } catch (e) {
      setAnalyzing(false);
      setLines((prev) => prev.slice(0, -1));
      setMessage(text);
      toast(e instanceof Error ? e.message : "Erreur IA", "error");
    } finally {
      setLoading(false);
    }
  }

  if (boot) return <AgendaSkeleton />;

  return (
    <>
      <AiAssistantMobile
        firstName={user.firstName}
        orgName={user.orgName}
        quotaBlocked={quotaBlocked}
        lines={lines}
        analyzing={analyzing}
        loading={loading}
        message={message}
        onMessageChange={setMessage}
        onSend={(text) => void sendMobile(text)}
        onNewChat={newChat}
        inputRef={mobileInputRef}
      />

      <div className="hidden h-full min-h-0 px-3 pt-3 sm:px-4 lg:block lg:px-5 xl:px-6">
        {quotaBlocked ? (
          <div className="mb-3 rounded-2xl border border-[#f0dce5] bg-white p-4 text-sm text-[#74445a]">
            L’assistant n’est pas inclus dans le forfait STARTER. Passez à Institut ou Premium depuis{" "}
            <Link href="/settings/subscription/" className="font-semibold text-[#B90058] underline">
              l’abonnement
            </Link>
            .
          </div>
        ) : null}

        <AssistantAiPremium
          instituteName={user.orgName || "Votre institut"}
          userName={user.firstName || "vous"}
          onAsk={askAssistant}
          onNewConversation={newChat}
          seedMessages={seedMessages}
          conversationKey={conversationId}
          disabled={quotaBlocked}
          disabledReason={
            quotaBlocked
              ? "L’assistant IA n’est pas disponible sur votre forfait actuel."
              : undefined
          }
        />
      </div>
    </>
  );
}
