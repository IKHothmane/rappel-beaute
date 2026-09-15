"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Bot,
  CalendarDays,
  Check,
  CircleAlert,
  Lightbulb,
  Package,
  Radar,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { AiAssistantMobile } from "@/components/ai/ai-assistant-mobile";
import { FAST_PROMPTS, QUICK_PROMPTS, type ChatLine } from "@/components/ai/ai-assistant-shared";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { cellForStaffDay } from "@/components/planning/planning-helpers";
import { AgendaSkeleton } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  formatMad,
  formatPct,
  getAnalyticsAppointments,
  getAnalyticsOverview,
  getAnalyticsServices,
} from "@/modules/analytics/service";
import {
  deleteAIConversationApi,
  fetchAIConversation,
  fetchAIConversations,
  fetchAIUsage,
  sendAIChat,
  streamReveal,
} from "@/modules/ai/service";
import { listAppointments } from "@/modules/appointments/service";
import { getStockKpis, listProducts } from "@/modules/inventory/service";
import { getReactivationDashboard } from "@/modules/reactivation/service";
import { listStaffForAgenda } from "@/modules/staff/service";
import { listWaitingList } from "@/modules/waiting-list/service";
import { cn } from "@/lib/utils";
import type { AnalyticsOverview, AppointmentAnalytics, ServiceAnalyticsRow } from "@/types/analytics";
import type { AIConversationSummary, AIUsageSnapshot } from "@/types/ai";
import type { ProductListItem, StockKpis } from "@/types/inventory";
import type { ReactivationKpis } from "@/types/reactivation";
import type { StaffAgendaContext } from "@/types/staff";

