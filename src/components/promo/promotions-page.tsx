"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BadgePercent,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Gift,
  Lock,
  MapPin,
  MessageCircle,
  MoreVertical,
  Percent,
  Plus,
  Receipt,
  Search,
  Shield,
  SlidersHorizontal,
  Store,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type PromoStatusFilter,
  type PromoTab,
  type PromoTargetFilter,
  type PromoTypeFilter,
  PROMO_PAGE_SIZE,
  WEEKDAY_OPTIONS,
  deltaPct,
  discountLabel,
  displayStatus,
  effortRate,
  fillRatio,
  filterPromotions,
  ganttOffset,
  ganttWeeks,
  insightCopy,
  kpiHints as buildKpiHints,
  monthTitle,
  overallConversion,
  perimeterLabel,
  promoShortId,
  promoWhatsappHref,
  promoWhatsappText,
  serializeWeekdays,
  simulatePromo,
  statusChip,
  tabCounts,
  toApiDate,
  validityLabel,
} from "@/components/promo/promo-helpers";
import { PromotionsMobile } from "@/components/promo/promotions-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWritePromotions } from "@/lib/rbac";
import { cn, formatMad } from "@/lib/utils";
import { listCustomers } from "@/modules/customers/service";
import { createPromotion, listPromotions, setPromotionStatus } from "@/modules/promo/service";
import { listServices } from "@/modules/services/service";
import type { CustomerListItem } from "@/types/customer";
import type { PromotionKpis, PromotionListItem, PromotionType } from "@/types/promo";
import { PROMOTION_TYPE_LABEL, PROMOTION_TYPES } from "@/types/promo";
import type { ServiceListItem } from "@/types/service";

