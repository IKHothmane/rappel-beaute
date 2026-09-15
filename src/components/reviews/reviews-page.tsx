"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Star,
  ThumbsUp,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type ReviewSort,
  type ReviewTab,
  SATISFACTIONS,
  deltaMonth,
  filterReviews,
  followUpText,
  formatReviewWhen,
  initials,
  insightCopy,
  starsFor,
  tabCounts,
  waHref,
} from "@/components/reviews/reviews-helpers";
import { ReviewsMobile } from "@/components/reviews/reviews-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canManageReviewSettings, canSendReviews } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  getReviewsDashboard,
  recordReviewSatisfaction,
  skipReviewRequest,
  updateReviewSettings,
} from "@/modules/reviews/service";
import { markWhatsAppSent } from "@/modules/whatsapp/service";
import type {
  ReviewAlertItem,
  ReviewKpis,
  ReviewRequestItem,
  ReviewSatisfaction,
  ReviewSettings,
  StaffReviewScore,
} from "@/types/review";
import { REVIEW_SATISFACTION_LABEL } from "@/types/review";

const TABS: { id: ReviewTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "pending", label: "À envoyer" },
  { id: "awaiting", label: "À noter" },
  { id: "positive", label: "Positifs" },
  { id: "sensitive", label: "Sensibles" },
  { id: "recorded", label: "Saisis" },
  { id: "skipped", label: "Ignorés" },
];

