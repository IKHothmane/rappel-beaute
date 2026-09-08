"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { AppPageHeader } from "@/components/app/AppUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  deleteAIConversationApi,
  fetchAIConversation,
  fetchAIConversations,
  fetchAIUsage,
  sendAIChat,
  streamReveal,
} from "@/modules/ai/service";
import type { AIConversationSummary, AIUsageSnapshot } from "@/types/ai";
import { cn } from "@/lib/utils";

type ChatLine = {
  role: "user" | "assistant";
  content: string;
  sources?: { tool: string; ok: boolean; label: string }[];
  streaming?: boolean;
  fallback?: boolean;
};

const SUGGESTIONS = [
  "Combien avons-nous réalisé ce mois-ci ?",
  "Quels produits sont sous stock minimum ?",
  "Combien de no-shows ce mois-ci ?",
  "Quelles clientes sont inactives ?",
];

export function AiAssistantPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [usage, setUsage] = useState<AIUsageSnapshot | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    void refreshSidebar();
  }, [refreshSidebar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, analyzing]);

  function newChat() {
    setConversationId(null);
    setLines([]);
    setMessage("");
  }

  async function openConversation(id: string) {
    try {
      const detail = await fetchAIConversation(id);
      setConversationId(detail.id);
      setLines(
        detail.messages
          .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
          .map((m) => ({
            role: m.role === "USER" ? "user" : "assistant",
            content: m.content,
            sources:
              m.role === "ASSISTANT" && m.metadata && Array.isArray(m.metadata.sources)
                ? (m.metadata.sources as ChatLine["sources"])
                : undefined,
          })),
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function removeConversation(id: string) {
    try {
      await deleteAIConversationApi(id);
      if (conversationId === id) newChat();
      await refreshSidebar();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? message).trim();
    if (!text || loading) return;
    setLoading(true);
    setAnalyzing(true);
    setLines((prev) => [...prev, { role: "user", content: text }]);
    setMessage("");

    try {
      const result = await sendAIChat({ message: text, conversationId });
      setConversationId(result.conversationId);
      setAnalyzing(false);

      setLines((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          streaming: true,
          sources: result.sources,
          fallback: result.fallback,
        },
      ]);

      await streamReveal(result.reply, (_chunk, full) => {
        setLines((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: full, streaming: true };
          }
          return copy;
        });
      });

      setLines((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = { ...last, streaming: false };
        }
        return copy;
      });

      await refreshSidebar();
    } catch (e) {
      setAnalyzing(false);
      setLines((prev) => prev.slice(0, -1));
      setMessage(text);
      toast(e instanceof Error ? e.message : "Erreur IA", "error");
    } finally {
      setLoading(false);
    }
  }

  const quotaBlocked = usage?.maxMessages === 0;

  return (
    <>
      <AppPageHeader
        title="Assistant Rappel Beauty"
        description="Questions → outils contrôlés → Analytics PostgreSQL → réponse. Aucun accès SQL direct."
      />

      {usage ? (
        <p className="mb-4 text-xs text-ink/50">
          Quota {usage.messageCount}
          {usage.maxMessages != null ? ` / ${usage.maxMessages}` : ""} messages ce mois
          {usage.remainingMessages != null ? ` · ${usage.remainingMessages} restants` : ""}
        </p>
      ) : null}

      {quotaBlocked ? (
        <div className="surface mb-4 p-4 text-sm text-ink/60">
          L&apos;assistant IA n&apos;est pas inclus dans le forfait STARTER. Passez à Institut ou
          Premium.
        </div>
      ) : (
        <p className="mb-4 text-xs text-ink/50">
          Pour un message WhatsApp (relance, anniversaire, promo) :{" "}
          <Link href="/whatsapp/" className="underline underline-offset-2">
            générer depuis WhatsApp
          </Link>
          . Aucun envoi automatique.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="surface flex max-h-[70vh] flex-col p-3">
          <Button
            type="button"
            variant="ghost"
            className="mb-2 w-full justify-start gap-2 text-sm"
            onClick={newChat}
          >
            <MessageSquarePlus size={16} />
            Nouveau chat
          </Button>
          <ul className="flex-1 space-y-1 overflow-y-auto text-sm">
            {conversations.length === 0 ? (
              <li className="px-2 py-3 text-xs text-ink/40">Aucune conversation</li>
            ) : (
              conversations.map((c) => (
                <li key={c.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left hover:bg-ink/[0.04]",
                      conversationId === c.id && "bg-primary-light/70",
                    )}
                  >
                    {c.title || "Sans titre"}
                  </button>
                  <button
                    type="button"
                    className="hidden rounded p-1 text-ink/35 hover:text-red-600 group-hover:block"
                    onClick={() => removeConversation(c.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <div className="surface flex min-h-[520px] flex-col p-4">
          <ul className="flex-1 space-y-3 overflow-y-auto text-sm">
            {lines.length === 0 && !analyzing ? (
              <li className="space-y-3 text-ink/45">
                <p>Posez une question sur votre institut.</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={quotaBlocked}
                      onClick={() => send(s)}
                      className="rounded-lg border border-line px-3 py-1.5 text-left text-xs text-ink/70 hover:border-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </li>
            ) : (
              lines.map((l, i) => (
                <li
                  key={i}
                  className={
                    l.role === "user"
                      ? "ml-8 rounded-lg bg-primary-light/60 px-3 py-2"
                      : "mr-4 space-y-2"
                  }
                >
                  {l.role === "assistant" ? (
                    <>
                      <div className="rounded-lg bg-ink/[0.03] px-3 py-2 whitespace-pre-wrap">
                        {l.content}
                        {l.streaming ? <span className="animate-pulse">▍</span> : null}
                      </div>
                      {l.fallback ? (
                        <p className="text-[10px] text-amber-700">
                          Fallback mock — provider indisponible
                        </p>
                      ) : null}
                      {l.sources && l.sources.length > 0 ? (
                        <p className="text-[10px] text-ink/40">
                          Sources :{" "}
                          {l.sources
                            .filter((s) => s.ok)
                            .map((s) => s.label)
                            .join(" · ") || "—"}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    l.content
                  )}
                </li>
              ))
            )}
            {analyzing ? (
              <li className="mr-4 rounded-lg border border-dashed border-primary/30 bg-primary-light/30 px-3 py-2 text-xs text-primary-dark">
                Analyse des données métier…
              </li>
            ) : null}
            <div ref={bottomRef} />
          </ul>

          <div className="mt-4 flex gap-2 border-t border-line pt-3">
            <Input
              placeholder="Posez une question…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={loading || quotaBlocked}
            />
            <Button
              type="button"
              onClick={() => void send()}
              disabled={loading || quotaBlocked || !message.trim()}
            >
              {loading ? "…" : "Envoyer"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
