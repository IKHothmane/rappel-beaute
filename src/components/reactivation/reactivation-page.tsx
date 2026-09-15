"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Flame,
  MessageCircle,
  MoreVertical,
  Pause,
  Search,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type AbsenceSegment,
  type ReactivationTab,
  REACTIVATION_PAGE_SIZE,
  crmChip,
  exportReactivationCsv,
  filterCustomers,
  funnelSteps,
  fullName,
  initials,
  reactivationInsight,
  readyCustomers,
  segmentCounts,
  statusLabel,
  todayPotential as sumPotential,
  uniqueServices,
  uniqueStaff,
  waMeLink,
} from "@/components/reactivation/reactivation-helpers";
import { ReactivationMobile } from "@/components/reactivation/reactivation-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  canAccessNav,
  canSendReactivation,
  canWriteReactivationSettings,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { CAMPAIGN_STATUS_LABEL, listCampaigns } from "@/modules/marketing/service";
import {
  formatLastVisit,
  formatMad,
  getReactivationDashboard,
  prepareReactivationWhatsApp,
  snoozeReactivationCustomer,
  updateReactivationSettings,
} from "@/modules/reactivation/service";
import type { CampaignKpis, CampaignListItem } from "@/types/campaign";
import type { ReactivationCustomerItem, ReactivationKpis, ReactivationSettings } from "@/types/reactivation";