export function ReviewsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canSend = canSendReviews(user.role);
  const canSettings = canManageReviewSettings(user.role);
  const directorName = `${user.firstName} ${user.lastName}`.trim() || "La direction";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewRequestItem[]>([]);
  const [kpis, setKpis] = useState<ReviewKpis | null>(null);
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [alerts, setAlerts] = useState<ReviewAlertItem[]>([]);
  const [staffScores, setStaffScores] = useState<StaffReviewScore[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ReviewTab>("all");
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tone, setTone] = useState<"warm" | "formal">("warm");
  const [googleUrl, setGoogleUrl] = useState("");
  const [delayHours, setDelayHours] = useState("3");
  const [maxWindow, setMaxWindow] = useState("24");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const res = await getReviewsDashboard({ status: "ALL" });
      setItems(res.items);
      setKpis(res.kpis);
      setSettings(res.settings);
      setAlerts(res.alerts);
      setStaffScores(res.staffScores ?? []);
    } catch {
      toast("Impossible de charger les avis.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!settings) return;
    setGoogleUrl(settings.googleReviewUrl ?? "");
    setDelayHours(String(settings.delayHours));
    setMaxWindow(String(settings.maxWindowHours));
    setEnabled(settings.enabled);
  }, [settings, settingsOpen]);

  const counts = useMemo(() => tabCounts(items), [items]);
  const filtered = useMemo(() => filterReviews(items, { tab, search, sort }), [items, tab, search, sort]);
  const insight = useMemo(() => insightCopy(kpis, alerts, items), [kpis, alerts, items]);

  useEffect(() => {
    if (selectedId && !filtered.some((i) => i.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    } else if (!selectedId && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = (selectedId ? items.find((i) => i.id === selectedId) : null) ?? filtered[0] ?? null;
  const monthDelta = kpis ? deltaMonth(kpis.recordedThisMonth, kpis.recordedPrevMonth) : null;
  const follow = selected
    ? followUpText(selected, user.orgName, directorName, tone)
    : "";

  function onCopy(text: string, label: string) {
    void navigator.clipboard?.writeText(text);
    toast(label, "success");
  }

  async function handleMarkSent(item: ReviewRequestItem) {
    if (!canSend || !item.whatsappTaskId) return;
    setSubmitting(true);
    const result = await markWhatsAppSent(item.whatsappTaskId);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Demande marquée comme envoyée.", "success");
    refresh();
  }

  async function handleSkip(reviewId: string) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await skipReviewRequest(reviewId);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Demande ignorée.", "success");
    refresh();
  }

  async function handleSatisfaction(reviewId: string, satisfaction: ReviewSatisfaction) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await recordReviewSatisfaction(reviewId, satisfaction);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Satisfaction enregistrée.", "success");
    refresh();
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await updateReviewSettings({
      googleReviewUrl: googleUrl.trim() || null,
      delayHours: Number(delayHours) || 3,
      maxWindowHours: Number(maxWindow) || 24,
      enabled,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setSettings(result.settings);
    setSettingsOpen(false);
    toast("Paramètres enregistrés.", "success");
    refresh();
  }

  const shared = {
    orgName: user.orgName,
    roleLabel: ROLE_LABEL[user.role],
    directorName,
    kpis,
    insight,
    alerts,
    search: searchInput,
    onSearch: setSearchInput,
    tab,
    onTab: setTab,
    counts,
    sort,
    onSort: setSort,
    loading,
    rows: filtered,
    selected,
    onSelect: setSelectedId,
    canSend,
    canSettings,
    onSettings: () => setSettingsOpen(true),
    onSolicit: () => {
      setTab("pending");
      const first = items.find((i) => i.status === "PENDING");
      if (first) setSelectedId(first.id);
    },
    submitting,
    onMarkSent: handleMarkSent,
    onSkip: handleSkip,
    onSatisfaction: handleSatisfaction,
    staffScores,
    googleUrl: settings?.googleReviewUrl ?? null,
    settingsEnabled: settings?.enabled ?? false,
    delayHours: settings?.delayHours ?? 3,
    onCopy,
  };

  return (
    <>
      <ReviewsMobile {...shared} />

      <div className="hidden space-y-6 lg:block">
        <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0DDE9] px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                <Lock size={13} className="text-primary" />
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6E3EF] px-3 py-1 text-[11px] font-bold uppercase text-[#B61149]">
                <Star size={13} className="text-[#7B5900]" />
                Collecte interne
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCCA66]/40 px-3 py-1 text-[11px] font-semibold text-[#5D4200]">
                <Shield size={13} />
                CNDP 09-08 · opt-in
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFEFF8] px-3 py-1 text-[11px] text-ink/55">
                <MapPin size={13} />
                {user.orgName}
              </span>
            </div>
            <h1 className="flex items-center gap-3 text-[28px] font-bold tracking-tight xl:text-[40px] xl:leading-[48px]">
              <Star size={32} className="text-[#7B5900]" fill="currentColor" />
              Avis & réputation
            </h1>
            <p className="max-w-3xl text-[15px] text-ink/55">
              Demandes après rendez-vous terminé, notes internes à trois niveaux, relance WhatsApp manuelle. Aucune
              publication Google ni réponse envoyée à votre place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSettings ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-4 text-[14px] font-semibold shadow-sm"
              >
                <Settings size={18} />
                Paramètres & délais
              </button>
            ) : null}
            {canSend ? (
              <button
                type="button"
                onClick={shared.onSolicit}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-4 text-[14px] font-semibold text-[#B61149] shadow-sm"
              >
                <Send size={18} />
                Solliciter ({counts.pending})
              </button>
            ) : null}
          </div>
        </header>

        <section className="relative overflow-hidden rounded-2xl bg-[#382D36] p-6 text-[#FEECF7] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCCA66]/30 text-[#FFDEA4]">
                <Sparkles size={20} />
              </span>
              <div>
                <p className="text-[18px] font-semibold text-white">Veille réputation interne</p>
                <p className="text-[13px] text-[#E7D5E0]">Lecture des demandes d’avis et des notes saisies — pas de NLP externe.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] text-[#FFDEA4]">
              <span className={cn("h-2 w-2 rounded-full", alerts.length ? "animate-ping bg-[#FFB2BD]" : "bg-emerald-400")} />
              {alerts.length ? `${alerts.length} alerte${alerts.length > 1 ? "s" : ""} insatisfaction` : "Aucune alerte ouverte"}
            </span>
          </div>
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl bg-white/10 p-5 lg:flex-row lg:items-center">
            <div>
              {alerts[0] ? (
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#FFB2BD]">Alerte prioritaire interne</p>
              ) : null}
              <p className="mt-1 text-[15px] text-white">{insight.headline}</p>
              <p className="mt-1 text-[13px] text-[#E7D5E0]">{insight.detail}</p>
            </div>
            {alerts[0] ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab("sensitive");
                    setSelectedId(alerts[0].reviewRequestId);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-white"
                >
                  Traiter l’alerte
                </button>
                <Link
                  href={`/customers/${alerts[0].customerId}/`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-[14px] font-semibold"
                >
                  Fiche cliente
                </Link>
              </div>
            ) : canSend && counts.pending > 0 ? (
              <button
                type="button"
                onClick={shared.onSolicit}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-white"
              >
                Voir les envois
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-emerald-300">
                <ThumbsUp size={16} />
                Prestations bien notées
              </p>
              <p className="mt-2 text-[13px] text-[#E7D5E0]">
                {insight.excellence.length
                  ? insight.excellence.map((e) => `${e.name} (${e.count})`).join(" · ")
                  : "Pas encore assez de notes positives pour un palmarès."}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-[#FFDEA4]">
                <AlertTriangle size={16} />
                Frictions
              </p>
              <p className="mt-2 text-[13px] text-[#E7D5E0]">
                {insight.friction.length
                  ? insight.friction.map((e) => `${e.name} (${e.count})`).join(" · ")
                  : "Aucune insatisfaction enregistrée."}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-[14px] font-semibold text-[#F0BF5C]">Objectif 4,8 / 5</p>
              <p className="mt-2 text-[13px] text-[#E7D5E0]">
                {kpis?.averageScore != null
                  ? `Note actuelle ${String(kpis.averageScore).replace(".", ",")} / 5.`
                  : "Pas encore de moyenne."}{" "}
                {insight.remaining
                  ? `${insight.remaining} avis 5★ supplémentaires pour atteindre 4,8 (calcul interne).`
                  : "Objectif atteint ou non calculable."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Note moyenne"
            value={kpis?.averageScore != null ? String(kpis.averageScore).replace(".", ",") : "—"}
            hint={`${kpis?.recordedCount ?? 0} avis saisis`}
            icon={<Star size={18} className="text-[#7B5900]" />}
          />
          <Kpi label="Total saisis" value={kpis ? String(kpis.recordedCount) : "—"} hint="3 niveaux internes" icon={<MessageCircle size={18} />} />
          <Kpi
            label="Ce mois"
            value={kpis ? String(kpis.recordedThisMonth) : "—"}
            hint={monthDelta != null ? `${monthDelta > 0 ? "+" : ""}${String(monthDelta).replace(".", ",")} % vs m-1` : "Saisies"}
            icon={<Send size={18} className="text-primary" />}
          />
          <Kpi
            label="Positifs"
            value={kpis ? String(kpis.positiveCount) : "—"}
            hint={kpis?.satisfiedPercent != null ? `${String(kpis.satisfiedPercent).replace(".", ",")} %` : "4★ et 5★"}
            icon={<ThumbsUp size={18} className="text-emerald-700" />}
          />
          <Kpi
            label="Sensibles"
            value={kpis ? String(kpis.sensitiveCount) : "—"}
            hint={alerts.length ? `${alerts.length} alerte${alerts.length > 1 ? "s" : ""}` : "Insatisfaites"}
            icon={<AlertTriangle size={18} className="text-[#BA1A1A]" />}
          />
          <Kpi
            label="À traiter"
            value={kpis ? String(kpis.pendingToSend + kpis.awaitingRecord) : "—"}
            hint={`${kpis?.pendingToSend ?? 0} envoi · ${kpis?.awaitingRecord ?? 0} note`}
            icon={<CheckCircle2 size={18} className="text-[#7B5900]" />}
          />
        </section>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[14px] font-semibold",
                      tab === t.id ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink hover:bg-[#F6E3EF]",
                    )}
                  >
                    {t.label} ({counts[t.id]})
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Rechercher cliente, soin, praticienne…"
                    className="h-11 w-full rounded-xl bg-[#FFEFF8] pl-10 pr-4 text-[13px] outline-none"
                  />
                </div>
                <Select className="h-11 w-full sm:w-56" value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)}>
                  <option value="recent">Plus récents</option>
                  <option value="low">Notes les plus basses</option>
                  <option value="high">Notes les plus hautes</option>
                  <option value="awaiting">En attente d’action</option>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="rounded-2xl bg-white p-8 text-center text-[13px] text-ink/45">Chargement…</p>
              ) : filtered.length === 0 ? (
                <p className="rounded-2xl bg-white p-8 text-center text-[13px] text-ink/50">Aucun élément sur ce filtre.</p>
              ) : (
                filtered.map((item) => {
                  const stars = starsFor(item);
                  const active = selected?.id === item.id;
                  const alert = item.satisfaction === "DISSATISFIED";
                  return (
                    <article
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "relative cursor-pointer space-y-3 overflow-hidden rounded-2xl bg-white p-6 shadow-sm",
                        active && "ring-1 ring-primary/30",
                        alert && "bg-gradient-to-r from-[#BA1A1A]/5 to-transparent",
                      )}
                    >
                      {alert ? <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-[#BA1A1A]" /> : null}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-bold", alert ? "bg-[#FFDAD6] text-[#93000A]" : "bg-[#F6E3EF]")}>
                            {initials(item.customerName)}
                          </span>
                          <div>
                            <h3 className="text-[18px] font-bold">{item.customerName}</h3>
                            <p className="text-[13px] text-ink/50">
                              {item.serviceName}
                              {item.staffName ? ` · ${item.staffName}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Stars n={stars} />
                          <p className="mt-1 text-[12px] text-ink/45">
                            {formatReviewWhen(item.satisfactionRecordedAt ?? item.sentAt ?? item.completedAt)}
                          </p>
                        </div>
                      </div>
                      {item.status === "PENDING" ? (
                        <p className="rounded-xl bg-[#FFEFF8] p-3 text-[14px] text-ink/70">Demande WhatsApp prête — envoi manuel.</p>
                      ) : item.status === "SENT" ? (
                        <p className="text-[14px] font-semibold text-[#7B5900]">Envoyée · satisfaction à saisir</p>
                      ) : item.satisfaction ? (
                        <p className="text-[14px] text-ink/70">{REVIEW_SATISFACTION_LABEL[item.satisfaction]}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/customers/${item.customerId}/`} onClick={(e) => e.stopPropagation()} className="rounded-xl bg-[#FCE9F4] px-3.5 py-2 text-[14px] font-semibold">
                          Fiche cliente
                        </Link>
                        {canSend && item.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                            }}
                            className="rounded-xl bg-primary px-4 py-2 text-[14px] font-semibold text-white"
                          >
                            Préparer l’envoi
                          </button>
                        ) : null}
                        {canSend && item.status === "SENT" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                            }}
                            className="rounded-xl bg-primary px-4 py-2 text-[14px] font-semibold text-white"
                          >
                            Saisir la note
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <aside className="sticky top-24 space-y-4 xl:col-span-4">
            {selected ? (
              <FocusPanel
                item={selected}
                follow={follow}
                tone={tone}
                setTone={setTone}
                canSend={canSend}
                submitting={submitting}
                onMarkSent={handleMarkSent}
                onSkip={handleSkip}
                onSatisfaction={handleSatisfaction}
                onCopy={onCopy}
              />
            ) : (
              <div className="rounded-2xl bg-white p-6 text-[13px] text-ink/45 shadow-sm">Sélectionnez une demande.</div>
            )}
          </aside>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-[18px] font-bold">Répartition interne</h3>
            <StarBar label="5★ très satisfaite" count={kpis?.verySatisfiedCount ?? 0} total={kpis?.recordedCount ?? 0} color="bg-primary" />
            <StarBar label="4★ satisfaite" count={kpis?.satisfiedCount ?? 0} total={kpis?.recordedCount ?? 0} color="bg-[#FCCA66]" />
            <StarBar label="1★ insatisfaite" count={kpis?.dissatisfiedCount ?? 0} total={kpis?.recordedCount ?? 0} color="bg-[#BA1A1A]" />
            <p className="text-[12px] text-ink/45">Le produit n’enregistre pas de 2★ ni 3★.</p>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-[18px] font-bold">Réputation par équipe</h3>
            {staffScores.length === 0 ? (
              <p className="text-[13px] text-ink/45">Pas encore de notes nominatives.</p>
            ) : (
              staffScores.map((s) => (
                <div key={s.staffId} className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[13px] font-bold">{s.initials}</span>
                    <div>
                      <p className="font-bold">{s.staffName}</p>
                      <p className="text-[12px] text-ink/45">{s.reviewCount} avis</p>
                    </div>
                  </div>
                  <p className="font-bold">{s.averageScore != null ? String(s.averageScore).replace(".", ",") : "—"}</p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-bold">Workflow réel</h3>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", settings?.enabled ? "bg-emerald-100 text-emerald-800" : "bg-[#F6E3EF] text-ink/55")}>
                {settings?.enabled ? "Actif" : "Désactivé"}
              </span>
            </div>
            <ol className="space-y-3 text-[13px] text-ink/70">
              <li>
                <strong className="text-ink">1. RDV terminé + {settings?.delayHours ?? 3} h</strong>
                <p>Une demande d’avis est créée (fenêtre {settings?.maxWindowHours ?? 24} h).</p>
              </li>
              <li>
                <strong className="text-ink">2. Envoi WhatsApp manuel</strong>
                <p>Vous ouvrez wa.me, puis marquez envoyé. Rien ne part tout seul.</p>
              </li>
              <li>
                <strong className="text-ink">3. Note interne</strong>
                <p>Très satisfaite / satisfaite / insatisfaite. Lien Google seulement si configuré et cliente satisfaite.</p>
              </li>
            </ol>
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 rounded-2xl bg-white p-5 text-[13px] text-ink/50 md:flex-row">
          <span className="flex items-center gap-2">
            <Lock size={16} className="text-[#7B5900]" />
            Isolation par institut · CNDP 09-08 · WhatsApp opt-in
          </span>
          <span>Aucune publication Google automatique</span>
        </footer>
      </div>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Paramètres des avis">
        <form className="space-y-4 overflow-y-auto p-5" onSubmit={handleSaveSettings}>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Activer la création des demandes après RDV
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Délai après RDV (heures)</span>
            <Input type="number" min={1} max={72} value={delayHours} onChange={(e) => setDelayHours(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Fenêtre max (heures)</span>
            <Input type="number" min={3} max={168} value={maxWindow} onChange={(e) => setMaxWindow(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Lien Google Review (optionnel)</span>
            <Input value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://g.page/r/…" />
          </label>
          <p className="text-[12px] text-ink/45">
            Le lien n’est jamais envoyé automatiquement. Il sert d’invitation manuelle si la cliente est satisfaite.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSettingsOpen(false)} className="h-11 rounded-lg bg-[#FFEFF8] px-4 text-[14px] font-semibold">
              Annuler
            </button>
            <Button type="submit" variant="brand" disabled={submitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}

function FocusPanel({
  item,
  follow,
  tone,
  setTone,
  canSend,
  submitting,
  onMarkSent,
  onSkip,
  onSatisfaction,
  onCopy,
}: {
  item: ReviewRequestItem;
  follow: string;
  tone: "warm" | "formal";
  setTone: (t: "warm" | "formal") => void;
  canSend: boolean;
  submitting: boolean;
  onMarkSent: (item: ReviewRequestItem) => void;
  onSkip: (id: string) => void;
  onSatisfaction: (id: string, s: ReviewSatisfaction) => void;
  onCopy: (text: string, label: string) => void;
}) {
  const requestHref = item.phoneSnapshot ? waHref(item.phoneSnapshot, item.messageSnapshot) : null;
  const followHref = item.phoneSnapshot ? waHref(item.phoneSnapshot, follow) : null;
  const stars = starsFor(item);

  return (
    <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#FCE9F4] pb-3">
        <h3 className="text-[18px] font-bold">Traitement</h3>
        {item.satisfaction === "DISSATISFIED" ? (
          <span className="rounded-full bg-[#BA1A1A] px-2.5 py-0.5 text-[11px] font-bold text-white">Action requise</span>
        ) : item.status === "PENDING" || item.status === "SENT" ? (
          <span className="rounded-full bg-[#FFDEA4] px-2.5 py-0.5 text-[11px] font-bold text-[#5D4200]">En cours</span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">Saisi</span>
        )}
      </div>
      <div className="rounded-xl bg-[#FFEFF8] p-4">
        <p className="text-[18px] font-bold">{item.customerName}</p>
        <p className="text-[13px] text-ink/55">
          {item.serviceName}
          {item.staffName ? ` · ${item.staffName}` : ""}
        </p>
        <div className="mt-2">
          <Stars n={stars} />
        </div>
      </div>

      {item.status === "PENDING" ? (
        <div className="space-y-3">
          <p className="text-[12px] font-bold uppercase tracking-wider text-ink/40">Message WhatsApp</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-[#FFEFF8] p-3 text-[13px] leading-relaxed">{item.messageSnapshot}</pre>
          {canSend ? (
            <div className="grid gap-2">
              {requestHref ? (
                <a href={requestHref} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl bg-emerald-600 text-[13px] font-bold text-white">
                  Ouvrir WhatsApp
                </a>
              ) : (
                <p className="text-[12px] text-ink/45">Pas de téléphone.</p>
              )}
              <button type="button" disabled={submitting || !item.whatsappTaskId} onClick={() => onMarkSent(item)} className="h-11 rounded-xl bg-primary text-[13px] font-bold text-white disabled:opacity-40">
                Marquer envoyé
              </button>
              <button type="button" disabled={submitting} onClick={() => onSkip(item.id)} className="h-11 rounded-xl bg-[#F6E3EF] text-[13px] font-semibold">
                Ignorer
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {item.status === "SENT" && canSend ? (
        <div className="space-y-2">
          <p className="text-[12px] font-bold uppercase tracking-wider text-ink/40">Satisfaction interne</p>
          {SATISFACTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={submitting}
              onClick={() => onSatisfaction(item.id, s)}
              className="h-11 w-full rounded-xl bg-[#FFEFF8] text-[13px] font-semibold hover:bg-[#F6E3EF]"
            >
              {REVIEW_SATISFACTION_LABEL[s]}
            </button>
          ))}
        </div>
      ) : null}

      {item.satisfaction === "DISSATISFIED" ? (
        <div className="space-y-3">
          <p className="text-[12px] font-bold uppercase tracking-wider text-ink/40">Suivi WhatsApp manuel</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTone("warm")} className={cn("h-9 flex-1 rounded-lg text-[12px] font-semibold", tone === "warm" ? "bg-primary text-white" : "bg-[#FFEFF8]")}>
              Conciliant
            </button>
            <button type="button" onClick={() => setTone("formal")} className={cn("h-9 flex-1 rounded-lg text-[12px] font-semibold", tone === "formal" ? "bg-primary text-white" : "bg-[#FFEFF8]")}>
              Plus formel
            </button>
          </div>
          <p className="rounded-xl bg-[#FFEFF8] p-3 text-[13px] leading-relaxed">{follow}</p>
          <div className="grid grid-cols-2 gap-2">
            {followHref ? (
              <a href={followHref} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl bg-emerald-600 text-[12px] font-bold text-white">
                WhatsApp
              </a>
            ) : (
              <span className="flex h-11 items-center justify-center rounded-xl bg-[#F6E3EF] text-[12px] text-ink/40">Sans tél.</span>
            )}
            <button type="button" onClick={() => onCopy(follow, "Texte copié")} className="h-11 rounded-xl bg-[#FCE9F4] text-[12px] font-semibold">
              Copier
            </button>
          </div>
        </div>
      ) : null}

      {item.satisfaction === "VERY_SATISFIED" || item.satisfaction === "SATISFIED" ? (
        item.googleReviewUrl ? (
          <a href={item.googleReviewUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl bg-[#7B5900] text-[13px] font-bold text-white">
            Ouvrir le lien Google
          </a>
        ) : (
          <p className="text-[12px] text-ink/45">Aucun lien Google dans les paramètres.</p>
        )
      ) : null}

      <Link href={`/customers/${item.customerId}/`} className="flex h-10 items-center justify-center rounded-xl bg-[#FFEFF8] text-[13px] font-semibold">
        Ouvrir la fiche cliente
      </Link>
    </div>
  );
}

function Kpi({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: ReactNode }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8]">{icon}</span>
      </div>
      <div className="pt-2">
        <div className="text-[28px] font-extrabold leading-9">{value}</div>
        <p className="pt-1 text-[12px] text-ink/45">{hint}</p>
      </div>
    </div>
  );
}

function StarBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="w-36 font-semibold">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#FCE9F4]">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right font-bold">
        {count} ({pct} %)
      </span>
    </div>
  );
}

function Stars({ n }: { n: number | null }) {
  if (n == null) return <span className="text-[12px] text-ink/35">Pas encore noté</span>;
  return (
    <span className="inline-flex text-[#7B5900]">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={16} fill={i < n ? "currentColor" : "none"} className={i < n ? "" : "text-[#E4BDC2]"} />
      ))}
      <span className="ml-1 text-[13px] font-bold text-ink">{n}/5</span>
    </span>
  );
}