export function PromotionsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const searchParams = useSearchParams();
  const canWrite = canWritePromotions(user.role);
  const canPos = canAccessNav(user.role, "pos");
  const canAgenda = canAccessNav(user.role, "agenda");
  const canWhatsapp = canAccessNav(user.role, "whatsapp");
  const canReactivation = canAccessNav(user.role, "reactivation");

  const [loading, setLoading] = useState(true);
  const [rowsRaw, setRowsRaw] = useState<PromotionListItem[]>([]);
  const [kpis, setKpis] = useState<PromotionKpis | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [services, setServices] = useState<ServiceListItem[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PromoTab>("all");
  const [statusFilter, setStatusFilter] = useState<PromoStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<PromoTypeFilter>("all");
  const [targetFilter, setTargetFilter] = useState<PromoTargetFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<PromotionType>("PERCENTAGE");
  const [value, setValue] = useState("15");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [maxPerCustomer, setMaxPerCustomer] = useState("1");
  const [serviceId, setServiceId] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await listPromotions({ limit: 100 });
      setRowsRaw(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les promotions.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listCustomers({ page: 1, limit: 80 })
      .then((r) => setCustomers(r.data))
      .catch(() => undefined);
    listServices({ page: 1, limit: 100, active: true })
      .then((r) => setServices(r.data))
      .catch(() => undefined);
  }, []);

  const suggestConsumed = useRef(false);

  useEffect(() => {
    if (suggestConsumed.current) return;
    const suggested = searchParams.get("suggestCode");
    if (!suggested || !canWrite) return;
    suggestConsumed.current = true;
    setCode(suggested.toUpperCase());
    setName(`Offre ${suggested.toUpperCase()}`);
    setAddOpen(true);
  }, [searchParams, canWrite]);

  const filtered = useMemo(
    () =>
      filterPromotions(rowsRaw, {
        tab,
        search,
        status: statusFilter,
        type: typeFilter,
        target: targetFilter,
      }),
    [rowsRaw, tab, search, statusFilter, typeFilter, targetFilter],
  );

  useEffect(() => {
    setPage(1);
  }, [tab, search, statusFilter, typeFilter, targetFilter]);

  useEffect(() => {
    if (selectedId && !filtered.some((p) => p.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    } else if (!selectedId && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const counts = useMemo(() => tabCounts(rowsRaw), [rowsRaw]);
  const insight = useMemo(() => insightCopy(kpis, rowsRaw), [kpis, rowsRaw]);
  const hints = useMemo(() => buildKpiHints(kpis), [kpis]);
  const effort = useMemo(() => effortRate(kpis), [kpis]);
  const conversion = useMemo(() => overallConversion(rowsRaw), [rowsRaw]);
  const weeks = useMemo(() => ganttWeeks(), []);
  const ganttItems = useMemo(
    () => rowsRaw.filter((p) => p.status === "ACTIVE" || displayStatus(p) === "scheduled"),
    [rowsRaw],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PROMO_PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PROMO_PAGE_SIZE, pageSafe * PROMO_PAGE_SIZE);
  const selected =
    (selectedId ? rowsRaw.find((p) => p.id === selectedId) : null) ?? pageRows[0] ?? null;

  const serviceNameById = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s.name])),
    [services],
  );

  const simCustomer = useMemo(
    () => customers.find((c) => c.phone) ?? customers[0] ?? null,
    [customers],
  );

  const simLines = useMemo(() => {
    if (!selected) return [];
    if (selected.serviceId) {
      const s = services.find((x) => x.id === selected.serviceId);
      if (s) return [{ name: s.name, price: s.price }];
    }
    return services.slice(0, 2).map((s) => ({ name: s.name, price: s.price }));
  }, [selected, services]);

  const simAmount = useMemo(() => {
    const sum = simLines.reduce((n, l) => n + l.price, 0);
    if (sum > 0) return sum;
    return Math.max(selected?.minAmount ?? 0, 400);
  }, [simLines, selected]);

  const sim = useMemo(
    () =>
      selected
        ? simulatePromo(selected, simAmount, {
            serviceId: selected.serviceId ?? undefined,
            category: selected.category,
          })
        : null,
    [selected, simAmount],
  );

  const waText = useMemo(() => {
    if (!selected) return "";
    return promoWhatsappText(selected, simCustomer?.firstName ?? "Madame", user.orgName);
  }, [selected, simCustomer, user.orgName]);

  const waHref = useMemo(() => {
    if (!simCustomer?.phone || !waText) return null;
    return promoWhatsappHref(simCustomer.phone, waText);
  }, [simCustomer, waText]);

  function resetForm() {
    setName("");
    setCode("");
    setType("PERCENTAGE");
    setValue("15");
    setStartsAt("");
    setEndsAt("");
    setMinAmount("");
    setMaxUses("");
    setMaxPerCustomer("1");
    setServiceId("");
    setWeekdays([]);
    setTimeStart("");
    setTimeEnd("");
    setDescription("");
  }

  function openCreate(prefill?: Partial<{ name: string; code: string; value: string }>) {
    resetForm();
    if (prefill?.name) setName(prefill.name);
    if (prefill?.code) setCode(prefill.code);
    if (prefill?.value) setValue(prefill.value);
    setAddOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const result = await createPromotion({
      name: name.trim(),
      code: code.trim() || undefined,
      type,
      value: Number(value) || undefined,
      startsAt: toApiDate(startsAt),
      endsAt: toApiDate(endsAt),
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
      maxUsesPerCustomer: maxPerCustomer ? Number(maxPerCustomer) : undefined,
      serviceId: serviceId || undefined,
      weekdays: serializeWeekdays(weekdays),
      timeStart: timeStart || undefined,
      timeEnd: timeEnd || undefined,
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setAddOpen(false);
    resetForm();
    toast("Promotion créée.", "success");
    refresh();
  }

  async function handleToggle(p: PromotionListItem) {
    const next = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const r = await setPromotionStatus(p.id, next);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    toast(next === "ACTIVE" ? "Promotion activée." : "Promotion désactivée.", "success");
    refresh();
  }

  function onCopy(text: string, label: string) {
    void navigator.clipboard?.writeText(text);
    toast(label, "success");
  }

  const formProps = {
    name,
    setName,
    code,
    setCode,
    type,
    setType,
    value,
    setValue,
    startsAt,
    setStartsAt,
    endsAt,
    setEndsAt,
    minAmount,
    setMinAmount,
    maxUses,
    setMaxUses,
    maxPerCustomer,
    setMaxPerCustomer,
    serviceId,
    setServiceId,
    weekdays,
    setWeekdays,
    timeStart,
    setTimeStart,
    timeEnd,
    setTimeEnd,
    description,
    setDescription,
    services,
    submitting,
    onCancel: () => setAddOpen(false),
    onSubmit: handleCreate,
  };

  return (
    <>
      <PromotionsMobile
        orgName={user.orgName}
        roleLabel={ROLE_LABEL[user.role]}
        kpis={kpis}
        kpiHints={hints}
        effort={effort}
        conversion={conversion}
        insight={insight}
        search={searchInput}
        onSearch={setSearchInput}
        tab={tab}
        onTab={setTab}
        counts={counts}
        loading={loading}
        rows={filtered}
        selected={selected}
        onSelect={setSelectedId}
        canWrite={canWrite}
        onAdd={() => openCreate()}
        onCalendar={() => setTab("calendar")}
        onRules={() => setRulesOpen(true)}
        onDeploy={() =>
          openCreate({
            name: "Relance inactives −10 %",
            code: "RELANCE10",
            value: "10",
          })
        }
        canPos={canPos}
        canAgenda={canAgenda}
        canWhatsapp={canWhatsapp}
        canReactivation={canReactivation}
        weeks={weeks}
        ganttItems={ganttItems}
        sim={sim}
        simCustomer={simCustomer}
        simLines={simLines}
        waText={waText}
        waHref={waHref}
        onCopy={onCopy}
        onToggleStatus={handleToggle}
      />

      <div className="hidden space-y-5 lg:block">
        <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7B5900] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <Lock size={12} />
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink/70">
                <Shield size={12} className="text-primary" />
                Anti-cumul POS
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEFF8] px-2 py-0.5 text-[11px] font-medium text-[#7B5900]">
                <MapPin size={13} />
                {user.orgName}
              </span>
            </div>
            <h1 className="mt-2 text-[28px] font-bold leading-9 tracking-tight xl:text-[40px] xl:leading-[48px]">
              Promotions & offres commerciales
            </h1>
            <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
              Campagnes, codes et plafonds, calculés au POS — une remise à la fois, jamais de cumul
              automatique.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("calendar")}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
            >
              <CalendarDays size={18} className="text-[#7B5900]" />
              Calendrier des offres
            </button>
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
            >
              <SlidersHorizontal size={18} className="text-ink/40" />
              Règles & anti-cumul
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-[14px] font-semibold text-white shadow-sm"
              >
                <Plus size={18} />
                Nouvelle promotion
              </button>
            ) : null}
          </div>
        </header>

        <section className="relative overflow-hidden rounded-xl bg-[#382D36] p-5 text-[#FEECF7] shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="max-w-4xl space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FCCA66] text-[#261900]">
                  <Bot size={14} />
                </span>
                <span className="text-[14px] font-bold uppercase tracking-wider text-[#FCCA66]">
                  Copilote · performance & conflits
                </span>
                <span className="rounded-full bg-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#FFD9DE]">
                  Données du mois
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-[#F0DDE9]">{insight.headline}</p>
              <p className="text-[13px] text-[#FFDEA4]">{insight.recommendation}</p>
              <p className="inline-flex items-center gap-1 rounded bg-white/10 px-2.5 py-0.5 text-[11px]">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {insight.conflict}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {canWrite ? (
                <button
                  type="button"
                  onClick={() =>
                    openCreate({
                      name: "Relance inactives −10 %",
                      code: "RELANCE10",
                      value: "10",
                    })
                  }
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-white"
                >
                  <Zap size={16} />
                  Préparer une offre
                </button>
              ) : null}
              {canReactivation ? (
                <Link
                  href="/reactivation/"
                  className="inline-flex h-10 items-center gap-1 rounded-lg bg-white/10 px-3 text-[13px] font-semibold hover:bg-white/15"
                >
                  Voir la réactivation
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Promotions actives"
            value={kpis ? String(kpis.activeCount) : "—"}
            hint={`${kpis?.archivedCount ?? 0} archivées · ${kpis?.totalCount ?? 0} au total`}
            icon={<Gift size={18} className="text-primary" />}
          />
          <Kpi
            label="Clientes touchées"
            value={kpis ? String(kpis.customersTouchedMonth) : "—"}
            hint="Usages distincts ce mois"
            icon={<Users size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Passages POS"
            value={kpis ? String(kpis.usedThisMonth) : "—"}
            hint={hints.pos}
            icon={<Receipt size={18} className="text-[#7B5900]" />}
            accent={Boolean(kpis && deltaPct(kpis.usedThisMonth, kpis.usedPrevMonth) != null && (deltaPct(kpis.usedThisMonth, kpis.usedPrevMonth) ?? 0) > 0)}
          />
          <Kpi
            label="CA généré brut"
            value={kpis ? formatMad(kpis.estimatedRevenueMonth) : "—"}
            hint={hints.revenue}
            icon={<Wallet size={18} className="text-primary" />}
          />
          <Kpi
            label="Effort remise"
            value={kpis ? formatMad(kpis.discountTotalMonth) : "—"}
            hint={effort != null ? `Taux ${String(effort).replace(".", ",")} %` : "Remises accordées"}
            icon={<BadgePercent size={18} className="text-ink/40" />}
          />
          <Kpi
            label="Taux d’utilisation"
            value={conversion != null ? `${String(conversion).replace(".", ",")} %` : "—"}
            hint={hints.conversion}
            icon={<Percent size={18} className="text-primary" />}
          />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 rounded-xl bg-[#FFEFF8] p-1">
              {(
                [
                  ["all", "Toutes"],
                  ["codes", "Codes promo"],
                  ["auto", "Offres auto"],
                  ["calendar", `Calendrier ${monthTitle()}`],
                  ["audit", "Historique"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-[14px] font-semibold",
                    tab === id ? "bg-white font-bold text-primary shadow-sm" : "text-ink/55 hover:text-ink",
                  )}
                >
                  {label} ({counts[id]})
                </button>
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-[13px] text-ink/45">
              Isolation institut
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher une promotion, un code, un soin…"
                className="h-10 w-full rounded-lg bg-[#FFEFF8] pl-10 pr-3 text-[13px] outline-none"
              />
            </div>
            <Select
              className="h-10 w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PromoStatusFilter)}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="scheduled">Programmées</option>
              <option value="archived">Archivées</option>
            </Select>
            <Select
              className="h-10 w-44"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PromoTypeFilter)}
            >
              <option value="all">Tous types</option>
              {PROMOTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROMOTION_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
            <Select
              className="h-10 w-44"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value as PromoTargetFilter)}
            >
              <option value="all">Tout le fichier</option>
              <option value="vip">VIP / Gold</option>
              <option value="new">Premier RDV</option>
              <option value="targeted">Cliente ciblée</option>
            </Select>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between bg-[#FFEFF8] px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold">Offres & codes</h2>
                  <span className="rounded-full bg-[#F6E3EF] px-2 py-0.5 text-[11px] font-bold text-primary">
                    {kpis?.activeCount ?? 0} en cours
                  </span>
                </div>
                <span className="text-[12px] text-ink/45">Calcul serveur · snapshots facture</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
                      <th className="px-4 py-3">Promotion & code</th>
                      <th className="px-3 py-3">Cible</th>
                      <th className="px-3 py-3">Validité</th>
                      <th className="px-3 py-3">Usage</th>
                      <th className="px-3 py-3">CA / effort</th>
                      <th className="px-3 py-3">Conv.</th>
                      <th className="px-3 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FCE9F4]">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-ink/45">
                          Chargement…
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-ink/50">
                          Aucune promotion sur ce filtre.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((p) => {
                        const st = statusChip(p);
                        const f = fillRatio(p);
                        const peri = perimeterLabel(p, p.serviceId ? serviceNameById[p.serviceId] : null);
                        const val = validityLabel(p);
                        const selectedRow = selected?.id === p.id;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedId(p.id)}
                            className={cn(
                              "cursor-pointer hover:bg-[#FFEFF8]/70",
                              selectedRow && "bg-[#FFEFF8]/80",
                            )}
                          >
                            <td className="px-4 py-3.5">
                              <p className="font-bold">{p.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {p.code ? (
                                  <span className="rounded bg-[#FFD9DE] px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                                    {p.code}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-ink/40">Sans code</span>
                                )}
                                <span className="text-[10px] uppercase text-ink/40">{discountLabel(p)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3.5">
                              <p className="font-medium">{peri.primary}</p>
                              <p className="text-[11px] text-ink/45">{peri.secondary}</p>
                            </td>
                            <td className="px-3 py-3.5">
                              <p className="font-semibold">{val.primary}</p>
                              <p className="text-[11px] text-ink/45">{val.secondary}</p>
                            </td>
                            <td className="min-w-[110px] px-3 py-3.5">
                              {f.max != null ? (
                                <>
                                  <div className="mb-1 flex justify-between text-[11px]">
                                    <span className="font-bold">
                                      {f.used} / {f.max}
                                    </span>
                                    <span className="text-ink/40">{f.pct} %</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-[#F6E3EF]">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${f.pct}%` }} />
                                  </div>
                                </>
                              ) : (
                                <span className="text-[12px] text-ink/55">{p.usageCount} · ∞</span>
                              )}
                            </td>
                            <td className="px-3 py-3.5">
                              <p className="font-bold">
                                {p.monthRevenue > 0 ? formatMad(p.monthRevenue) : "—"}
                              </p>
                              <p className="text-[11px] text-ink/40">
                                Remise {p.monthDiscount > 0 ? formatMad(p.monthDiscount) : "—"}
                              </p>
                            </td>
                            <td className="px-3 py-3.5 font-bold text-primary">
                              {f.pct != null ? `${f.pct} %` : "—"}
                            </td>
                            <td className="px-3 py-3.5">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", st.className)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", displayStatus(p) === "active" ? "bg-emerald-600" : "bg-current")} />
                                {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="relative flex items-center justify-end gap-0.5">
                                <button
                                  type="button"
                                  title="Détail"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(p.id);
                                  }}
                                  className="rounded p-1 text-ink/40 hover:bg-[#FFEFF8] hover:text-primary"
                                >
                                  <Eye size={18} />
                                </button>
                                {p.code ? (
                                  <button
                                    type="button"
                                    title="Copier le code"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCopy(p.code!, "Code copié");
                                    }}
                                    className="rounded p-1 text-ink/40 hover:bg-[#FFEFF8] hover:text-primary"
                                  >
                                    <Copy size={18} />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  title="Plus"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuId(menuId === p.id ? null : p.id);
                                  }}
                                  className="rounded p-1 text-ink/35 hover:bg-[#FFEFF8]"
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {menuId === p.id ? (
                                  <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg bg-white p-1 text-left shadow-lg">
                                    {canWrite ? (
                                      <button
                                        type="button"
                                        className="block w-full rounded px-3 py-1.5 text-[12px] hover:bg-[#FFEFF8]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMenuId(null);
                                          void handleToggle(p);
                                        }}
                                      >
                                        {p.status === "ACTIVE" ? "Désactiver" : "Activer"}
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
              <div className="flex flex-col items-center justify-between gap-2 px-4 py-3 text-[13px] text-ink/50 sm:flex-row">
                <span>
                  Affichage {pageRows.length ? (pageSafe - 1) * PROMO_PAGE_SIZE + 1 : 0}–
                  {(pageSafe - 1) * PROMO_PAGE_SIZE + pageRows.length} sur {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded bg-[#FFEFF8] p-1 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 font-semibold text-ink">
                    {pageSafe} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pageSafe >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded bg-[#FFEFF8] p-1 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={20} className="text-primary" />
                  <h3 className="text-[18px] font-bold">Chevauchement calendaire</h3>
                </div>
                <span className="text-[12px] text-ink/45">{monthTitle()}</span>
              </div>
              <div className="grid grid-cols-6 gap-1 text-center text-[11px] text-ink/40">
                {weeks.map((w) => (
                  <div key={w.label} className={w.current ? "font-bold text-primary" : ""}>
                    {w.label}
                  </div>
                ))}
              </div>
              {ganttItems.length === 0 ? (
                <p className="text-[13px] text-ink/45">Aucune offre active ou programmée à tracer.</p>
              ) : (
                ganttItems.slice(0, 6).map((p) => {
                  const pos = ganttOffset(p, weeks);
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-[11px]">
                      <span className="w-24 truncate text-right font-semibold">{p.code ?? p.name}</span>
                      <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-[#FFEFF8]">
                        <div
                          className="absolute top-0.5 flex h-5 items-center truncate rounded bg-primary px-2 text-[10px] font-bold text-white"
                          style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                        >
                          {discountLabel(p)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <aside className="space-y-4 xl:col-span-4">
            {selected ? (
              <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
                    Inspection
                  </span>
                  <span className="font-mono text-[11px] text-ink/40">{promoShortId(selected.id)}</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[22px] font-bold">{selected.code ?? selected.name}</h3>
                    <span className="rounded bg-[#FFD9DE] px-2 py-0.5 text-[11px] font-bold text-primary">
                      {discountLabel(selected)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink/55">
                    {selected.description || selected.name}
                  </p>
                </div>
                <div className="space-y-1.5 rounded-lg bg-[#FFEFF8] p-3 text-[12px]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Règles</p>
                  <p>Panier min. : <strong>{selected.minAmount != null ? formatMad(selected.minAmount) : "aucun"}</strong></p>
                  <p>
                    Usage :{" "}
                    <strong>
                      {selected.maxUsesPerCustomer != null
                        ? `${selected.maxUsesPerCustomer}× / cliente`
                        : "sans plafond / cliente"}
                    </strong>
                  </p>
                  <p>Créneaux : <strong>{validityLabel(selected).secondary}</strong></p>
                  <p className="text-primary">Non cumulable avec un autre code au POS</p>
                </div>
                {sim ? (
                  <div className="space-y-2 rounded-xl bg-[#FCE9F4] p-3">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1 text-[14px] font-bold text-primary">
                        <Receipt size={18} />
                        Simulation ticket
                      </p>
                      <span className="rounded bg-[#FFDEA4]/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#5D4200]">
                        Test
                      </span>
                    </div>
                    {simCustomer ? (
                      <p className="text-[12px] text-ink/55">
                        Cliente :{" "}
                        <strong className="text-ink">
                          {simCustomer.firstName} {simCustomer.lastName}
                        </strong>
                      </p>
                    ) : null}
                    {simLines.map((l) => (
                      <div key={l.name} className="flex justify-between text-[12px]">
                        <span>{l.name}</span>
                        <span className="font-mono">{formatMad(l.price)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[11px] text-ink/40">
                      <span>Sous-total</span>
                      <span className="font-mono">{formatMad(sim.subtotal)}</span>
                    </div>
                    <div className="flex justify-between rounded bg-[#FFD9DE]/50 px-1.5 py-1 font-semibold text-primary">
                      <span>Remise {selected.code ? `[ ${selected.code} ]` : ""}</span>
                      <span className="font-mono">-{formatMad(sim.discount)}</span>
                    </div>
                    <div className="flex justify-between text-[18px] font-bold">
                      <span>Net</span>
                      <span className="font-mono text-primary">{formatMad(sim.net)}</span>
                    </div>
                    <ul className="space-y-0.5 text-[11px]">
                      {sim.checks.map((c) => (
                        <li key={c.label} className={c.ok ? "text-emerald-700" : "text-amber-800"}>
                          {c.ok ? "✓" : "!"} {c.label}
                        </li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-2 gap-2">
                      {canPos ? (
                        <Link
                          href="/pos/"
                          className="flex h-9 items-center justify-center gap-1 rounded-lg bg-white text-[11px] font-semibold shadow-sm"
                        >
                          <Store size={14} className="text-primary" />
                          Tester POS
                        </Link>
                      ) : (
                        <span className="flex h-9 items-center justify-center rounded-lg bg-white/50 text-[11px] text-ink/35">
                          POS
                        </span>
                      )}
                      {canAgenda ? (
                        <Link
                          href="/agenda/"
                          className="flex h-9 items-center justify-center gap-1 rounded-lg bg-white text-[11px] font-semibold shadow-sm"
                        >
                          <CalendarDays size={14} className="text-[#7B5900]" />
                          Agenda
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-[14px] font-bold">
                    <MessageCircle size={16} className="text-emerald-600" />
                    WhatsApp manuel
                  </p>
                  <p className="rounded-lg bg-[#FFEFF8] p-3 text-[12px] italic leading-relaxed text-ink/70">
                    {waText}
                  </p>
                  <div className="flex gap-2">
                    {canWhatsapp && waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-[12px] font-bold text-white"
                      >
                        Ouvrir WhatsApp
                      </a>
                    ) : (
                      <span className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#F6E3EF] text-[12px] text-ink/40">
                        Téléphone requis
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onCopy(waText, "Texte copié")}
                      className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#FCE9F4] px-3 text-[12px] font-semibold"
                    >
                      <Copy size={14} />
                      Copier
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-5 text-[13px] text-ink/45 shadow-sm">
                Sélectionnez une promotion.
              </div>
            )}
            <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-[14px] font-bold text-[#7B5900]">
                <Shield size={16} />
                Anti-braderie
              </p>
              <p className="text-[13px] leading-relaxed text-ink/55">
                Le POS n’applique qu’un code à la fois. Un plafond d’usages, s’il est défini, coupe
                l’offre dès qu’il est atteint.
              </p>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 rounded-xl bg-[#FFEFF8] p-4 text-[13px] text-ink/50 md:flex-row">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-[#7B5900]" />
            <span>
              Isolation par institut · totaux issus des usages POS et factures ·{" "}
              <strong className="text-ink">CNDP 09-08</strong>
            </span>
          </div>
          {insight.best ? (
            <span className="text-[12px]">
              Offre phare : {insight.best.code ?? insight.best.name}
            </span>
          ) : null}
        </footer>
      </div>

      {addOpen && isDesktop ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-[22px] font-semibold">Nouvelle promotion</h3>
                <p className="text-[13px] text-ink/50">Liaison POS — une remise à la fois.</p>
              </div>
              <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg p-2 text-ink/40 hover:bg-[#FFEFF8]">
                <X size={20} />
              </button>
            </div>
            <PromoForm {...formProps} />
          </div>
        </div>
      ) : null}

      <Drawer
        open={addOpen && !isDesktop}
        onClose={() => setAddOpen(false)}
        title="Nouvelle promotion"
        side="bottom"
      >
        <div className="p-4">
          <PromoForm {...formProps} />
        </div>
      </Drawer>

      <Drawer open={rulesOpen} onClose={() => setRulesOpen(false)} title="Règles & anti-cumul">
        <div className="space-y-4 overflow-y-auto p-5 text-[14px] leading-relaxed text-ink/70">
          <p>
            Le moteur POS n’applique <strong>qu’une promotion à la fois</strong>. Il n’y a pas de
            cumul code + VIP + staff.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Plafond global d’usages : l’offre s’arrête toute seule.</li>
            <li>Plafond par cliente contrôlé à l’encaissement.</li>
            <li>Jours / horaires : exclus si hors fenêtre.</li>
            <li>WhatsApp : message préparé, envoi manuel (opt-in).</li>
          </ul>
          <p className="text-[12px] text-ink/45">
            Les KPI viennent des usages et du CA des tickets, pas d’une projection marketing.
          </p>
        </div>
      </Drawer>
    </>
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
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8]">{icon}</span>
      </div>
      <div className="pt-2">
        <div className="text-[22px] font-bold">{value}</div>
        <div className={cn("pt-1 text-[12px]", accent ? "font-semibold text-emerald-700" : "text-ink/45")}>
          {hint}
        </div>
      </div>
    </div>
  );
}

function PromoForm({
  name,
  setName,
  code,
  setCode,
  type,
  setType,
  value,
  setValue,
  startsAt,
  setStartsAt,
  endsAt,
  setEndsAt,
  minAmount,
  setMinAmount,
  maxUses,
  setMaxUses,
  maxPerCustomer,
  setMaxPerCustomer,
  serviceId,
  setServiceId,
  weekdays,
  setWeekdays,
  timeStart,
  setTimeStart,
  timeEnd,
  setTimeEnd,
  description,
  setDescription,
  services,
  submitting,
  onCancel,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  type: PromotionType;
  setType: (v: PromotionType) => void;
  value: string;
  setValue: (v: string) => void;
  startsAt: string;
  setStartsAt: (v: string) => void;
  endsAt: string;
  setEndsAt: (v: string) => void;
  minAmount: string;
  setMinAmount: (v: string) => void;
  maxUses: string;
  setMaxUses: (v: string) => void;
  maxPerCustomer: string;
  setMaxPerCustomer: (v: string) => void;
  serviceId: string;
  setServiceId: (v: string) => void;
  weekdays: number[];
  setWeekdays: (v: number[]) => void;
  timeStart: string;
  setTimeStart: (v: string) => void;
  timeEnd: string;
  setTimeEnd: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  services: ServiceListItem[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Nom</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex. Rentrée & éclat" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Code</span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="RENTREE20"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Type</span>
          <Select value={type} onChange={(e) => setType(e.target.value as PromotionType)}>
            {PROMOTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROMOTION_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">
            Valeur ({type === "PERCENTAGE" ? "%" : "MAD"})
          </span>
          <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Prestation (optionnel)</span>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Toutes / catégorie libre</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Début</span>
          <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Fin</span>
          <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider">Jours (vide = tous)</p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_OPTIONS.map((d) => {
            const on = weekdays.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setWeekdays(on ? weekdays.filter((x) => x !== d.id) : [...weekdays, d.id])}
                className={cn(
                  "rounded-lg px-3 py-2 text-[14px] font-semibold",
                  on ? "bg-primary text-white" : "bg-[#FFEFF8] text-ink",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Heure min</span>
          <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Heure max</span>
          <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Panier min. MAD</span>
          <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Plafond usages</span>
          <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Par cliente</span>
          <Input type="number" value={maxPerCustomer} onChange={(e) => setMaxPerCustomer(e.target.value)} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Description</span>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-12 rounded-lg bg-[#FFEFF8] px-4 text-[14px] font-semibold">
          Annuler
        </button>
        <Button type="submit" variant="brand" disabled={submitting || !name.trim()} className="h-12 rounded-lg">
          {submitting ? "…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
