"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Package, TrendingUp, Users, Wallet } from "lucide-react";
import AssistantAiPremium, {
  type AssistantActivity,
  type AssistantMessage,
  type AssistantRecentConversation,
} from "@/components/ai/assistant-ai-premium";
import { AiAssistantMobile } from "@/components/ai/ai-assistant-mobile";
import type { ChatLine } from "@/components/ai/ai-assistant-shared";
import { useCurrentUser } from "@/components/auth/session-provider";
import { AgendaSkeleton } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatMad, formatPct, getAnalyticsOverview } from "@/modules/analytics/service";
import { getStockKpis } from "@/modules/inventory/service";
import {
  fetchAIConversation,
  fetchAIConversations,
  fetchAIUsage,
  sendAIChat,
} from "@/modules/ai/service";
import type { AIConversationSummary, AIUsageSnapshot } from "@/types/ai";

function clock() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function mapConversation(item: AIConversationSummary): AssistantRecentConversation {
  return {
    id: item.id,
    title: item.title?.trim() || "Conversation sans titre",
    date: new Date(item.updatedAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function AiAssistantPage() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [usage, setUsage] = useState<AIUsageSnapshot | null>(null);
  const [activity, setActivity] = useState<AssistantActivity[]>([]);
  const [seedMessages, setSeedMessages] = useState<AssistantMessage[] | null>(null);
  const [boot, setBoot] = useState(true);
  const conversationIdRef = useRef<string | null>(null);

  // Mobile chat state (existing mobile UI)
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const refreshSidebar = useCallback(async () => {
    try {
      const [list, u] = await Promise.all([fetchAIConversations(), fetchAIUsage()]);
      setConversations(list);
      setUsage(u);
    } catch {
      /* plan locked handled on send */
    }
  }, []);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    void (async () => {
      await refreshSidebar();

      try {
        const [overview, stock] = await Promise.all([
          getAnalyticsOverview({ preset: "month", compare: true }).catch(() => null),
          getStockKpis().catch(() => null),
        ]);

        const items: AssistantActivity[] = [];
        if (overview) {
          items.push({
            label: "Chiffre d'affaires",
            value: formatMad(overview.revenue.value),
            change:
              overview.revenue.changePercent != null
                ? formatPct(overview.revenue.changePercent)
                : undefined,
            icon: Wallet,
          });
          items.push({
            label: "Rendez-vous",
            value: String(overview.appointments.value),
            change:
              overview.appointments.changePercent != null
                ? formatPct(overview.appointments.changePercent)
                : undefined,
            icon: CalendarDays,
          });
          items.push({
            label: "Clientes actives",
            value: String(overview.customers.value),
            change:
              overview.customers.changePercent != null
                ? formatPct(overview.customers.changePercent)
                : undefined,
            icon: Users,
          });
          items.push({
            label: "Panier moyen",
            value: formatMad(overview.averageTicket.value),
            change:
              overview.averageTicket.changePercent != null
                ? formatPct(overview.averageTicket.changePercent)
                : undefined,
            icon: TrendingUp,
          });
        }
        if (stock) {
          items.push({
            label: "Alertes stock",
            value: String(stock.lowStockCount + stock.outOfStockCount),
            icon: Package,
          });
        }
        setActivity(items);
      } catch {
        setActivity([]);
      }

      setBoot(false);
    })();
  }, [refreshSidebar]);

  const recentConversations = useMemo(
    () => conversations.map(mapConversation),
    [conversations],
  );

  const quotaBlocked = usage?.maxMessages === 0;

  function newChat() {
    setConversationId(null);
    conversationIdRef.current = null;
    setSeedMessages(null);
    setLines([]);
    setMessage("");
  }

  async function openConversation(id: string) {
    try {
      const detail = await fetchAIConversation(id);
      setConversationId(detail.id);
      conversationIdRef.current = detail.id;

      const mapped: AssistantMessage[] = detail.messages
        .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
        .map((m) => ({
          id: crypto.randomUUID(),
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        }));

      setSeedMessages(mapped.length ? mapped : null);
      setLines(
        detail.messages
          .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
          .map((m) => ({
            role: m.role === "USER" ? "user" : "assistant",
            content: m.content,
            at: m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : undefined,
          })),
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
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
    await refreshSidebar();
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

      <div className="hidden lg:block">
        {quotaBlocked ? (
          <div className="mb-4 rounded-2xl border border-[#f0dce5] bg-white p-4 text-sm text-[#74445a]">
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
          activity={activity}
          recentConversations={recentConversations}
          onOpenConversation={openConversation}
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