export function ReactivationPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canSend = canSendReactivation(user.role);
  const canConfigure = canWriteReactivationSettings(user.role);
  const canCustomers = canAccessNav(user.role, "customers");
  const canAgenda = canAccessNav(user.role, "agenda");
  const canWhatsapp = canAccessNav(user.role, "whatsapp");
  const canMarketing = canAccessNav(user.role, "marketing");
  const canPromotions = canAccessNav(user.role, "promotions");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReactivationCustomerItem[]>([]);
  const [kpis, setKpis] = useState<ReactivationKpis | null>(null);
  const [settings, setSettings] = useState<ReactivationSettings | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [campaignKpis, setCampaignKpis] = useState<CampaignKpis | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ReactivationTab>("ready");
  const [segment, setSegment] = useState<AbsenceSegment>("all");
  const [service, setService] = useState("");
  const [staff, setStaff] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<{ customerId: string; message: string; waLink: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const [minDays, setMinDays] = useState("30");
  const [autoSync, setAutoSync] = useState(true);
  const [th30, setTh30] = useState(true);
  const [th45, setTh45] = useState(true);
  const [th60, setTh60] = useState(true);
  const [th90, setTh90] = useState(true);
  const [promo30, setPromo30] = useState("");
  const [promo45, setPromo45] = useState("");
  const [promo60, setPromo60] = useState("");
  const [promo90, setPromo90] = useState("");
  const [disc30, setDisc30] = useState("");
  const [disc45, setDisc45] = useState("");
  const [disc60, setDisc60] = useState("");
  const [disc90, setDisc90] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const res = await getReactivationDashboard({ relanceOnly: true });
      setItems(res.data);
      setKpis(res.kpis);
      setSettings(res.settings);
      setMinDays(String(res.settings.minimumDaysBetweenMarketingMessages));
      setAutoSync(res.settings.autoCreateWhatsAppTasks);
      setTh30(res.settings.threshold30Enabled);
      setTh45(res.settings.threshold45Enabled);
      setTh60(res.settings.threshold60Enabled);
      setTh90(res.settings.threshold90Enabled);
      setPromo30(res.settings.promoCode30 ?? "");
      setPromo45(res.settings.promoCode45 ?? "");
      setPromo60(res.settings.promoCode60 ?? "");
      setPromo90(res.settings.promoCode90 ?? "");
      setDisc30(res.settings.promoDiscount30 ?? "");
      setDisc45(res.settings.promoDiscount45 ?? "");
      setDisc60(res.settings.promoDiscount60 ?? "");
      setDisc90(res.settings.promoDiscount90 ?? "");
    } catch {
      toast("Impossible de charger la réactivation.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!canMarketing) return;
    listCampaigns()
      .then((res) => {
        setCampaigns(res.items);
        setCampaignKpis(res.kpis);
      })
      .catch(() => {
        setCampaigns([]);
        setCampaignKpis(null);
      });
  }, [canMarketing]);

  useEffect(() => {
    setPage(1);
  }, [search, tab, segment, service, staff]);

  const services = useMemo(() => uniqueServices(items), [items]);
  const staffNames = useMemo(() => uniqueStaff(items), [items]);
  const ready = useMemo(() => readyCustomers(items), [items]);
  const todayReady = useMemo(() => ready.slice(0, 12), [ready]);
  const todayPot = useMemo(() => sumPotential(todayReady), [todayReady]);
  const segments = useMemo(() => segmentCounts(kpis), [kpis]);
  const insight = useMemo(() => reactivationInsight(kpis), [kpis]);
  const funnel = useMemo(() => funnelSteps(kpis), [kpis]);

  const tabCounts = useMemo(
    () => ({
      all: items.length,
      ready: ready.length,
      vip: items.filter((c) => c.status === "VIP").length,
      spend: items.filter((c) => c.totalRevenue >= 3000).length,
      first: items.filter((c) => c.visits === 1).length,
    }),
    [items, ready],
  );

  const filtered = useMemo(
    () => filterCustomers(items, { search, tab, segment, service, staff }),
    [items, search, tab, segment, service, staff],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / REACTIVATION_PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount);
  const paged = filtered.slice(
    (pageSafe - 1) * REACTIVATION_PAGE_SIZE,
    pageSafe * REACTIVATION_PAGE_SIZE,
  );

  const selected =
    (selectedId ? items.find((c) => c.id === selectedId) : undefined) ?? paged[0] ?? filtered[0] ?? null;

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
    if (selectedId && filtered.length && !filtered.some((c) => c.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [selected, selectedId, filtered]);

  const topCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => b.sentCount - a.sentCount || b.audienceCount - a.audienceCount).slice(0, 3),
    [campaigns],
  );

  function startSession() {
    setTab("ready");
    setSegment("all");
    const first = todayReady[0];
    if (first) setSelectedId(first.id);
  }

  async function handlePrepareWhatsApp(customer: ReactivationCustomerItem) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await prepareReactivationWhatsApp(customer.id);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Message préparé — visible dans WhatsApp.", "success");
    setPreview({ customerId: customer.id, message: result.message, waLink: result.waLink });
    refresh();
  }

  async function handleSnooze(customerId: string) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await snoozeReactivationCustomer(customerId, 30);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Cliente ignorée pour 30 jours.", "success");
    refresh();
  }

  async function handleSaveSettings() {
    setSubmitting(true);
    const result = await updateReactivationSettings({
      minimumDaysBetweenMarketingMessages: Number(minDays) || 30,
      autoCreateWhatsAppTasks: autoSync,
      threshold30Enabled: th30,
      threshold45Enabled: th45,
      threshold60Enabled: th60,
      threshold90Enabled: th90,
      promoCode30: promo30 || null,
      promoCode45: promo45 || null,
      promoCode60: promo60 || null,
      promoCode90: promo90 || null,
      promoDiscount30: disc30 || null,
      promoDiscount45: disc45 || null,
      promoDiscount60: disc60 || null,
      promoDiscount90: disc90 || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Paramètres enregistrés.", "success");
    setSettingsOpen(false);
    refresh();
  }

  async function copyMessage() {
    if (!preview?.message) return;
    try {
      await navigator.clipboard.writeText(preview.message);
      toast("Message copié.", "success");
    } catch {
      toast("Impossible de copier.", "error");
    }
  }

  const selectedPreview = preview?.customerId === selected?.id ? preview : null;
  const avgRecovered =
    kpis && kpis.returnedCount > 0 ? kpis.recoveredRevenue / kpis.returnedCount : null;

  const shared = {
    orgName: user.orgName,
    kpis,
    segments,
    insight,
    search: searchInput,
    onSearch: setSearchInput,
    tab,
    onTab: setTab,
    segment,
    onSegment: setSegment,
    tabCounts,
    loading,
    rows: filtered,
    todayReady,
    todayPotential: todayPot,
    selected,
    onSelect: setSelectedId,
    canSend,
    canConfigure,
    canCustomers,
    canAgenda,
    canWhatsapp,
    canMarketing,
    canPromotions,
    submitting,
    preview,
    campaigns: topCampaigns,
    campaignRevenue: campaignKpis?.attributedRevenue ?? null,
    onSettings: () => setSettingsOpen(true),
    onExport: () => exportReactivationCsv(filtered),
    onPrepare: handlePrepareWhatsApp,
    onSnooze: handleSnooze,
    onStartSession: startSession,
  };

  return (
    <>
      <ReactivationMobile {...shared} />

      <div className="hidden space-y-5 lg:block">
        <section className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm xl:flex-row xl:items-center">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#382D36] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE9F4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                Relances ≥ 30 j
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[11px] font-semibold text-ink/60">
                {user.orgName || "Salon"}
              </span>
            </div>
            <h1 className="text-[28px] font-bold leading-9 tracking-tight">Réactivation clientes</h1>
            <p className="max-w-2xl text-[15px] text-ink/55">
              Clientes sans visite depuis au moins 30 jours. Les volumes viennent du CRM — aucun KPI inventé.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canConfigure ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FCE9F4] px-4 text-[14px] font-semibold"
              >
                <SlidersHorizontal size={18} />
                Configurer seuils
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => exportReactivationCsv(filtered)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FCE9F4] px-4 text-[14px] font-semibold"
            >
              <Download size={18} />
              Exporter CSV
            </button>
            {canMarketing ? (
              <Link
                href="/marketing/"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-white shadow-sm"
              >
                + Nouvelle campagne
              </Link>
            ) : null}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl bg-[#382D36] p-6 text-white shadow-md">
          <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                <Flame size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[18px] font-bold">
                    À faire aujourd’hui ({todayReady.length} cliente
                    {todayReady.length > 1 ? "s" : ""} prête{todayReady.length > 1 ? "s" : ""})
                  </h2>
                  {todayReady.length > 0 ? (
                    <span className="rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold text-[#261900]">
                      Potentiel {formatMad(todayPot)}
                    </span>
                  ) : null}
                </div>
                <p className="text-[13px] text-white/70">{insight}</p>
                {todayReady[0] ? (
                  <p className="pt-1 text-[12px] font-semibold text-[#FFDEA4]">
                    Prochaine : {fullName(todayReady[0])}
                    {todayReady[0].status === "VIP" ? " · VIP" : ""} —{" "}
                    {todayReady[0].daysSinceLastVisit} j d’absence
                  </p>
                ) : (
                  <p className="pt-1 text-[12px] text-white/55">
                    Aucune relance WhatsApp possible pour le moment (opt-in, pause, RDV à venir ou délai min.).
                  </p>
                )}
              </div>
            </div>
            {todayReady.length > 0 && canSend ? (
              <button
                type="button"
                onClick={startSession}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-white shadow-lg"
              >
                <Zap size={18} />
                Commencer la session ({todayReady.length})
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi
            label="Clientes inactives"
            value={kpis ? String(kpis.inactiveCount) : "—"}
            hint="≥ 30 j sans visite"
            icon={<Users size={18} />}
          />
          <Kpi
            label="À relancer"
            value={kpis ? String(kpis.toRelance) : "—"}
            hint={kpis ? `${pctOf(kpis.toRelance, kpis.inactiveCount)} du vivier` : "Hors pause"}
            icon={<Flame size={18} className="text-primary" />}
            accent
          />
          <Kpi
            label="Déjà contactées"
            value={kpis ? String(kpis.contactedCount) : "—"}
            hint="Dernier message marketing envoyé"
            icon={<MessageCircle size={18} />}
          />
          <Kpi
            label="Revenues"
            value={kpis ? String(kpis.returnedCount) : "—"}
            hint="RDV facturé après une relance envoyée"
            icon={<CheckCircle2 size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Taux de conversion"
            value={kpis?.conversionPct == null ? "—" : `${kpis.conversionPct} %`}
            hint="Revenues / contactées"
            icon={<TrendingUp size={18} />}
          />
          <Kpi
            label="CA récupéré"
            value={kpis ? formatMad(kpis.recoveredRevenue) : "—"}
            hint={avgRecovered != null ? `Moy. ${formatMad(avgRecovered)} / cliente` : "Aucun retour attribué"}
            icon={<Wallet size={18} />}
          />
        </section>

        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <SegmentCard
              label="30–60 jours"
              hint="À surveiller"
              count={segments.watch}
              active={segment === "watch"}
              onClick={() => setSegment(segment === "watch" ? "all" : "watch")}
              dot="bg-[#7B5900]"
            />
            <SegmentCard
              label="60–90 jours"
              hint="Relance prioritaire"
              count={segments.relance}
              active={segment === "relance"}
              onClick={() => setSegment(segment === "relance" ? "all" : "relance")}
              dot="bg-primary"
              highlight
            />
            <SegmentCard
              label="90–180 jours"
              hint="Inactives"
              count={segments.inactive}
              active={segment === "inactive"}
              onClick={() => setSegment(segment === "inactive" ? "all" : "inactive")}
              dot="bg-[#FCCA66]"
            />
            <SegmentCard
              label="+180 jours"
              hint="Dormantes"
              count={segments.dormant}
              active={segment === "dormant"}
              onClick={() => setSegment(segment === "dormant" ? "all" : "dormant")}
              dot="bg-[#BA1A1A]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(
              [
                ["all", `Toutes (${tabCounts.all})`],
                ["ready", `À relancer (${tabCounts.ready})`],
                ["vip", `VIP inactives (${tabCounts.vip})`],
                ["spend", `Gros panier (${tabCounts.spend})`],
                ["first", `1re visite seule (${tabCounts.first})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12px] font-semibold",
                  tab === id ? "bg-[#382D36] text-white" : "bg-[#FCE9F4] text-ink/70 hover:bg-[#F6E3EF]",
                  id === "ready" && tab === id && "bg-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Rechercher par cliente, téléphone, rituel…"
                    className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-10 pr-4 text-[13px] outline-none"
                  />
                </div>
                <Select value={service} onChange={(e) => setService(e.target.value)} className="sm:w-44">
                  <option value="">Tous rituels</option>
                  {services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Select value={staff} onChange={(e) => setStaff(e.target.value)} className="sm:w-44">
                  <option value="">Toutes praticiennes</option>
                  {staffNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                      <th className="rounded-l-lg p-3">Cliente</th>
                      <th className="p-3">Dernière venue</th>
                      <th className="p-3">Rituel</th>
                      <th className="p-3">Total dépensé</th>
                      <th className="p-3">Statut</th>
                      <th className="rounded-r-lg p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-[13px] text-ink/45">
                          Chargement…
                        </td>
                      </tr>
                    ) : paged.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-[13px] text-ink/45">
                          Aucune cliente dans ce filtre. La liste affiche jusqu’à 200 dossiers ; les KPI couvrent tout le vivier.
                        </td>
                      </tr>
                    ) : (
                      paged.map((c) => {
                        const chip = crmChip(c);
                        const vip = statusLabel(c.status);
                        const active = selected?.id === c.id;
                        return (
                          <tr
                            key={c.id}
                            className={cn(
                              "cursor-pointer text-[13px] transition-colors",
                              active ? "bg-[#FCE9F4]" : "hover:bg-[#FFEFF8]",
                            )}
                            onClick={() => setSelectedId(c.id)}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFB2BD] text-[12px] font-bold text-[#400014]">
                                  {initials(c)}
                                </span>
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                                    <span>{fullName(c)}</span>
                                    {vip ? (
                                      <span className="rounded bg-[#382D36] px-1.5 py-0.5 text-[10px] font-bold text-[#FFDEA4]">
                                        {vip}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[12px] text-ink/40">{c.phone || "—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{formatLastVisit(c.lastVisitAt)}</div>
                              <div
                                className={cn(
                                  "text-[11px] font-semibold",
                                  c.daysSinceLastVisit >= 180
                                    ? "text-[#BA1A1A]"
                                    : c.daysSinceLastVisit >= 90
                                      ? "text-primary"
                                      : "text-ink/50",
                                )}
                              >
                                {c.daysSinceLastVisit} jours
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium">{c.lastServiceName ?? "—"}</div>
                              <div className="text-[11px] text-ink/40">{c.lastStaffName ?? "—"}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold">{formatMad(c.totalRevenue)}</div>
                              <div className="text-[11px] text-ink/40">
                                {c.visits} visite{c.visits > 1 ? "s" : ""}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
                                {chip.label}
                              </span>
                            </td>
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-flex items-center gap-1">
                                {canSend && (c.canPrepareWhatsApp || c.pendingWhatsAppTaskId) ? (
                                  <button
                                    type="button"
                                    title="Préparer WhatsApp"
                                    disabled={submitting}
                                    onClick={() => handlePrepareWhatsApp(c)}
                                    className="rounded-lg bg-[#382D36] p-1.5 text-[#FFDEA4]"
                                  >
                                    <MessageCircle size={16} />
                                  </button>
                                ) : null}
                                {canAgenda ? (
                                  <Link
                                    href="/agenda/"
                                    title="Agenda"
                                    className="rounded-lg bg-primary p-1.5 text-white"
                                  >
                                    <CalendarPlus size={16} />
                                  </Link>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-ink/40 hover:bg-[#FCE9F4]"
                                  onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {menuId === c.id ? (
                                  <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-lg bg-white p-1 text-left shadow-lg">
                                    {canCustomers ? (
                                      <Link
                                        href={`/customers/${c.id}/`}
                                        className="block rounded px-3 py-2 text-[12px] hover:bg-[#FFEFF8]"
                                      >
                                        Fiche cliente
                                      </Link>
                                    ) : null}
                                    {canWhatsapp && c.pendingWhatsAppTaskId ? (
                                      <Link
                                        href="/whatsapp/"
                                        className="block rounded px-3 py-2 text-[12px] hover:bg-[#FFEFF8]"
                                      >
                                        File WhatsApp
                                      </Link>
                                    ) : null}
                                    {canSend ? (
                                      <button
                                        type="button"
                                        className="block w-full rounded px-3 py-2 text-left text-[12px] hover:bg-[#FFEFF8]"
                                        onClick={() => {
                                          setMenuId(null);
                                          handleSnooze(c.id);
                                        }}
                                      >
                                        Ignorer 30 j
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-center justify-between gap-2 pt-1 text-[12px] text-ink/45 sm:flex-row">
                <span>
                  Affichage {(pageSafe - 1) * REACTIVATION_PAGE_SIZE + (paged.length ? 1 : 0)} à{" "}
                  {(pageSafe - 1) * REACTIVATION_PAGE_SIZE + paged.length} sur {filtered.length} dans ce filtre
                  {kpis && kpis.inactiveCount > items.length
                    ? ` · ${kpis.inactiveCount} inactives au total`
                    : ""}
                </span>
                <div className="inline-flex rounded-lg bg-[#FFEFF8] p-0.5">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded p-1 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={pageSafe >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="rounded p-1 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            {selected ? (
              <InspectPanel
                customer={selected}
                orgName={user.orgName}
                preview={selectedPreview}
                canSend={canSend}
                canCustomers={canCustomers}
                canAgenda={canAgenda}
                canWhatsapp={canWhatsapp}
                canPromotions={canPromotions}
                submitting={submitting}
                onPrepare={handlePrepareWhatsApp}
                onSnooze={handleSnooze}
                onCopy={copyMessage}
              />
            ) : (
              <div className="rounded-xl bg-white p-6 text-[13px] text-ink/45 shadow-sm">
                Sélectionnez une cliente pour ouvrir sa fiche de relance.
              </div>
            )}
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm xl:col-span-5">
            <div>
              <h3 className="flex items-center gap-2 text-[18px] font-bold">
                <Target size={18} className="text-primary" />
                Tunnel de réactivation
              </h3>
              <p className="mt-1 text-[13px] text-ink/55">
                Comptages CRM réels — pas de scoring inventé.
              </p>
            </div>
            <div className="space-y-2.5">
              {funnel.map((step) => (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium">{step.label}</span>
                    <span className="font-bold">
                      {step.value} · {step.hint}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#FCE9F4]">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, step.width)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="rounded-lg bg-[#FCE9F4] px-3 py-2 text-[12px] text-ink/55">
              {kpis?.pendingCount
                ? `${kpis.pendingCount} message${kpis.pendingCount > 1 ? "s" : ""} encore en file WhatsApp.`
                : "Aucune tâche WhatsApp de relance en attente."}
            </p>
          </div>

          <div className="flex flex-col justify-between space-y-4 rounded-xl bg-white p-6 shadow-sm xl:col-span-4">
            <div>
              <h3 className="text-[18px] font-bold">Campagnes marketing</h3>
              <p className="mt-1 text-[13px] text-ink/55">
                Volumes d’envoi réels — le CA n’est pas ventilé par campagne dans cette liste.
              </p>
            </div>
            {topCampaigns.length === 0 ? (
              <p className="text-[13px] text-ink/45">Aucune campagne enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {topCampaigns.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3">
                    <div>
                      <p className="text-[13px] font-bold">
                        <span className="text-primary">#{i + 1}</span> {c.name}
                      </p>
                      <p className="text-[12px] text-ink/50">
                        {c.sentCount} envoyé{c.sentCount > 1 ? "s" : ""} · {c.audienceCount} ciblée
                        {c.audienceCount > 1 ? "s" : ""} · {CAMPAIGN_STATUS_LABEL[c.status]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {canMarketing ? (
              <Link
                href="/marketing/"
                className="flex h-11 items-center justify-center rounded-lg bg-[#FCE9F4] text-[14px] font-semibold"
              >
                {campaigns.length > 3
                  ? `Voir les ${campaigns.length} campagnes`
                  : "Ouvrir le marketing"}
              </Link>
            ) : null}
          </div>

          <div className="flex flex-col justify-between space-y-4 rounded-xl bg-[#382D36] p-6 text-white shadow-md xl:col-span-3">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFDEA4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#261900]">
                Lecture CRM
              </span>
              <h3 className="text-[18px] font-bold">Priorité du vivier</h3>
              <p className="text-[13px] text-white/70">
                {kpis
                  ? `${kpis.toRelance} cliente${kpis.toRelance > 1 ? "s" : ""} hors pause, potentiel panier moyen ${formatMad(kpis.estimatedRevenue)}. ${kpis.vipInactiveCount} VIP inactive${kpis.vipInactiveCount > 1 ? "s" : ""} · ${kpis.highSpenderCount} gros panier.`
                  : "Chargement…"}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">CA déjà attribué</p>
              <p className="text-[22px] font-extrabold">
                {kpis ? formatMad(kpis.recoveredRevenue) : "—"}
              </p>
              {campaignKpis && campaignKpis.attributedRevenue > 0 ? (
                <p className="text-[12px] text-white/60">
                  Campagnes : {formatMad(campaignKpis.attributedRevenue)}
                </p>
              ) : null}
            </div>
            {canMarketing ? (
              <Link
                href="/marketing/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white"
              >
                Créer une campagne
              </Link>
            ) : null}
          </div>
        </section>
      </div>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Seuils et offres">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-ink/50">Délai minimum entre messages marketing (jours)</span>
            <Input value={minDays} onChange={(e) => setMinDays(e.target.value)} type="number" min={7} max={365} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            Créer automatiquement des tâches WhatsApp (sync quotidien)
          </label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={th30} onChange={(e) => setTh30(e.target.checked)} />
              Seuil 30 j
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={th45} onChange={(e) => setTh45(e.target.checked)} />
              Seuil 45 j
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={th60} onChange={(e) => setTh60(e.target.checked)} />
              Seuil 60 j
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={th90} onChange={(e) => setTh90(e.target.checked)} />
              Seuil 90 j
            </label>
          </div>
          {(
            [
              ["30 j", promo30, setPromo30, disc30, setDisc30],
              ["45 j", promo45, setPromo45, disc45, setDisc45],
              ["60 j", promo60, setPromo60, disc60, setDisc60],
              ["90 j", promo90, setPromo90, disc90, setDisc90],
            ] as const
          ).map(([label, code, setCode, disc, setDisc]) => (
            <div key={label} className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs text-ink/50">Code {label}</span>
                <Input value={code} onChange={(e) => setCode(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-ink/50">Remise {label}</span>
                <Input value={disc} onChange={(e) => setDisc(e.target.value)} />
              </label>
            </div>
          ))}
          {settings ? (
            <p className="text-xs text-ink/40">
              Les codes s’affichent seulement s’ils sont enregistrés ici — aucune offre n’est inventée.
            </p>
          ) : null}
          <Button disabled={submitting || !canConfigure} onClick={handleSaveSettings}>
            Enregistrer
          </Button>
        </div>
      </Drawer>
    </>
  );
}

function InspectPanel({
  customer,
  orgName,
  preview,
  canSend,
  canCustomers,
  canAgenda,
  canWhatsapp,
  canPromotions,
  submitting,
  onPrepare,
  onSnooze,
  onCopy,
}: {
  customer: ReactivationCustomerItem;
  orgName: string;
  preview: { message: string; waLink: string } | null;
  canSend: boolean;
  canCustomers: boolean;
  canAgenda: boolean;
  canWhatsapp: boolean;
  canPromotions: boolean;
  submitting: boolean;
  onPrepare: (c: ReactivationCustomerItem) => void;
  onSnooze: (id: string) => void;
  onCopy: () => void;
}) {
  const vip = statusLabel(customer.status);
  const wa = preview?.waLink || waMeLink(customer.phone, customer.marketingWhatsapp);

  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFB2BD] text-[16px] font-bold text-[#400014]">
            {initials(customer)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[18px] font-bold">{fullName(customer)}</h3>
              {vip ? (
                <span className="rounded-full bg-[#382D36] px-2 py-0.5 text-[11px] font-bold text-[#FFDEA4]">
                  {vip}
                </span>
              ) : null}
            </div>
            <p className="text-[12px] text-ink/55">{customer.phone || "Téléphone non renseigné"}</p>
          </div>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", crmChip(customer).className)}>
          {crmChip(customer).label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#FFEFF8] p-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Absence</p>
          <p className="text-[18px] font-bold text-primary">{customer.daysSinceLastVisit} jours</p>
          <p className="text-[11px] text-ink/50">{formatLastVisit(customer.lastVisitAt)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Valeur totale</p>
          <p className="text-[18px] font-bold">{formatMad(customer.totalRevenue)}</p>
          <p className="text-[11px] text-ink/50">
            {customer.visits} visites · panier {formatMad(customer.averageTicket)}
          </p>
        </div>
      </div>

      <p className="rounded-lg bg-[#FCE9F4] px-3 py-2 text-[13px]">
        {customer.lastServiceName ?? "Dernier rituel inconnu"}
        {customer.lastStaffName ? ` · ${customer.lastStaffName}` : ""}
        {customer.lastServicePrice != null ? ` · ${formatMad(customer.lastServicePrice)}` : ""}
      </p>

      {customer.suggestedPromoCode ? (
        <p className="rounded-xl bg-[#F6E3EF] p-3 text-[13px]">
          Offre configurée : <strong>{customer.suggestedPromoDiscount}</strong> — code{" "}
          <strong>{customer.suggestedPromoCode}</strong>
        </p>
      ) : (
        <p className="text-[12px] text-ink/45">Aucune offre enregistrée pour ce seuil.</p>
      )}

      {customer.blockReason ? <p className="text-[12px] text-ink/45">{customer.blockReason}</p> : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Message WhatsApp</p>
          {preview ? (
            <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              <Copy size={12} />
              Copier
            </button>
          ) : null}
        </div>
        {preview ? (
          <p className="relative rounded-xl bg-[#FFEFF8] p-3 text-[13px] leading-relaxed">{preview.message}</p>
        ) : (
          <p className="text-[12px] text-ink/45">
            Préparez le message pour afficher le texte issu du modèle réel — rien n’est rédigé à la main ici.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {canSend ? (
            <button
              type="button"
              disabled={submitting || (!customer.canPrepareWhatsApp && !customer.pendingWhatsAppTaskId)}
              onClick={() => onPrepare(customer)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#382D36] text-[13px] font-semibold text-[#FFDEA4] disabled:opacity-40"
            >
              <MessageCircle size={16} />
              {customer.pendingWhatsAppTaskId ? "Afficher le message" : "Préparer WhatsApp"}
            </button>
          ) : (
            <span />
          )}
          {canSend ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => onSnooze(customer.id)}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#FCE9F4] text-[13px] font-semibold"
            >
              <Pause size={16} />
              Ignorer 30 j
            </button>
          ) : null}
        </div>
        {wa && customer.marketingWhatsapp ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white"
          >
            Ouvrir WhatsApp
          </a>
        ) : (
          <p className="text-[12px] text-ink/45">
            WhatsApp indisponible : numéro ou opt-in marketing manquant.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[12px] font-bold">
          <CalendarPlus size={16} className="text-primary" />
          Prendre rendez-vous
        </p>
        <p className="text-[12px] text-ink/45">
          Aucun créneau n’est inventé ici. Ouvrez l’agenda pour proposer une vraie disponibilité.
        </p>
        <div className="flex flex-wrap gap-2">
          {canAgenda ? (
            <Link
              href="/agenda/"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white"
            >
              Ouvrir l’agenda
            </Link>
          ) : null}
          {canCustomers ? (
            <Link
              href={`/customers/${customer.id}/`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#FCE9F4] px-4 text-[13px] font-semibold"
            >
              Fiche cliente
            </Link>
          ) : null}
          {canWhatsapp && customer.pendingWhatsAppTaskId ? (
            <Link
              href="/whatsapp/"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#FCE9F4] px-4 text-[13px] font-semibold"
            >
              File WhatsApp
            </Link>
          ) : null}
          {canPromotions && customer.suggestedPromoCode ? (
            <Link
              href={`/promotions/?suggestCode=${encodeURIComponent(customer.suggestedPromoCode)}&customerId=${customer.id}`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#FCE9F4] px-4 text-[13px] font-semibold"
            >
              Promotion
            </Link>
          ) : null}
        </div>
        <p className="text-[11px] text-ink/35">{orgName}</p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn("flex flex-col justify-between rounded-xl p-4 shadow-sm", accent ? "bg-[#FFEFF8]" : "bg-white")}>
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-3">
        <div className={cn("text-[22px] font-bold leading-7", accent && "text-primary")}>{value}</div>
        <div className="text-[13px] text-ink/50">{hint}</div>
      </div>
    </div>
  );
}

function SegmentCard({
  label,
  hint,
  count,
  active,
  onClick,
  dot,
  highlight,
}: {
  label: string;
  hint: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl p-3 text-left shadow-sm",
        active || highlight ? "bg-[#FFEFF8]" : "bg-white hover:bg-[#FCE9F4]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("h-3 w-3 rounded-full", dot)} />
        <div>
          <div className={cn("text-[14px] font-semibold", (active || highlight) && "text-primary")}>{label}</div>
          <div className="text-[12px] text-ink/50">{hint}</div>
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[12px] font-bold",
          active || highlight ? "bg-primary text-white" : "bg-[#FCE9F4]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function pctOf(part: number, total: number) {
  if (!total) return "—";
  return `${Math.round((part / total) * 1000) / 10} %`;
}

