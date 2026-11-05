"use client";

import Link from "next/link";
import { useState, type FormEvent, type Ref } from "react";
import { ArrowUp, Bot, Sparkles, Zap } from "lucide-react";
import { AssistantSuggestions } from "@/components/ai/assistant-suggestions";
import { FAST_PROMPTS, QUICK_PROMPTS, type ChatLine } from "@/components/ai/ai-assistant-shared";

type AiAssistantMobileProps = {
  firstName: string;
  orgName: string;
  quotaBlocked: boolean;
  lines: ChatLine[];
  analyzing: boolean;
  loading: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (text?: string) => void;
  onNewChat: () => void;
  inputRef: Ref<HTMLInputElement>;
};

export function AiAssistantMobile(props: AiAssistantMobileProps) {
  const {
    firstName,
    orgName,
    quotaBlocked,
    lines,
    analyzing,
    loading,
    message,
    onMessageChange,
    onSend,
    onNewChat,
    inputRef,
  } = props;

  const [quickOpen, setQuickOpen] = useState(false);

  function ask(prompt: string) {
    setQuickOpen(false);
    onSend(prompt);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSend();
  }

  return (
    <div className="flex flex-col gap-3 pb-36 lg:hidden">
      <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-[#54112F] via-[#8E194B] to-[#BE3976] px-5 py-6 text-white shadow-[0_14px_32px_rgba(91,20,55,0.18)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pink-300/25 blur-[50px]" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold">
              <Sparkles size={12} />
              <span className="truncate">Assistant IA — {orgName}</span>
            </div>
            <h1 className="font-display text-[22px] font-bold leading-7 tracking-tight">
              Assistant Rappel Beauté
            </h1>
            <p className="mt-2 text-[13px] leading-5 text-pink-100">
              Bonjour {firstName}, posez une question sur votre institut.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15">
            <Bot size={22} />
          </div>
        </div>
        <div className="relative z-10 mt-4 flex items-center justify-end border-t border-white/15 pt-3">
          <button
            type="button"
            onClick={onNewChat}
            disabled={quotaBlocked}
            className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#8E194B] disabled:opacity-50"
          >
            Nouveau
          </button>
        </div>
      </section>

      <section className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={quotaBlocked || loading}
            onClick={() => ask(item.prompt)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-ink shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <span className="text-[14px]">{item.emoji}</span>
            <span className="text-[11px] font-semibold">{item.label}</span>
          </button>
        ))}
      </section>

      {quotaBlocked ? (
        <p className="rounded-2xl border border-line bg-white p-3 text-xs text-ink/60">
          L’assistant n’est pas inclus dans le forfait STARTER. Passez à Institut ou Premium depuis{" "}
          <Link href="/settings/subscription/" className="font-semibold text-primary underline">
            l’abonnement
          </Link>
          .
        </p>
      ) : null}

      {lines.length === 0 && !analyzing ? (
        <AssistantSuggestions
          disabled={quotaBlocked || loading}
          onSelect={(prompt) => ask(prompt)}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        {lines.length === 0 && !analyzing ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-ink/45 shadow-sm">
            <p>Bonjour {firstName} ! Comment puis-je vous aider aujourd’hui ?</p>
          </div>
        ) : (
          lines.map((line, i) =>
            line.role === "user" ? (
              <div key={i} className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
                <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                  {line.content}
                </div>
                <p className="pr-1 text-[11px] text-ink/40">
                  {firstName} {line.at ? `· ${line.at}` : ""}
                </p>
              </div>
            ) : (
              <div key={i} className="mr-auto flex w-full flex-col items-start gap-1">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                    <Sparkles size={12} />
                  </div>
                  <span className="text-[11px] font-bold text-ink">Copilote</span>
                  {line.at ? <span className="text-[11px] text-ink/40">{line.at}</span> : null}
                </div>
                <div className="w-full rounded-2xl rounded-tl-sm bg-white p-4 text-sm leading-relaxed text-ink shadow-sm">
                  <p className="whitespace-pre-wrap">{line.content}</p>
                  {line.streaming ? <span className="animate-pulse">▍</span> : null}
                  {line.fallback ? (
                    <p className="mt-2 text-[10px] text-amber-700">Fallback — provider indisponible</p>
                  ) : null}
                  {line.sources && line.sources.some((s) => s.ok) ? (
                    <p className="mt-2 text-[10px] text-ink/40">
                      Sources : {line.sources.filter((s) => s.ok).map((s) => s.label).join(" · ")}
                    </p>
                  ) : null}
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
      </section>

      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-40 px-4 lg:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-[420px] flex-col gap-1.5 rounded-2xl bg-white/95 p-2 shadow-[0_8px_30px_rgba(34,24,32,0.12)] backdrop-blur-md">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setQuickOpen((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-bold text-primary"
            >
              <Zap size={14} />
              Actions éclair
            </button>
            <span className="text-[10px] text-ink/40">Données institut</span>
          </div>
          {quickOpen ? (
            <div className="mb-1 grid grid-cols-2 gap-1.5 rounded-xl bg-[#FFEFF8] p-1">
              {FAST_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={quotaBlocked || loading}
                  onClick={() => ask(item.prompt)}
                  className="truncate rounded bg-white p-1.5 text-left text-[11px] text-ink disabled:opacity-50"
                >
                  {item.emoji} {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <form className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 shadow-sm" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-ink outline-none placeholder:text-ink/35"
              placeholder="Écrivez votre question…"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              disabled={loading || quotaBlocked}
            />
            <button
              type="submit"
              disabled={loading || quotaBlocked || !message.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md transition active:scale-90 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <ArrowUp size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
