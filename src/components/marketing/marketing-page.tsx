"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type CampaignTab,
  type ChannelFilter,
  ATTR_BAR_COLORS,
  CAMPAIGN_STATUS_LABEL,
  attributionShares,
  campaignConvLabel,
  conciergeTasks,
  customerSegments,
  filterCampaigns,
  initials,
  marketingInsight,
  marketingOpportunities,
  statusDot,
} from "@/components/marketing/marketing-helpers";
import { MarketingMobile } from "@/components/marketing/marketing-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canPrepareCampaigns, canWriteCampaigns } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listCustomers } from "@/modules/customers/service";
import {
  CAMPAIGN_CHANNEL_LABEL as CHANNEL_LABEL,
  DEFAULT_CAMPAIGN_MESSAGE,
  createCampaign,
  formatMad,
  listCampaigns,
  prepareCampaign,
  previewCampaignAudience,
  updateCampaignApi,
} from "@/modules/marketing/service";
import { listPromotions } from "@/modules/promo/service";
import { getReactivationDashboard } from "@/modules/reactivation/service";
import { listServices } from "@/modules/services/service";
import { getWhatsAppDashboard } from "@/modules/whatsapp/service";
import type { CampaignChannel, CampaignListItem, CampaignPreviewResult } from "@/types/campaign";
import type { CustomerKpis } from "@/types/customer";
import type { ReactivationKpis, ReactivationSettings } from "@/types/reactivation";
import type { WhatsAppTaskItem } from "@/types/whatsapp";

const PAGE_SIZE = 5;

