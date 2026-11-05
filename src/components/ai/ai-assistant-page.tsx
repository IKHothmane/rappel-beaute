"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { AiAssistantMobile } from "@/components/ai/ai-assistant-mobile";
import { AssistantHero } from "@/components/ai/assistant-hero";
import { AssistantSuggestions } from "@/components/ai/assistant-suggestions";
import { FAST_PROMPTS, QUICK_PROMPTS, type ChatLine } from "@/components/ai/ai-assistant-shared";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { AgendaSkeleton } from "@/components/ui/empty-state";
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

function clock() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function AiAssistantPage() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [usage, setUsage] = useState<AIUsageSnapshot | null>(null);
  const [boot, setBoot] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    void (async () => {
      await refreshSidebar();
      setBoot(false);
    })();
  }, [refreshSidebar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, analyzing]);

  function newChat() {
    setConversationId(null);
    setLines([]);
    setMessage("");
    const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
    (desktop ? inputRef : mobileInputRef).current?.focus();
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
            at: m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : undefined,
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
    setLines((prev) => [...prev, { role: "user", content: text, at: clock() }]);
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
          at: clock(),
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
        onSend={(text) => void send(text)}
        onNewChat={newChat}
        inputRef={mobileInputRef}
      />

      <div className="relative hidden lg:block">
        <div className="space-y-6 pb-[7.5rem]">
          <AssistantHero
            orgName={user.orgName || "Votre institut"}
          />

          <section className="rounded-2xl border border-[#F1DCE6] bg-white p-5 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-ink/45">Accès rapides</span>
              <span className="text-[10px] font-semibold text-ink/35">Envoie une vraie question au copilote</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={quotaBlocked || loading}
                  onClick={() => void send(item.prompt)}
                  className="rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition hover:border-primary/40 hover:bg-primary-light disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {quotaBlocked ? (
            <div className="rounded-2xl border border-line bg-white p-4 text-sm text-ink/60">
              L’assistant n’est pas inclus dans le forfait STARTER. Passez à Institut ou Premium depuis{" "}
              <Link href="/settings/subscription/" className="font-semibold text-primary underline">
                l’abonnement
              </Link>
              .
            </div>
          ) : null}

          {lines.length === 0 && !analyzing ? (
            <AssistantSuggestions
              disabled={quotaBlocked || loading}
              onSelect={(prompt) => void send(prompt)}
            />
          ) : null}

          <section className="flex flex-col rounded-2xl border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between rounded-t-2xl border-b border-line bg-gradient-to-r from-white to-[#FFF7F9] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary-light text-primary">
                    <Bot size={18} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ink">
                    Copilote — {user.firstName} & {user.orgName}
                  </h3>
                  <p className="text-[11px] text-ink/50">
                    {ROLE_LABEL[user.role]} · réponses basées sur vos outils métier
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={newChat}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  <Sparkles size={12} />
                  Nouveau
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {lines.length === 0 && !analyzing ? (
                <div className="space-y-3 text-sm text-ink/45">
                  <p>Bonjour {user.firstName} ! Comment puis-je vous aider aujourd’hui ?</p>
                </div>
              ) : (
                lines.map((line, i) =>
                  line.role === "user" ? (
                    <div key={i} className="flex items-start justify-end gap-3">
                      <div className="text-right">
                        <p className="mb-1 mr-1 text-[10px] font-semibold text-ink/35">
                          {user.firstName} {line.at ? `· ${line.at}` : ""}
                        </p>
                        <div className="max-w-md rounded-2xl rounded-tr-sm bg-institut p-4 text-left text-xs font-medium leading-relaxed text-white">
                          {line.content}
                        </div>
                      </div>
                      <div className="mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-primary-light text-xs font-black text-primary">
                        {user.firstName[0]}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary-light text-primary">
                        <Bot size={14} />
                      </div>
                      <div className="max-w-xl flex-1">
                        <p className="mb-1 ml-1 text-[10px] font-semibold text-ink/35">
                          Copilote {line.at ? `· ${line.at}` : ""}
                        </p>
                        <div className="space-y-2 rounded-2xl rounded-tl-sm border border-line bg-[#FFFBF9] p-4 text-xs leading-relaxed text-ink shadow-sm">
                          <p className="whitespace-pre-wrap">{line.content}</p>
                          {line.streaming ? <span className="animate-pulse">▍</span> : null}
                          {line.fallback ? (
                            <p className="text-[10px] text-amber-700">Fallback — provider indisponible</p>
                          ) : null}
                          {line.sources && line.sources.some((s) => s.ok) ? (
                            <p className="text-[10px] text-ink/40">
                              Sources : {line.sources.filter((s) => s.ok).map((s) => s.label).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ),
                )
              )}
              {analyzing ? (
                <p className="rounded-xl border border-dashed border-primary/30 bg-primary-light/40 px-3 py-2 text-xs text-primary-dark">
                  Analyse des données métier…
                </p>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </section>
        </div>

        <div
          className="pointer-events-none fixed bottom-0 right-0 z-30 hidden lg:block"
          style={{ left: "var(--app-sidebar-offset, 280px)" }}
        >
          <div className="pointer-events-auto w-full min-w-0 max-w-none px-3 pb-4 pt-2 sm:px-4 lg:px-5">
            <div className="space-y-3 rounded-2xl border border-line bg-white/95 p-4 shadow-[0_-8px_30px_rgba(54,18,36,0.12)] backdrop-blur-md">
              <div className="flex gap-2 overflow-x-auto pb-1 text-[11px]">
                {FAST_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={quotaBlocked || loading}
                    onClick={() => void send(item.prompt)}
                    className="whitespace-nowrap rounded-full border border-line bg-[#FFFBF9] px-3 py-1 font-semibold text-ink/70 hover:border-primary/30 hover:text-primary disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  className="h-10 bg-[#FFFBF9] text-xs"
                  placeholder="Écrivez votre question…"
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
                  variant="brand"
                  size="sm"
                  className="h-10 px-5"
                  onClick={() => void send()}
                  disabled={loading || quotaBlocked || !message.trim()}
                >
                  Envoyer
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
