"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode, type Ref } from "react";
import {
  ArrowUp,
  Ban,
  BarChart3,
  Bot,
  CalendarClock,
  Check,
  CircleAlert,
  Lightbulb,
  Package,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { FAST_PROMPTS, QUICK_PROMPTS, type ChatLine } from "@/components/ai/ai-assistant-shared";
import { formatMad, formatPct } from "@/modules/analytics/service";
import { cn } from "@/lib/utils";
import type { AnalyticsOverview, AppointmentAnalytics, ServiceAnalyticsRow } from "@/types/analytics";
import type { AIConversationSummary, AIUsageSnapshot } from "@/types/ai";
import type { ProductListItem, StockKpis } from "@/types/inventory";
import type { ReactivationKpis } from "@/types/reactivation";

export type AiMobileTab = "conversation" | "diagnostics" | "insights";

type SaturdayHint = {
  date: Date;
  rdv: number;
  onDuty: string[];
  off: string[];
  wait: number;
};

type AiAssistantMobileProps = {
  firstName: string;
  orgName: string;
  connected: boolean;
  quotaBlocked: boolean;
  usage: AIUsageSnapshot | null;
  financeDenied: boolean;
  overview: AnalyticsOverview | null;
  bestDay: { label: string; rate: number | null } | null;
  topService: ServiceAnalyticsRow | null;
  saturdayHint: SaturdayHint | null;
  saturdayOcc: { rate: number | null } | null;
  stock: StockKpis | null;
  outProducts: ProductListItem[];
  lowProducts: ProductListItem[];
  reactivation: ReactivationKpis | null;
  noShow: AppointmentAnalytics["noShow"] | null;
  lines: ChatLine[];
  analyzing: boolean;
  loading: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (text?: string) => void;
  onNewChat: () => void;
  conversations: AIConversationSummary[];
  conversationId: string | null;
  onOpenConversation: (id: string) => void;
  onRemoveConversation: (id: string) => void;
  inputRef: Ref<HTMLInputElement>;
};

const TABS: { id: AiMobileTab; label: string; icon: typeof Sparkles }[] = [
  { id: "conversation", label: "Échanges", icon: Sparkles },
  { id: "diagnostics", label: "Audits", icon: BarChart3 },
  { id: "insights", label: "Pilotage", icon: Lightbulb },
];

export function AiAssistantMobile(props: AiAssistantMobileProps) {
  const {
    firstName,
    orgName,
    connected,
    quotaBlocked,
    usage,
    financeDenied,
    overview,
    bestDay,
    topService,
    saturdayHint,
    saturdayOcc,
    stock,
    outProducts,
    lowProducts,
    reactivation,
    noShow,
    lines,
    analyzing,
    loading,
    message,
    onMessageChange,
    onSend,
    onNewChat,
    conversations,
    conversationId,
    onOpenConversation,
    onRemoveConversation,
    inputRef,
  } = props;

  const [tab, setTab] = useState<AiMobileTab>("conversation");
  const [quickOpen, setQuickOpen] = useState(false);

  function ask(prompt: string) {
    setTab("conversation");
    setQuickOpen(false);
    onSend(prompt);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTab("conversation");
    onSend();
  }

  const saturdayLabel = saturdayHint
    ? saturdayHint.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })
    : null;

  return (
    <div className="flex flex-col gap-3 pb-36 lg:hidden">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex max-w-[72%] items-center gap-1.5 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink/55">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            <span className="truncate normal-case text-ink">Copilote IA de gestion</span>
            <span className="opacity-30">•</span>
            <span className="truncate normal-case">{orgName}</span>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              connected ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800",
            )}
          >
            {connected ? "Connecté" : quotaBlocked ? "Forfait" : "Quota"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[22px] font-bold leading-8 tracking-tight text-ink">
              Bonjour {firstName} 👋
            </h1>
            <p className="text-[13px] leading-5 text-ink/50">Copilote prêt pour vos arbitrages d’aujourd’hui.</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCE9F4] text-primary shadow-sm">
            <Bot size={20} />
          </div>
        </div>

        {usage ? (
          <p className="text-[11px] font-medium text-ink/45">
            Quota {usage.messageCount}
            {usage.maxMessages != null ? ` / ${usage.maxMessages}` : ""} ce mois
            {usage.remainingMessages != null ? ` · ${usage.remainingMessages} restants` : ""}
          </p>
        ) : null}

        <div className="mt-1 grid grid-cols-3 rounded-xl bg-[#F6E3EF] p-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg px-1 py-2 text-[13px] font-semibold transition",
                  active ? "bg-white font-bold text-primary shadow-sm" : "text-ink/50",
                )}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
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

      {tab === "conversation" ? (
        <section className="flex flex-col gap-4">
          {conversations.length ? (
            <div className="flex items-center gap-2">
              <select
                className="min-w-0 flex-1 truncate rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] text-ink/70"
                value={conversationId ?? ""}
                onChange={(e) => {
                  if (e.target.value) void onOpenConversation(e.target.value);
                  else onNewChat();
                }}
              >
                <option value="">Nouvelle session</option>
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || "Sans titre"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onNewChat}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink/70"
              >
                Nouveau
              </button>
            </div>
          ) : null}

          {lines.length === 0 && !analyzing ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-ink/45 shadow-sm">
              <p>Posez une question sur votre institut. Aucun exemple inventé n’est affiché.</p>
              {conversations.length ? (
                <ul className="mt-3 space-y-1">
                  {conversations.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenConversation(c.id)}
                        className="min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs text-ink/70 hover:bg-[#FFF7F9]"
                      >
                        {c.title || "Sans titre"}
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-ink/35"
                        onClick={() => onRemoveConversation(c.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
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
      ) : null}

      {tab === "diagnostics" ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[18px] font-bold text-ink">
              <BarChart3 size={18} className="text-primary" />
              Audits & décisions
            </h2>
            <span className="text-[11px] font-semibold text-ink/45">Données institut</span>
          </div>

          <article className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] text-primary">
                  <Wallet size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Santé financière du mois</h3>
                  <p className="text-[12px] text-ink/45">Période en cours</p>
                </div>
              </div>
              {!financeDenied && overview && overview.revenue.changePercent != null ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    (overview.revenue.changePercent ?? 0) >= 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-700",
                  )}
                >
                  {formatPct(overview.revenue.changePercent)}
                </span>
              ) : null}
            </div>
            {financeDenied ? (
              <p className="text-xs text-ink/50">Votre rôle n’a pas accès au CA global.</p>
            ) : overview ? (
              <>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="flex flex-col rounded-xl bg-[#FFEFF8] p-2.5">
                    <span className="text-[11px] text-ink/45">CA encaissé</span>
                    <span className="text-[22px] font-extrabold leading-7 text-ink">
                      {formatMad(overview.revenue.value).replace(" MAD", "")}{" "}
                      <span className="text-[12px] font-normal">MAD</span>
                    </span>
                    <span className="mt-0.5 text-[11px] font-semibold text-ink/50">
                      Mois préc. {overview.revenue.previous != null ? formatMad(overview.revenue.previous) : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-[#FFEFF8] p-2.5">
                    <span className="text-[11px] text-ink/45">Marge</span>
                    <span className="text-[22px] font-extrabold leading-7 text-primary">
                      {formatMad(overview.margin.value).replace(" MAD", "")}{" "}
                      <span className="text-[12px] font-normal">MAD</span>
                    </span>
                    <span className="mt-0.5 text-[11px] font-semibold text-primary">
                      Panier {formatMad(overview.averageTicket.value)}
                    </span>
                  </div>
                </div>
                <p className="flex items-center justify-between pt-1 text-[13px]">
                  <span className="text-ink/50">Top soin</span>
                  <span className="font-bold text-ink">{topService?.serviceName ?? "—"}</span>
                </p>
                <p className="text-[12px] text-ink/45">Jour le plus chargé : {bestDay?.label ?? "—"}</p>
              </>
            ) : (
              <p className="text-xs text-ink/45">Impossible de charger les analytics.</p>
            )}
          </article>

          <article className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] text-primary">
                  <CalendarClock size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Planning & saturation</h3>
                  <p className="text-[12px] capitalize text-ink/45">{saturdayLabel ?? "Samedi à venir"}</p>
                </div>
              </div>
              {saturdayOcc?.rate != null ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                  Occ. {saturdayOcc.rate} %
                </span>
              ) : null}
            </div>
            {saturdayHint ? (
              <>
                <div className="my-1 rounded-xl bg-[#FFEFF8] p-2">
                  <p className="text-[13px] leading-snug text-ink">
                    {`${saturdayHint.rdv} RDV ce samedi pour ${saturdayHint.onDuty.length} employée${saturdayHint.onDuty.length > 1 ? "s" : ""}${saturdayHint.onDuty.length ? ` (${saturdayHint.onDuty.join(", ")})` : " — personne planifiée"}.`}
                  </p>
                  {saturdayHint.wait > 0 && saturdayHint.off[0] ? (
                    <p className="mt-1.5 text-[12px] font-semibold text-amber-800">
                      {saturdayHint.wait} demande{saturdayHint.wait > 1 ? "s" : ""} en liste d’attente.{" "}
                      {saturdayHint.off[0]} est en repos — un renfort se décide dans le planning.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[12px] text-ink/45">Aucune tension liste d’attente / repos ce samedi.</p>
                  )}
                </div>
                <Link
                  href="/planning/"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-institut py-2.5 text-[14px] font-bold text-white"
                >
                  Ouvrir le planning
                </Link>
              </>
            ) : (
              <p className="text-xs text-ink/45">Planning indisponible.</p>
            )}
          </article>

          <article className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] text-primary">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Clientes inactives (+90 j)</h3>
                  <p className="text-[12px] text-ink/45">Fichier qualifié</p>
                </div>
              </div>
              <span className="text-[22px] font-extrabold text-ink">{reactivation?.days90 ?? "—"}</span>
            </div>
            <p className="text-[13px] text-ink/55">
              Potentiel estimé :{" "}
              <strong className="text-ink">
                {reactivation && reactivation.estimatedRevenue > 0 ? formatMad(reactivation.estimatedRevenue) : "—"}
              </strong>
            </p>
            <Link
              href="/reactivation/"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#F6E3EF] py-2.5 text-[14px] font-bold text-primary"
            >
              <Send size={16} />
              Ouvrir la relance ciblée
            </Link>
          </article>

          <article className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] text-primary">
                  <Package size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Stocks en seuil critique</h3>
                  <p className="text-[12px] text-ink/45">Approvisionnement</p>
                </div>
              </div>
              {stock ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                  {stock.outOfStockCount + stock.lowStockCount} alerte
                  {stock.outOfStockCount + stock.lowStockCount > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-col gap-1.5">
              {outProducts.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2 text-[13px]">
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="font-bold text-rose-600">Stock {p.stock}</span>
                </div>
              ))}
              {lowProducts.slice(0, 2).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2 text-[13px]">
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="font-bold text-amber-700">
                    {p.stock} / min {p.minStock}
                  </span>
                </div>
              ))}
              {!outProducts.length && !lowProducts.length ? (
                <p className="text-xs text-ink/45">Aucune rupture ni seuil critique.</p>
              ) : null}
            </div>
            <Link
              href="/purchases/"
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg bg-white py-2 text-[13px] font-bold text-ink shadow-sm"
            >
              Générer un bon de commande
            </Link>
          </article>
        </section>
      ) : null}

      {tab === "insights" ? (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-1.5 text-[18px] font-bold text-ink">
            <Lightbulb size={18} className="text-gold" />
            Signaux de la semaine
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            <MobileSignal
              title="No-shows"
              text={
                noShow?.rate != null
                  ? `Taux de no-show ${noShow.rate} % (${noShow.count} sur ${noShow.concerned}).`
                  : "Pas assez de RDV cette semaine pour un taux."
              }
            />
            <MobileSignal
              title="Stock"
              text={
                stock
                  ? `${stock.outOfStockCount} rupture${stock.outOfStockCount > 1 ? "s" : ""} · ${stock.lowStockCount} sous le seuil.`
                  : "Stock non chargé."
              }
            />
            <MobileSignal
              title="Samedi"
              text={
                saturdayOcc?.rate != null
                  ? `Occupation samedi ${saturdayOcc.rate} % sur la semaine en cours.`
                  : "Pas de donnée d’occupation samedi."
              }
            />
            <MobileSignal
              title="Relance"
              text={
                reactivation
                  ? `${reactivation.days90} clientes +90 j${reactivation.estimatedRevenue > 0 ? ` · potentiel ${formatMad(reactivation.estimatedRevenue)}` : ""}.`
                  : "Réactivation non chargée."
              }
            />
          </div>

          <article className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-ink">Ce que l’IA peut / ne peut pas</h3>
                <p className="text-xs text-ink/50">Aucune décision sans votre validation.</p>
              </div>
            </div>
            <PermBlock
              tone="emerald"
              title="Automatique"
              icon={<Check size={13} />}
              items={[
                "Analyser caisse, planning et stock",
                "Calculer statistiques et panier moyen",
                "Proposer des scénarios",
                "Rédiger des messages (sans les envoyer)",
              ]}
            />
            <PermBlock
              tone="amber"
              title="Avec votre clic"
              icon={<CircleAlert size={13} />}
              items={[
                "Créer ou modifier un RDV",
                "Ajuster un shift au planning",
                "Préparer une campagne WhatsApp",
                "Ouvrir un bon de commande",
              ]}
            />
            <PermBlock
              tone="rose"
              title="Interdit"
              icon={<Ban size={13} />}
              items={[
                "Supprimer des données clientes",
                "Modifier une clôture de caisse",
                "Changer les rôles utilisateurs",
                "Rembourser sans action gérante",
              ]}
            />
          </article>
        </section>
      ) : null}

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
              placeholder="Posez une question ou demandez une action…"
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

function MobileSignal({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3.5 shadow-sm">
      <h4 className="text-xs font-bold text-ink">{title}</h4>
      <p className="mt-0.5 text-[11px] leading-tight text-ink/55">{text}</p>
    </div>
  );
}

function PermBlock({
  tone,
  title,
  icon,
  items,
}: {
  tone: "emerald" | "amber" | "rose";
  title: string;
  icon: ReactNode;
  items: string[];
}) {
  const wrap = {
    emerald: "border-emerald-200/80 bg-emerald-50/50 text-emerald-950",
    amber: "border-amber-200/80 bg-amber-50/50 text-amber-950",
    rose: "border-rose-200/80 bg-rose-50/50 text-rose-950",
  };
  return (
    <div className={cn("space-y-1.5 rounded-xl border p-3", wrap[tone])}>
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide">
        {icon}
        {title}
      </p>
      <ul className="space-y-1 text-[11px] font-semibold">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
