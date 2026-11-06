"use client";

import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Users,
  AlertTriangle,
  type LucideIcon,
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

export type AssistantActivity = {
  label: string;
  value: string;
  change?: string;
  icon: LucideIcon;
};

export type AssistantRecentConversation = {
  id: string;
  title: string;
  date: string;
};

type Props = {
  instituteName?: string;
  userName?: string;
  onAsk?: (question: string) => Promise<string>;
  activity?: AssistantActivity[];
  recentConversations?: AssistantRecentConversation[];
  onOpenConversation?: (id: string) => void | Promise<void>;
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
  activity = [],
  recentConversations = [],
  onOpenConversation,
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
  const [showAllHistory, setShowAllHistory] = useState(false);
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
    <div className="relative w-full min-w-0 space-y-5 pb-[11rem] text-[#391327]">
      <header
        className="relative flex min-h-[96px] items-center overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0 max-w-2xl">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Assistant Rappel Beauté
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Votre copilote intelligent pour comprendre votre activité et vous accompagner au
            quotidien.
          </p>
        </div>
      </header>

      {disabled && disabledReason ? (
        <div className="rounded-2xl border border-[#f0dce5] bg-white p-4 text-sm text-[#74445a]">
          {disabledReason}
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-[25px] border border-[#F0D9E3] bg-white shadow-[0_10px_35px_rgba(90,20,53,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#F5E5EC] bg-gradient-to-r from-[#FFF8FB] to-white px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F9D9E8] text-[#B90058]">
                  <Bot size={26} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold">
                    Copilote — {userName} &amp; {instituteName}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#937C89]">
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
              className="flex h-[350px] flex-col gap-4 overflow-y-auto bg-gradient-to-b from-white to-[#FFFAFC] px-4 py-5 sm:h-[410px] sm:px-6"
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
                        "max-w-[88%] rounded-[19px] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[78%]",
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
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-[#F0D9E3] bg-white p-5 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold">
              <BarChart3 size={19} className="text-[#C0005B]" aria-hidden />
              Votre activité
              <span className="text-xs font-normal text-[#9E8793]">(ce mois)</span>
            </h2>

            {activity.length === 0 ? (
              <div className="rounded-2xl bg-[#FFF6FA] px-4 py-6 text-center">
                <BarChart3 size={28} className="mx-auto mb-3 text-[#CA6C97]" aria-hidden />
                <p className="text-sm font-semibold">Statistiques à connecter</p>
                <p className="mt-2 text-xs leading-5 text-[#987F8D]">
                  Les indicateurs réels de votre institut apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F5E7ED]">
                {activity.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCE7F0] text-[#C0005B]">
                        <Icon size={19} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#856B79]">{item.label}</p>
                        <p className="mt-1 text-lg font-bold">{item.value}</p>
                      </div>
                      {item.change ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                          {item.change}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-[#F0D9E3] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Clock3 size={19} className="text-[#C0005B]" aria-hidden />
                Conversations récentes
              </h2>

              {recentConversations.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((v) => !v)}
                  className="shrink-0 text-xs font-semibold text-[#B90058]"
                >
                  {showAllHistory ? "Réduire" : "Tout voir"}
                </button>
              ) : null}
            </div>

            {recentConversations.length === 0 ? (
              <div className="rounded-2xl bg-[#FFF6FA] px-4 py-6 text-center">
                <MessageCircle size={26} className="mx-auto mb-3 text-[#CA6C97]" aria-hidden />
                <p className="text-sm font-semibold">Aucune conversation enregistrée</p>
                <p className="mt-2 text-xs leading-5 text-[#987F8D]">
                  Votre historique apparaîtra ici après vos premières questions.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F5E7ED]">
                {(showAllHistory
                  ? recentConversations
                  : recentConversations.slice(0, 3)
                ).map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void onOpenConversation?.(conversation.id)}
                    disabled={!onOpenConversation}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[#FFF8FB] disabled:cursor-default"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE7F0] text-[#C0005B]">
                      <MessageCircle size={18} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{conversation.title}</p>
                      <p className="mt-1 text-xs text-[#A18B97]">{conversation.date}</p>
                    </div>
                    {onOpenConversation ? (
                      <ChevronRight size={17} className="text-[#A55B7C]" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-[#F1D7E2] bg-gradient-to-br from-[#FFF3F8] to-[#FCE5F0] p-5">
            <div className="mb-3 flex items-center gap-2 text-[#A90051]">
              <Sparkles size={20} aria-hidden />
              <h2 className="text-sm font-bold">Votre assistant au quotidien</h2>
            </div>

            <p className="text-xs leading-6 text-[#784C62]">
              Posez vos questions sur les ventes, les rendez-vous, l&apos;équipe ou le stock. Les
              réponses dépendent des données accessibles à votre compte.
            </p>

            <button
              type="button"
              onClick={() =>
                void sendMessage(
                  "Quelles sont les priorités de gestion de mon institut aujourd'hui ?",
                )
              }
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#B90058] hover:underline disabled:opacity-50"
            >
              Voir mes priorités
              <ArrowRight size={15} aria-hidden />
            </button>
          </section>
        </aside>
      </div>

      <div
        className="pointer-events-none fixed bottom-0 right-0 z-30"
        style={{ left: "var(--app-sidebar-offset, 0px)" }}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-[1600px] px-3 pb-4 pt-2 sm:px-5 lg:px-7">
          <div className="space-y-3 rounded-[22px] border border-[#F0D9E3] bg-white/95 p-4 shadow-[0_-8px_30px_rgba(90,20,53,0.12)] backdrop-blur-md sm:p-5">
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
                  className="max-h-32 min-h-[52px] w-full resize-none bg-transparent py-4 text-sm text-[#431328] outline-none placeholder:text-[#B69CA9] disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-[16px] bg-[#B90058] px-4 font-semibold text-white transition-colors hover:bg-[#940044] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
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
        </div>
      </div>
    </div>
  );
}