function nextSaturday(from = new Date()) {
  const d = new Date(from);
  const add = d.getDay() === 6 ? 0 : 6 - d.getDay();
  d.setDate(d.getDate() + add);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

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
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [appointmentsStats, setAppointmentsStats] = useState<AppointmentAnalytics | null>(null);
  const [topService, setTopService] = useState<ServiceAnalyticsRow | null>(null);
  const [stock, setStock] = useState<StockKpis | null>(null);
  const [outProducts, setOutProducts] = useState<ProductListItem[]>([]);
  const [lowProducts, setLowProducts] = useState<ProductListItem[]>([]);
  const [reactivation, setReactivation] = useState<ReactivationKpis | null>(null);
  const [saturdayHint, setSaturdayHint] = useState<{
    date: Date;
    rdv: number;
    onDuty: string[];
    off: string[];
    wait: number;
  } | null>(null);
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
    void refreshSidebar();
  }, [refreshSidebar]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saturday = nextSaturday();
      const results = await Promise.allSettled([
        getAnalyticsOverview({ preset: "month", compare: true }),
        getAnalyticsAppointments({ preset: "week", compare: true }),
        getAnalyticsServices({ preset: "month" }),
        getStockKpis(),
        listProducts({ alert: "OUT", limit: 5, active: true }),
        listProducts({ alert: "LOW", limit: 5, active: true }),
        getReactivationDashboard({ relanceOnly: false }),
        listAppointments(),
        listStaffForAgenda(),
        listWaitingList({ status: "WAITING" }),
      ]);
      if (cancelled) return;

      const ov = results[0].status === "fulfilled" ? results[0].value : null;
      const appts = results[1].status === "fulfilled" ? results[1].value : null;
      const services = results[2].status === "fulfilled" ? results[2].value : null;
      const kpis = results[3].status === "fulfilled" ? results[3].value : null;
      const out = results[4].status === "fulfilled" ? results[4].value.data : [];
      const low = results[5].status === "fulfilled" ? results[5].value.data : [];
      const reac = results[6].status === "fulfilled" ? results[6].value.kpis : null;
      const apts = results[7].status === "fulfilled" ? results[7].value : [];
      const staff = results[8].status === "fulfilled" ? results[8].value : ([] as StaffAgendaContext[]);
      const wait = results[9].status === "fulfilled" ? results[9].value.items : [];

      setOverview(ov);
      setAppointmentsStats(appts);
      setTopService(services?.items?.[0] ?? null);
      setStock(kpis);
      setOutProducts(out);
      setLowProducts(low);
      setReactivation(reac);

      const dayApts = apts.filter((item) => item.status !== "CANCELLED" && sameDay(new Date(item.startAt), saturday));
      const onDuty = staff.filter((person) => {
        const cell = cellForStaffDay(person, saturday);
        return cell.kind === "work" || cell.kind === "overtime";
      });
      const off = staff.filter((person) => person.status === "ACTIVE" && cellForStaffDay(person, saturday).kind === "off");
      setSaturdayHint({
        date: saturday,
        rdv: dayApts.length,
        onDuty: onDuty.map((p) => p.firstName),
        off: off.map((p) => p.firstName),
        wait: wait.length,
      });
      setBoot(false);
    })().catch(() => setBoot(false));
    return () => {
      cancelled = true;
    };
  }, []);

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
  const connected = Boolean(usage) && !quotaBlocked;
  const bestDay = useMemo(() => {
    const rows = appointmentsStats?.occupationByWeekday ?? [];
    if (!rows.length) return null;
    return rows.reduce((best, row) => ((row.rate ?? 0) > (best.rate ?? 0) ? row : best), rows[0]);
  }, [appointmentsStats]);
  const saturdayOcc = appointmentsStats?.occupationByWeekday.find((row) => row.weekday === 6) ?? null;
  const noShow = appointmentsStats?.noShow ?? null;
  const financeDenied = user.role === "STAFF" || user.role === "CASHIER";

  if (boot) return <AgendaSkeleton />;

  return (
    <>
      <AiAssistantMobile
        firstName={user.firstName}
        orgName={user.orgName}
        connected={connected}
        quotaBlocked={quotaBlocked}
        usage={usage}
        financeDenied={financeDenied}
        overview={overview}
        bestDay={bestDay}
        topService={topService}
        saturdayHint={saturdayHint}
        saturdayOcc={saturdayOcc}
        stock={stock}
        outProducts={outProducts}
        lowProducts={lowProducts}
        reactivation={reactivation}
        noShow={noShow}
        lines={lines}
        analyzing={analyzing}
        loading={loading}
        message={message}
        onMessageChange={setMessage}
        onSend={(text) => void send(text)}
        onNewChat={newChat}
        conversations={conversations}
        conversationId={conversationId}
        onOpenConversation={(id) => void openConversation(id)}
        onRemoveConversation={(id) => void removeConversation(id)}
        inputRef={mobileInputRef}
      />

      <div className="hidden space-y-6 pb-10 lg:block">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-white via-[#FFF7F9] to-white p-6 shadow-soft">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
          Assistance IA · {user.orgName || "Institut"}
        </p>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-primary-light text-primary shadow-sm">
                <Bot size={20} />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Assistant Rappel Beauté — <span className="text-primary">Copilote de gestion</span>
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                  connected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-800",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")} />
                {connected ? "Connecté" : quotaBlocked ? "Non inclus au forfait" : "Quota à vérifier"}
              </span>
            </div>
            <p className="max-w-3xl text-sm text-ink/55">
              Analysez le CA, le planning, le stock et la relance. L’IA lit vos KPI ; elle n’envoie rien et ne
              modifie rien sans votre clic.
            </p>
            <p className="mt-2.5 text-xs font-semibold text-ink">
              Bonjour {user.firstName} · Que souhaitez-vous analyser aujourd’hui ?
            </p>
          </div>
          <div className="flex flex-col items-start gap-2.5 lg:items-end">
            <div className="flex items-center gap-2">
              <Button type="button" variant="brand" size="sm" onClick={newChat} disabled={quotaBlocked}>
                <Sparkles size={14} />
                Nouvelle question
              </Button>
              <Link
                href="/settings/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-[#FFF7F9]"
              >
                <Settings2 size={14} />
                Paramètres
              </Link>
            </div>
            {usage ? (
              <p className="rounded-xl border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink/55">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Quota {usage.messageCount}
                {usage.maxMessages != null ? ` / ${usage.maxMessages}` : ""} ce mois
                {usage.remainingMessages != null ? ` · ${usage.remainingMessages} restants` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-4">
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink/50">
              <Radar size={16} className="text-primary" />
              Outils métier & diagnostics
            </h2>
            <span className="rounded border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-gold">
              Données institut
            </span>
          </div>

          <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="flex items-center gap-2.5 text-xs font-extrabold tracking-wide text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-primary">
                  <Wallet size={15} />
                </span>
                Analyse financière
              </h3>
              {!financeDenied && overview && overview.revenue.changePercent != null ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    (overview.revenue.changePercent ?? 0) >= 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700",
                  )}
                >
                  {formatPct(overview.revenue.changePercent)}
                </span>
              ) : null}
            </div>
            {financeDenied ? (
              <p className="mt-4 text-xs text-ink/50">Votre rôle n’a pas accès au CA global.</p>
            ) : overview ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line bg-[#FAF7F8] p-3">
                  <div>
                    <p className="text-[11px] font-semibold text-ink/50">CA ce mois</p>
                    <p className="text-base font-extrabold text-ink">{formatMad(overview.revenue.value)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-ink/50">Mois précédent</p>
                    <p className="text-sm font-bold text-ink/70">
                      {overview.revenue.previous != null ? formatMad(overview.revenue.previous) : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3.5 space-y-1 border-l-2 border-primary py-0.5 pl-3 text-xs text-ink/55">
                  <p>
                    Dépenses {formatMad(overview.expenses.value)} · Marge{" "}
                    <strong className="text-emerald-700">{formatMad(overview.margin.value)}</strong>
                  </p>
                  <p>Panier moyen {formatMad(overview.averageTicket.value)}</p>
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
                  <div className="rounded-lg bg-[#FFFBF9] p-2">
                    <span className="block text-[10px] font-bold uppercase text-ink/45">Jour le plus chargé</span>
                    <span className="font-black text-ink">{bestDay?.label ?? "—"}</span>
                  </div>
                  <div className="rounded-lg bg-[#FFFBF9] p-2">
                    <span className="block text-[10px] font-bold uppercase text-ink/45">Meilleur service</span>
                    <span className="font-black text-ink">{topService?.serviceName ?? "—"}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-xs text-ink/45">Impossible de charger les analytics.</p>
            )}
          </article>

          <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="flex items-center gap-2.5 text-xs font-extrabold tracking-wide text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <CalendarDays size={15} />
                </span>
                Optimisation planning
              </h3>
              {saturdayHint ? (
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-ink/60">
                  {saturdayHint.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                </span>
              ) : null}
            </div>
            {saturdayHint ? (
              <>
                <div className="mt-3.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{saturdayHint.rdv} RDV ce samedi</span>
                  <span className="rounded border border-rose-100 bg-rose-50 px-2 py-0.5 font-black text-rose-600">
                    {saturdayHint.onDuty.length} employée{saturdayHint.onDuty.length > 1 ? "s" : ""} planifiée
                    {saturdayHint.onDuty.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-ink/50">
                  {saturdayHint.onDuty.length
                    ? `En service : ${saturdayHint.onDuty.join(", ")}.`
                    : "Personne n’est encore planifiée ce samedi."}
                </p>
                {saturdayHint.wait > 0 && saturdayHint.off[0] ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950">
                    <p className="mb-1 font-extrabold">Suggestion</p>
                    <p>
                      {saturdayHint.wait} demande{saturdayHint.wait > 1 ? "s" : ""} en liste d’attente.{" "}
                      <strong>{saturdayHint.off[0]}</strong> est en repos — un renfort se décide dans le planning,
                      pas ici.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-ink/45">Aucune tension liste d’attente / repos détectée pour ce samedi.</p>
                )}
                <Link
                  href="/planning/"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-extrabold text-white hover:bg-primary-dark"
                >
                  Ouvrir le planning
                  <ArrowRight size={14} />
                </Link>
                <p className="mt-2 text-center text-[10px] italic text-ink/35">
                  L’IA propose, elle n’altère jamais les shifts sans validation.
                </p>
              </>
            ) : (
              <p className="mt-4 text-xs text-ink/45">Planning indisponible.</p>
            )}
          </article>

          <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="flex items-center gap-2.5 text-xs font-extrabold tracking-wide text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Package size={15} />
                </span>
                Alertes stock
              </h3>
              {stock ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-600">
                  {stock.outOfStockCount} rupture{stock.outOfStockCount > 1 ? "s" : ""} · {stock.lowStockCount} seuil
                </span>
              ) : null}
            </div>
            <div className="mt-3.5 space-y-2 text-[11px]">
              {outProducts.slice(0, 2).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-line bg-[#FAF7F8] px-3 py-2">
                  <span className="font-bold text-ink">{p.name}</span>
                  <span className="font-extrabold text-rose-600">Stock {p.stock}</span>
                </div>
              ))}
              {lowProducts.slice(0, 2).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-line bg-[#FAF7F8] px-3 py-2">
                  <span className="font-bold text-ink">{p.name}</span>
                  <span className="font-extrabold text-amber-700">
                    {p.stock} / min {p.minStock}
                  </span>
                </div>
              ))}
              {!outProducts.length && !lowProducts.length ? (
                <p className="text-ink/45">Aucune rupture ni seuil critique pour le moment.</p>
              ) : null}
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href="/purchases/"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-institut py-2 text-xs font-bold text-white hover:bg-black"
              >
                Bons d’achat
              </Link>
              <Link
                href="/stock/"
                className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-[#FBF5F7]"
              >
                Voir stock
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="flex items-center gap-2.5 text-xs font-extrabold tracking-wide text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Users size={15} />
                </span>
                Rétention & relance
              </h3>
              {reactivation && reactivation.estimatedRevenue > 0 ? (
                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-700">
                  ≈ {formatMad(reactivation.estimatedRevenue)}
                </span>
              ) : null}
            </div>
            {reactivation ? (
              <div className="mt-3.5 space-y-2 text-xs">
                <RetentionRow tone="rose" count={reactivation.days90} label="Inactives +90 jours" tag="Critique" />
                <RetentionRow tone="amber" count={reactivation.days60} label="Inactives 60–90 jours" tag="Relance" />
                <RetentionRow
                  tone="emerald"
                  count={reactivation.days30 + reactivation.days45}
                  label="30–60 jours"
                  tag="À surveiller"
                />
              </div>
            ) : (
              <p className="mt-4 text-xs text-ink/45">Module réactivation indisponible.</p>
            )}
            <div className="mt-4 flex gap-2">
              <Link
                href="/reactivation/"
                className="flex flex-1 items-center justify-center rounded-xl bg-primary py-2 text-xs font-bold text-white hover:bg-primary-dark"
              >
                Campagne ciblée
              </Link>
              <Link
                href="/whatsapp/"
                className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink/70 hover:bg-[#FBF5F7]"
              >
                WhatsApp
              </Link>
            </div>
          </article>
        </section>

        <section className="flex min-h-[640px] flex-col rounded-2xl border border-line bg-white shadow-soft lg:col-span-7 lg:min-h-[820px]">
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
                className="rounded-xl p-2 text-ink/40 hover:bg-slate-100 hover:text-ink"
                title="Nouvelle discussion"
              >
                <RefreshCw size={14} />
              </button>
              {conversations.length ? (
                <select
                  className="max-w-[140px] truncate rounded-lg border border-line bg-slate-50 px-2 py-1 text-[11px] font-mono text-ink/60"
                  value={conversationId ?? ""}
                  onChange={(e) => {
                    if (e.target.value) void openConversation(e.target.value);
                    else newChat();
                  }}
                >
                  <option value="">Nouvelle session</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || "Sans titre"}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {lines.length === 0 && !analyzing ? (
              <div className="space-y-3 text-sm text-ink/45">
                <p>Posez une question sur votre institut. Aucun exemple inventé n’est affiché.</p>
                {conversations.length ? (
                  <ul className="space-y-1">
                    {conversations.slice(0, 6).map((c) => (
                      <li key={c.id} className="group flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openConversation(c.id)}
                          className="min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs text-ink/70 hover:bg-[#FFF7F9]"
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
                    ))}
                  </ul>
                ) : null}
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

          <div className="space-y-3 rounded-b-2xl border-t border-line bg-white p-4">
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
                placeholder={`Question pour l’assistant de ${user.orgName || "l’institut"}…`}
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
        </section>
      </div>

      <section className="space-y-4 pt-2">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink/50">
            <Lightbulb size={16} className="text-gold" />
            Signaux de la semaine
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <SignalCard
            tone="rose"
            title="No-shows"
            text={
              noShow?.rate != null
                ? `Taux de no-show ${noShow.rate} % (${noShow.count} sur ${noShow.concerned}).`
                : "Pas assez de RDV cette semaine pour un taux."
            }
          />
          <SignalCard
            tone="amber"
            title="Stock"
            text={
              stock
                ? `${stock.outOfStockCount} rupture${stock.outOfStockCount > 1 ? "s" : ""} · ${stock.lowStockCount} sous le seuil.`
                : "Stock non chargé."
            }
          />
          <SignalCard
            tone="gold"
            title="Samedi"
            text={
              saturdayOcc?.rate != null
                ? `Occupation samedi ${saturdayOcc.rate} % sur la semaine en cours.`
                : "Pas de donnée d’occupation samedi."
            }
          />
          <SignalCard
            tone="emerald"
            title="Relance"
            text={
              reactivation
                ? `${reactivation.days90} clientes +90 j${reactivation.estimatedRevenue > 0 ? ` · potentiel ${formatMad(reactivation.estimatedRevenue)}` : ""}.`
                : "Réactivation non chargée."
            }
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-ink">Ce que l’IA peut / ne peut pas faire</h4>
                <p className="text-xs text-ink/50">Aucune décision financière ou envoi client sans votre validation.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <PermissionCol
              tone="emerald"
              title="Automatique"
              icon={<Check size={14} />}
              items={[
                "Analyser caisse, planning et stock",
                "Calculer statistiques et panier moyen",
                "Détecter baisses de CA et seuils",
                "Proposer des scénarios",
                "Rédiger des messages (sans les envoyer)",
              ]}
            />
            <PermissionCol
              tone="amber"
              title="Avec votre clic"
              icon={<CircleAlert size={14} />}
              items={[
                "Créer ou modifier un RDV",
                "Ajuster un shift au planning",
                "Préparer une campagne WhatsApp",
                "Ouvrir un bon de commande",
              ]}
            />
            <PermissionCol
              tone="rose"
              title="Interdit"
              icon={<Ban size={14} />}
              items={[
                "Supprimer des données clientes",
                "Modifier une clôture de caisse",
                "Changer les rôles utilisateurs",
                "Rembourser sans action gérante",
              ]}
            />
          </div>
        </div>

        <p className="pb-4 text-center text-[11px] text-ink/40">
          Vos données restent dans votre institut. L’IA n’entraîne pas de modèle tiers avec votre caisse.
        </p>
      </section>
      </div>
    </>
  );
}

function RetentionRow({
  tone,
  count,
  label,
  tag,
}: {
  tone: "rose" | "amber" | "emerald";
  count: number;
  label: string;
  tag: string;
}) {
  const tones = {
    rose: "text-rose-600",
    amber: "text-amber-600",
    emerald: "text-emerald-700",
  };
  const tags = {
    rose: "border-gray-200 bg-white text-gray-500",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-[#FAF7F8] p-2">
      <p>
        <span className={cn("font-extrabold", tones[tone])}>{count} clientes</span>
        <span className="text-ink/50"> · {label}</span>
      </p>
      <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold", tags[tone])}>{tag}</span>
    </div>
  );
}

function SignalCard({
  tone,
  title,
  text,
}: {
  tone: "rose" | "amber" | "gold" | "emerald";
  title: string;
  text: string;
}) {
  const box = {
    rose: "border-rose-200/80",
    amber: "border-amber-200/80",
    gold: "border-yellow-200/80",
    emerald: "border-emerald-200/80",
  };
  const iconBox = {
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-700",
    gold: "bg-yellow-50 text-yellow-800",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  const titleC = {
    rose: "text-rose-700",
    amber: "text-amber-800",
    gold: "text-yellow-800",
    emerald: "text-emerald-800",
  };
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-sm", box[tone])}>
      <span className={cn("rounded-lg p-1.5", iconBox[tone])}>
        <AlertTriangle size={16} />
      </span>
      <div>
        <h4 className={cn("text-xs font-bold", titleC[tone])}>{title}</h4>
        <p className="mt-0.5 text-[11px] leading-tight text-ink/55">{text}</p>
      </div>
    </div>
  );
}

function PermissionCol({
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
    <div className={cn("space-y-2.5 rounded-xl border p-4", wrap[tone])}>
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5 text-[11px] font-semibold">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-0.5">{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