export function MarketingPageView() {
  const { toast } = useToast();
  const router = useRouter();
  const user = useCurrentUser();
  const canWrite = canWriteCampaigns(user.role);
  const canPrepare = canPrepareCampaigns(user.role);
  const canWhatsapp = canAccessNav(user.role, "whatsapp");
  const canReactivation = canAccessNav(user.role, "reactivation");
  const canCustomers = canAccessNav(user.role, "customers");
  const canAgenda = canAccessNav(user.role, "agenda");
  const canPromotions = canAccessNav(user.role, "promotions");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof listCampaigns>>["kpis"] | null>(null);
  const [reactivation, setReactivation] = useState<ReactivationKpis | null>(null);
  const [settings, setSettings] = useState<ReactivationSettings | null>(null);
  const [customerKpis, setCustomerKpis] = useState<CustomerKpis | null>(null);
  const [waTasks, setWaTasks] = useState<WhatsAppTaskItem[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);

  const [tab, setTab] = useState<CampaignTab>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedWaId, setSelectedWaId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [formChannel, setFormChannel] = useState<CampaignChannel>("WHATSAPP");
  const [message, setMessage] = useState(DEFAULT_CAMPAIGN_MESSAGE);
  const [minDays, setMinDays] = useState("60");
  const [serviceId, setServiceId] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [promotions, setPromotions] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<CampaignPreviewResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const res = await listCampaigns();
      setItems(res.items);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger le marketing.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    const extras: Promise<void>[] = [];
    extras.push(
      listServices({ limit: 100 })
        .then((s) => setServices(s.data.map((x) => ({ id: x.id, name: x.name }))))
        .catch(() => undefined),
    );
    extras.push(
      listPromotions({ limit: 100 })
        .then((p) => {
          setPromotions(
            p.data.map((x) => ({ id: x.id, name: x.name + (x.code ? ` (${x.code})` : "") })),
          );
          const coded = p.data.find((x) => x.code && x.status === "ACTIVE");
          setPromoCode(coded?.code ?? p.data.find((x) => x.code)?.code ?? null);
        })
        .catch(() => undefined),
    );
    if (canReactivation) {
      extras.push(
        getReactivationDashboard({ relanceOnly: false })
          .then((r) => {
            setReactivation(r.kpis);
            setSettings(r.settings);
          })
          .catch(() => undefined),
      );
    }
    if (canWhatsapp) {
      extras.push(
        getWhatsAppDashboard("pending")
          .then((w) => setWaTasks(w.items))
          .catch(() => undefined),
      );
    }
    if (canCustomers) {
      extras.push(
        listCustomers({ limit: 1 })
          .then((c) => setCustomerKpis(c.kpis))
          .catch(() => undefined),
      );
    }
    Promise.all([refresh(), ...extras]).finally(() => setLoading(false));
  }, [refresh, canReactivation, canWhatsapp, canCustomers]);

  const filtered = useMemo(
    () => filterCampaigns(items, tab, channel, search),
    [items, tab, channel, search],
  );

  useEffect(() => {
    setPage(0);
  }, [tab, channel, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const insight = useMemo(
    () => marketingInsight({ kpis, reactivation, promoCode }),
    [kpis, reactivation, promoCode],
  );
  const opps = useMemo(
    () =>
      marketingOpportunities({
        reactivation,
        pendingWa: kpis?.pendingMessages ?? 0,
        draftCount: kpis?.draftCampaigns ?? 0,
        vipInactive: reactivation?.vipInactiveCount ?? 0,
      }),
    [reactivation, kpis],
  );
  const concierge = useMemo(() => conciergeTasks(waTasks), [waTasks]);
  const selectedWa = concierge.find((t) => t.id === selectedWaId) ?? concierge[0] ?? null;
  const segs = useMemo(
    () => customerSegments(customerKpis, reactivation),
    [customerKpis, reactivation],
  );
  const attr = useMemo(() => attributionShares(items), [items]);
  const sendConv =
    (kpis?.targetedCustomers ?? 0) > 0
      ? Math.round(((kpis?.sentMessages ?? 0) / kpis!.targetedCustomers) * 1000) / 10
      : null;

  function resetForm() {
    setStep(1);
    setName("");
    setFormChannel("WHATSAPP");
    setMessage(DEFAULT_CAMPAIGN_MESSAGE);
    setMinDays("60");
    setServiceId("");
    setPromotionId("");
    setPreview(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  async function handlePreview() {
    setSubmitting(true);
    try {
      const result = await previewCampaignAudience({
        channel: formChannel,
        messageTemplate: message,
        promotionId: promotionId || null,
        segmentFilters: {
          minDaysSinceLastVisit: Number(minDays) || 60,
          serviceIds: serviceId ? [serviceId] : undefined,
          marketingWhatsapp: formChannel === "WHATSAPP",
          marketingEmail: formChannel === "EMAIL",
          noUpcomingAppointment: true,
          excludeRecentMarketing: true,
        },
      });
      setPreview(result);
      setStep(2);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur preview", "error");
    }
    setSubmitting(false);
  }

  async function handleCreate() {
    setSubmitting(true);
    const result = await createCampaign({
      name,
      channel: formChannel,
      messageTemplate: message,
      promotionId: promotionId || undefined,
      segmentFilters: {
        minDaysSinceLastVisit: Number(minDays) || 60,
        serviceIds: serviceId ? [serviceId] : undefined,
        marketingWhatsapp: formChannel === "WHATSAPP",
        marketingEmail: formChannel === "EMAIL",
        noUpcomingAppointment: true,
        excludeRecentMarketing: true,
      },
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setOpen(false);
    resetForm();
    toast("Campagne créée.", "success");
    refresh();
    router.push(`/marketing/${result.campaign.id}`);
  }

  async function handleQuickPrepare(c: CampaignListItem) {
    if (!canPrepare) return;
    setSubmitting(true);
    const result = await prepareCampaign(c.id);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`${result.result.prepared} messages préparés — voir WhatsApp.`, "success");
    refresh();
    if (canWhatsapp) {
      getWhatsAppDashboard("pending")
        .then((w) => setWaTasks(w.items))
        .catch(() => undefined);
    }
  }

  async function handlePauseToggle(c: CampaignListItem) {
    if (!canWrite) return;
    const next = c.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setSubmitting(true);
    const result = await updateCampaignApi(c.id, { status: next });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(next === "PAUSED" ? "Campagne mise en pause." : "Campagne reprise.", "success");
    refresh();
  }

  function onCopy(text: string) {
    void navigator.clipboard?.writeText(text);
    toast("Texte copié.", "success");
  }

  const sharedMobile = {
    orgName: user.orgName,
    roleLabel: ROLE_LABEL[user.role],
    kpis,
    items,
    tab,
    onTab: setTab,
    loading,
    canWrite,
    canPrepare,
    canWhatsapp,
    canReactivation,
    submitting,
    onNew: openCreate,
    onPrepare: handleQuickPrepare,
    onPauseToggle: handlePauseToggle,
    reactivation,
    settings,
    customerKpis,
    waTasks,
    promoCode,
    selectedWaId,
    onSelectWa: setSelectedWaId,
  };

  const insightCta = insight.cta.includes("WhatsApp") && canWhatsapp && !canWrite;

  return (
    <>
      <MarketingMobile {...sharedMobile} />

      <div className="hidden space-y-5 lg:block">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#261900]">
                CA attribué caisse
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink/60">
                <Shield size={12} className="text-primary" />
                Opt-in WhatsApp
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE9F4] px-2.5 py-1 text-[10px] font-bold text-ink/70">
                {user.orgName}
              </span>
            </div>
            <h1 className="mt-2 text-[28px] font-bold leading-9 tracking-tight xl:text-[40px] xl:leading-[48px]">
              Marketing & campagnes commerciales
            </h1>
            <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
              Audience opt-in, préparation WhatsApp manuelle, CA rattaché aux codes promo validés en
              caisse — rien n’est envoyé sans validation humaine.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canAgenda ? (
              <Link
                href="/agenda/"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
              >
                <CalendarDays size={18} className="text-[#7B5900]" />
                Agenda
              </Link>
            ) : null}
            {canReactivation ? (
              <Link
                href="/reactivation/"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
              >
                <Settings size={18} className="text-ink/50" />
                Réactivation
              </Link>
            ) : null}
            {canWrite ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-[14px] font-bold text-white shadow-sm"
              >
                <Plus size={18} />
                Nouvelle campagne
              </button>
            ) : null}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl bg-ink p-6 text-[#FEECF7] shadow-sm xl:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDEA4] text-[#261900]">
                <Sparkles size={16} />
              </span>
              <h2 className="text-[18px] font-bold text-white">{insight.title}</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              Lecture des files
            </span>
          </div>
          <div className="mt-4 flex flex-col justify-between gap-4 rounded-lg bg-white/10 p-4 lg:flex-row lg:items-center">
            <div className="max-w-4xl">
              {insight.amount != null && insight.amount > 0 ? (
                <p className="text-[22px] font-bold tracking-tight text-[#FFDEA4]">
                  {formatMad(insight.amount)}
                </p>
              ) : null}
              <p className="mt-1 text-[15px] leading-relaxed text-white/80">{insight.body}</p>
            </div>
            {canWrite ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FFDEA4] px-6 text-[14px] font-bold text-[#261900]"
              >
                <Zap size={18} />
                {insight.cta}
              </button>
            ) : insightCta ? (
              <Link
                href="/whatsapp/"
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FFDEA4] px-6 text-[14px] font-bold text-[#261900]"
              >
                {insight.cta}
              </Link>
            ) : null}
          </div>
          {opps.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {opps.map((o) => (
                <Link
                  key={o.label}
                  href={o.href}
                  className="rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                    {o.label}
                  </p>
                  <p className="mt-1 text-[13px] text-white/70">{o.body}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Campagnes"
            value={`${kpis?.activeCampaigns ?? 0} / ${kpis?.totalCampaigns ?? 0}`}
            hint={`${kpis?.draftCampaigns ?? 0} brouillon${(kpis?.draftCampaigns ?? 0) > 1 ? "s" : ""}`}
          />
          <KpiCard
            label="Audience"
            value={String(kpis?.targetedCustomers ?? 0)}
            hint="Actives + terminées"
          />
          <KpiCard
            label="Envoyés"
            value={String(kpis?.sentMessages ?? 0)}
            hint={`${kpis?.pendingMessages ?? 0} à valider`}
          />
          <KpiCard
            label="À relancer"
            value={String(reactivation?.toRelance ?? "—")}
            hint="File réactivation"
          />
          <KpiCard
            label="CA attribué"
            value={formatMad(kpis?.attributedRevenue ?? 0)}
            hint="Factures promo liées"
            emphasize
          />
          <KpiCard
            label="Conv. envoi"
            value={sendConv == null ? "—" : `${sendConv.toLocaleString("fr-MA")} %`}
            hint="Envoyés / audience"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm lg:col-span-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex flex-wrap gap-1 rounded-lg bg-[#FFEFF8] p-1">
                {(
                  [
                    ["all", `Toutes (${kpis?.totalCampaigns ?? 0})`],
                    ["ACTIVE", `Actives (${kpis?.activeCampaigns ?? 0})`],
                    ["scheduled", `Planif. (${kpis?.scheduledCampaigns ?? 0})`],
                    ["DRAFT", `Brouillons (${kpis?.draftCampaigns ?? 0})`],
                    ["whatsapp", `WhatsApp (${kpis?.pendingMessages ?? 0})`],
                  ] as [CampaignTab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[14px] font-semibold",
                      tab === id ? "bg-white font-bold text-primary shadow-sm" : "text-ink/50 hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-ink/40" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Nom, code…"
                    className="h-9 w-40 rounded-lg bg-[#FFEFF8] pl-8 pr-2 text-[13px] outline-none"
                  />
                </div>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ChannelFilter)}
                  className="h-9 rounded-lg bg-[#FFEFF8] px-2 text-[13px] outline-none"
                >
                  <option value="all">Tous canaux</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">E-mail</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="py-10 text-center text-sm text-ink/50">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink/50">Aucune campagne sur ce filtre.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#FFEFF8]/80 text-[11px] font-bold uppercase tracking-wider text-ink/45">
                        <th className="rounded-l-lg px-3 py-3">Campagne</th>
                        <th className="px-3 py-3">Audience</th>
                        <th className="px-3 py-3">Canal</th>
                        <th className="px-3 py-3 text-right">Envoyés</th>
                        <th className="px-3 py-3 text-right">CA</th>
                        <th className="px-3 py-3 text-right">Conv.</th>
                        <th className="rounded-r-lg px-3 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FCE9F4]">
                      {pageRows.map((c) => (
                        <tr key={c.id} className="hover:bg-[#FFEFF8]/40">
                          <td className="px-3 py-3.5">
                            <div className="flex items-start gap-2.5">
                              <span
                                className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", statusDot(c.status))}
                                title={CAMPAIGN_STATUS_LABEL[c.status]}
                              />
                              <div>
                                <Link
                                  href={`/marketing/${c.id}`}
                                  className="block font-bold text-ink hover:text-primary"
                                >
                                  {c.name}
                                </Link>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  {c.promotionCode ? (
                                    <span className="rounded bg-[#FCE9F4] px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                                      {c.promotionCode}
                                    </span>
                                  ) : null}
                                  <span className="text-[11px] text-ink/45">
                                    {CAMPAIGN_STATUS_LABEL[c.status]}
                                    {c.promotionName ? ` · ${c.promotionName}` : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="font-medium">{c.audienceCount} cibles</span>
                            <span className="block text-[11px] text-ink/45">
                              {c.pendingCount} à envoyer
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                c.channel === "WHATSAPP"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-[#FCE9F4] text-primary",
                              )}
                            >
                              {CHANNEL_LABEL[c.channel]}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <span className="text-[17px] font-bold">{c.sentCount}</span>
                            <span className="block text-[11px] text-ink/45">sur {c.audienceCount}</span>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <span className="font-bold text-primary">{formatMad(c.attributedRevenue)}</span>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <span className="rounded bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold text-[#261900]">
                              {campaignConvLabel(c)}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              {canPrepare && c.status === "DRAFT" ? (
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => handleQuickPrepare(c)}
                                  title="Préparer l’audience"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/45 hover:bg-[#FFEFF8] hover:text-primary"
                                >
                                  <Play size={16} />
                                </button>
                              ) : null}
                              {canWrite && (c.status === "ACTIVE" || c.status === "PAUSED") ? (
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => handlePauseToggle(c)}
                                  title={c.status === "ACTIVE" ? "Mettre en pause" : "Reprendre"}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/45 hover:bg-[#FFEFF8] hover:text-primary"
                                >
                                  {c.status === "ACTIVE" ? <Pause size={16} /> : <Play size={16} />}
                                </button>
                              ) : null}
                              <Link
                                href={`/marketing/${c.id}`}
                                title="Détail"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/45 hover:bg-[#FFEFF8] hover:text-ink"
                              >
                                <Eye size={16} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col justify-between gap-2 border-t border-[#FCE9F4] pt-3 sm:flex-row sm:items-center">
                  <p className="text-[13px] text-ink/50">
                    Affichage de{" "}
                    <span className="font-semibold text-ink">{pageRows.length}</span> sur{" "}
                    <span className="font-semibold text-ink">{filtered.length}</span> campagnes
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pageSafe === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="rounded-lg bg-[#FFEFF8] px-3 py-1.5 text-[12px] font-semibold text-ink/50 disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[12px] font-bold text-white">
                      {pageSafe + 1}
                    </span>
                    <button
                      type="button"
                      disabled={pageSafe >= pageCount - 1}
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      className="rounded-lg bg-[#FFEFF8] px-3 py-1.5 text-[12px] font-semibold text-ink/50 disabled:opacity-40"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm lg:col-span-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <MessageCircle size={18} />
                </span>
                <div>
                  <h3 className="text-[18px] font-bold">Conciergerie WhatsApp</h3>
                  <p className="text-[11px] text-ink/45">1 clic · envoi manuel</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                {concierge.length} en attente
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-[#FFEFF8] p-2.5 text-[13px] text-ink/55">
              <Shield size={14} className="mt-0.5 shrink-0 text-[#7B5900]" />
              Validation humaine avant chaque envoi. Opt-in WhatsApp requis.
            </div>
            {!canWhatsapp ? (
              <p className="text-[13px] text-ink/50">Accès WhatsApp indisponible pour ce rôle.</p>
            ) : concierge.length === 0 ? (
              <p className="text-[13px] text-ink/50">
                Aucune tâche marketing en attente. Préparez une campagne brouillon pour alimenter la
                file.
              </p>
            ) : (
              <div className="space-y-2">
                {concierge.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-lg p-2.5",
                      selectedWa?.id === t.id ? "bg-[#FCE9F4]" : "bg-[#FFEFF8]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => setSelectedWaId(t.id)}
                      >
                        <span className="block truncate font-bold">{t.customerName}</span>
                        <span className="font-mono text-[11px] text-ink/45">{t.phoneSnapshot}</span>
                      </button>
                      <a
                        href={t.waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-[11px] font-bold text-white"
                      >
                        Ouvrir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedWa ? (
              <div className="space-y-2 rounded-lg bg-[#FFEFF8] p-3">
                <div className="flex justify-between text-[11px] text-ink/45">
                  <span>Aperçu · {selectedWa.customerName}</span>
                  <span className="font-bold text-emerald-700">wa.me</span>
                </div>
                <p className="whitespace-pre-wrap rounded bg-white p-2.5 text-[13px] leading-relaxed">
                  {selectedWa.messageSnapshot}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onCopy(selectedWa.messageSnapshot)}
                    className="flex h-10 flex-1 items-center justify-center rounded-lg bg-white text-[12px] font-semibold shadow-sm"
                  >
                    Copier
                  </button>
                  <a
                    href={selectedWa.waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-[12px] font-bold text-white"
                  >
                    Ouvrir WhatsApp
                  </a>
                </div>
              </div>
            ) : null}
            {canWhatsapp ? (
              <Link
                href="/whatsapp/"
                className="block text-center text-[13px] font-semibold text-primary hover:underline"
              >
                File WhatsApp complète
              </Link>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col justify-between space-y-3 rounded-xl bg-white p-5 shadow-sm">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[18px] font-bold">Segments</h4>
                <span className="rounded bg-[#FFDEA4]/60 px-2 py-0.5 text-[11px] font-bold text-[#261900]">
                  {segs.filter((s) => s.count > 0).length} actifs
                </span>
              </div>
              <p className="mb-3 text-[13px] text-ink/50">Comptages CRM et file de réactivation.</p>
              <div className="space-y-2">
                {segs.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2"
                  >
                    <span className="text-[13px] font-semibold">{s.label}</span>
                    <span className="font-mono text-[13px] font-bold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            {canCustomers ? (
              <Link
                href="/customers/"
                className="flex h-10 items-center justify-center rounded-lg bg-[#FFEFF8] text-[14px] font-semibold"
              >
                Ouvrir le CRM
              </Link>
            ) : canReactivation ? (
              <Link
                href="/reactivation/"
                className="flex h-10 items-center justify-center rounded-lg bg-[#FFEFF8] text-[14px] font-semibold"
              >
                File réactivation
              </Link>
            ) : null}
          </div>

          <div className="flex flex-col justify-between space-y-3 rounded-xl bg-white p-5 shadow-sm">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[18px] font-bold">Attribution CA</h4>
                <span className="text-[18px] font-bold text-primary">{formatMad(attr.total)}</span>
              </div>
              <p className="mb-3 text-[13px] text-ink/50">
                Factures liées à la promo d’une campagne, après préparation.
              </p>
              {attr.total > 0 ? (
                <>
                  <div className="flex h-4 overflow-hidden rounded-full bg-[#FFEFF8]">
                    {attr.rows.map((r, i) => (
                      <div
                        key={r.id}
                        className={ATTR_BAR_COLORS[i % ATTR_BAR_COLORS.length]}
                        style={{ width: `${r.pct}%` }}
                        title={`${r.name} (${r.pct} %)`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 space-y-2 text-[13px]">
                    {attr.rows.slice(0, 4).map((r, i) => (
                      <div key={r.id} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 truncate pr-2">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              ATTR_BAR_COLORS[i % ATTR_BAR_COLORS.length],
                            )}
                          />
                          {r.name}
                        </span>
                        <span className="shrink-0 font-bold">
                          {formatMad(r.amount)} ({r.pct} %)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-ink/45">Pas encore de CA rattaché.</p>
              )}
            </div>
            {canPromotions ? (
              <Link
                href="/promotions/"
                className="rounded-lg bg-[#FFEFF8] p-2.5 text-center text-[12px] font-semibold text-ink/60"
              >
                Gérer les codes promo
              </Link>
            ) : (
              <p className="rounded-lg bg-[#FFEFF8] p-2.5 text-[12px] text-ink/50">
                Attribution uniquement si une promo est liée et utilisée en caisse.
              </p>
            )}
          </div>

          <div className="flex flex-col justify-between space-y-3 rounded-xl bg-white p-5 shadow-sm">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[18px] font-bold">Anti-pression</h4>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  Opt-in
                </span>
              </div>
              <p className="mb-3 text-[13px] text-ink/50">
                Plafond réel entre deux messages marketing, mot-clé STOP côté WhatsApp.
              </p>
              <div className="space-y-2">
                <div className="rounded-lg bg-[#FFEFF8] p-2.5">
                  <div className="flex justify-between">
                    <span className="text-[13px] font-bold">Délai mini</span>
                    <span className="font-mono text-[13px] font-bold text-primary">
                      {settings ? `${settings.minimumDaysBetweenMarketingMessages} j` : "—"}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink/45">
                    Écart minimum entre deux sollicitations marketing.
                  </p>
                </div>
                <div className="rounded-lg bg-[#FFEFF8] p-2.5">
                  <div className="flex justify-between">
                    <span className="text-[13px] font-bold">Envoi</span>
                    <span className="text-[12px] font-bold text-emerald-700">Manuel</span>
                  </div>
                  <p className="text-[12px] text-ink/45">
                    Aucun envoi automatique. wa.me après préparation.
                  </p>
                </div>
                <div className="rounded-lg bg-[#FFEFF8] p-2.5">
                  <div className="flex justify-between">
                    <span className="text-[13px] font-bold">Consentement</span>
                    <span className="text-[11px] text-ink/45">Fiche cliente</span>
                  </div>
                  <p className="text-[12px] text-ink/45">
                    Seules les clientes opt-in WhatsApp / e-mail sont ciblées.
                  </p>
                </div>
              </div>
            </div>
            {canReactivation ? (
              <Link
                href="/reactivation/"
                className="flex items-center justify-between border-t border-[#FCE9F4] pt-2 text-[12px]"
              >
                <span className="text-ink/45">Réglages réactivation</span>
                <span className="font-semibold text-primary">Ouvrir</span>
              </Link>
            ) : null}
          </div>
        </section>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={step === 1 ? "Nouvelle campagne" : "Prévisualisation audience"}
      >
        {step === 1 ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Nom</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Promo rentrée 2026" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Canal</span>
              <Select value={formChannel} onChange={(e) => setFormChannel(e.target.value as CampaignChannel)}>
                <option value="WHATSAPP">WhatsApp (manuel)</option>
                <option value="EMAIL">E-mail (V1 — liste seulement)</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Service (optionnel)</span>
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Tous services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Dernière visite &gt; (jours)</span>
              <Input value={minDays} onChange={(e) => setMinDays(e.target.value)} type="number" min={1} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Promotion liée</span>
              <Select value={promotionId} onChange={(e) => setPromotionId(e.target.value)}>
                <option value="">Aucune</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Message</span>
              <textarea
                className="input min-h-[160px] w-full font-mono text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <Button disabled={submitting || !name.trim()} onClick={handlePreview}>
              Prévisualiser l&apos;audience
            </Button>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary-light/40 p-4">
              <p className="text-2xl font-semibold tabular-nums">{preview.eligibleCount} clientes</p>
              <p className="text-sm text-ink/60">
                {preview.excludedCount} exclue(s) (opt-in, spam, RDV futur…)
              </p>
              <ul className="mt-2 space-y-1 text-xs text-ink/55">
                {preview.checks.map((c) => (
                  <li key={c}>✓ {c}</li>
                ))}
              </ul>
            </div>
            {preview.sampleMessage ? (
              <div>
                <p className="mb-2 text-xs text-ink/50">
                  Exemple {preview.sampleCustomer ? `— ${preview.sampleCustomer.name}` : ""}
                </p>
                <pre className="whitespace-pre-wrap rounded-xl bg-ink/[0.03] p-3 text-sm">
                  {preview.sampleMessage}
                </pre>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button disabled={submitting || preview.eligibleCount === 0} onClick={handleCreate}>
                Créer la campagne
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

function KpiCard({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
      <p className={cn("mt-2 text-[28px] font-extrabold leading-none", emphasize && "text-primary")}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink/50">{hint}</p>
    </div>
  );
}
