"use client";

import {
  BarChart3,
  Bot,
  CalendarDays,
  Loader2,
  Plus,
  Send,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

type Props = {
  instituteName?: string;
  userName?: string;
  onAsk?: (question: string) => Promise<string>;
  onNewConversation?: () => void;
  seedMessages?: AssistantMessage[] | null;
  conversationKey?: string | null;
  disabled?: boolean;
  disabledReason?: string;
};

const quickPrompts = [
  {
    label: "Panier moyen",
    prompt: "Quel est le panier moyen de mon institut ?",
    icon: BarChart3,
  },
  {
    label: "Risques no-show",
    prompt: "Analyse les risques de rendez-vous non honorés.",
    icon: AlertTriangle,
  },
  {
    label: "Top de l'équipe",
    prompt: "Quelles sont les performances de mon équipe ?",
    icon: Users,
  },
  {
    label: "Clôture journalière",
    prompt: "Prépare une synthèse de la journée et de la caisse.",
    icon: CalendarDays,
  },
];

function createMessage(role: AssistantMessage["role"], content: string): AssistantMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date(),
  };
}

function welcomeMessage(userName: string) {
  return createMessage(
    "assistant",
    `Bonjour ${userName} ! Comment puis-je vous aider aujourd'hui ?`,
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssistantAiPremium({
  instituteName = "Votre institut",
  userName = "vous",
  onAsk,
  onNewConversation,
  seedMessages = null,
  conversationKey = null,
  disabled = false,
  disabledReason,
}: Props) {
  const [messages, setMessages] = useState<AssistantMessage[]>([welcomeMessage(userName)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (seedMessages && seedMessages.length > 0) {
      setMessages(seedMessages);
      return;
    }
    if (!conversationKey) {
      setMessages([welcomeMessage(userName)]);
    }
  }, [conversationKey, seedMessages, userName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, loading]);

  async function sendMessage(question?: string) {
    const content = (question ?? input).trim();
    if (!content || loading || disabled) return;

    setError("");
    setInput("");
    setMessages((prev) => [...prev, createMessage("user", content)]);

    if (!onAsk) {
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          "L'interface est prête. Connectez la fonction onAsk à votre assistant IA existant pour obtenir une réponse basée sur les données de votre institut.",
        ),
      ]);
      return;
    }

    setLoading(true);
    try {
      const answer = await onAsk(content);
      setMessages((prev) => [
        ...prev,
        createMessage("assistant", answer || "Aucune réponse reçue de l'assistant."),
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible de contacter l'assistant. Veuillez réessayer.",
      );
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function startNewConversation() {
    setMessages([welcomeMessage(userName)]);
    setInput("");
    setError("");
    onNewConversation?.();
    textareaRef.current?.focus();
  }

  const busy = loading || disabled;

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-3 text-[#391327]"
      style={{ height: "calc(100dvh / 0.8 - 4.5rem)" }}
    >
      <header
        className="relative flex shrink-0 items-center overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-3 shadow-sm sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0 max-w-2xl">
          <h1 className="font-serif text-xl font-bold tracking-tight text-[#58152F] sm:text-2xl">
            Assistant Rappel Beauté
          </h1>
          <p className="mt-0.5 max-w-lg text-sm leading-5 text-[#654254]">
            Votre copilote pour les ventes, les rendez-vous et le stock.
          </p>
        </div>
      </header>

      {disabled && disabledReason ? (
        <div className="shrink-0 rounded-2xl border border-[#f0dce5] bg-white p-4 text-sm text-[#74445a]">
          {disabledReason}
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[25px] border border-[#F0D9E3] bg-white shadow-[0_10px_35px_rgba(90,20,53,0.06)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F5E5EC] bg-gradient-to-r from-[#FFF8FB] to-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F9D9E8] text-[#B90058]">
              <Bot size={24} aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">
                Copilote — {userName} &amp; {instituteName}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#937C89]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Assistant de gestion
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#B90058] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#920043]"
          >
            <Plus size={14} aria-hidden />
            Nouveau
          </button>
        </div>

        <div
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-gradient-to-b from-white to-[#FFFAFC] px-4 py-5 sm:px-6"
        >
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={["flex gap-2.5", isUser ? "justify-end" : "justify-start"].join(" ")}
              >
                {!isUser ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FCE3EE] text-[#B90058]">
                    <Bot size={17} aria-hidden />
                  </div>
                ) : null}

                <div
                  className={[
                    "max-w-[88%] rounded-[19px] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%]",
                    isUser
                      ? "rounded-br-md bg-[#B90058] text-white"
                      : "rounded-bl-md bg-[#FCEEF5] text-[#481A31]",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={[
                      "mt-1 text-right text-[10px]",
                      isUser ? "text-white/70" : "text-[#AA8A9A]",
                    ].join(" ")}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[#9C6C82]">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              L&apos;assistant prépare sa réponse...
            </div>
          ) : null}

          <div ref={endRef} />
        </div>

        <div className="shrink-0 space-y-3 border-t border-[#F5E5EC] bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(item.prompt)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#F1D7E2] bg-[#FFF9FB] px-3 py-2 text-xs font-medium text-[#6C2948] transition-colors hover:bg-[#FCE7F0] disabled:opacity-50"
                >
                  <Icon size={14} className="text-[#C0005B]" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>

          {error ? (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-[17px] border border-[#EDD7E0] bg-[#FFFAFC] px-4 transition-colors focus-within:border-[#C0005B]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={4000}
                disabled={disabled}
                placeholder="Écrivez votre question..."
                className="max-h-32 min-h-[48px] w-full resize-none bg-transparent py-3.5 text-sm text-[#431328] outline-none placeholder:text-[#B69CA9] disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="flex h-[48px] shrink-0 items-center justify-center gap-2 rounded-[16px] bg-[#B90058] px-4 font-semibold text-white transition-colors hover:bg-[#940044] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <>
                  <span className="hidden text-sm sm:inline">Envoyer</span>
                  <Send size={17} aria-hidden />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
