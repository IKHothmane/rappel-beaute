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
  Gift,
  MoreVertical,
  Percent,
  Plus,
  Receipt,
  Search,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import {
  type PromoStatusFilter,
  type PromoTab,
  type PromoTargetFilter,
  type PromoTypeFilter,
  PROMO_PAGE_SIZE,
  deltaPct,
  discountLabel,
  displayStatus,
  effortRate,
  fillRatio,
  filterPromotions,
  insightCopy,
  kpiHints as buildKpiHints,
  overallConversion,
  perimeterLabel,
  promoShortId,
  simulatePromo,
  statusChip,
  tabCounts,
  validityLabel,
} from "@/components/promo/promo-helpers";
import { PromotionsMobile } from "@/components/promo/promotions-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<PromotionType>("PERCENTAGE");
  const [value, setValue] = useState("15");
  const [usageOnce, setUsageOnce] = useState(true);
  const [serviceId, setServiceId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  function resetForm() {
    setName("");
    setCode("");
    setType("PERCENTAGE");
    setValue("15");
    setUsageOnce(true);
    setServiceId("");
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
      maxUsesPerCustomer: usageOnce ? 1 : undefined,
      serviceId: serviceId || undefined,
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
    usageOnce,
    setUsageOnce,
    serviceId,
    setServiceId,
    services,
    submitting,
    onCancel: () => setAddOpen(false),
    onSubmit: handleCreate,
  };

  return (
    <>
      <PromotionsMobile
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
        onDeploy={() =>
          openCreate({
            name: "Relance inactives −10 %",
            code: "RELANCE10",
            value: "10",
          })
        }
        canPos={canPos}
        canAgenda={canAgenda}
        sim={sim}
        simCustomer={simCustomer}
        simLines={simLines}
        onCopy={onCopy}
        onToggleStatus={handleToggle}
      />

      <div className="hidden space-y-6 lg:block">
        <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#54112F] via-[#831D4A] to-[#B83E72] px-7 py-9 text-white shadow-lg xl:px-10 xl:py-11">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[50px] border-white/5" />
          <div className="pointer-events-none absolute bottom-[-100px] right-1/4 h-64 w-64 rounded-full bg-pink-300/10 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <BadgePercent size={14} />
                Espace marketing & fidélisation
              </div>

              <h1 className="text-3xl font-bold tracking-tight xl:text-4xl">Promotions & offres</h1>

              <p className="mt-3 text-sm leading-7 text-pink-100">
                Créez des offres attractives, fidélisez vos clientes et suivez les performances de vos
                campagnes commerciales.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => openCreate()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#831D4A] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Plus size={17} />
                    Nouvelle promotion
                  </button>
                )}

                {canWrite && (
                  <button
                    type="button"
                    onClick={() =>
                      openCreate({
                        name: "Relance inactives −10 %",
                        code: "RELANCE10",
                        value: "10",
                      })
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    <Zap size={17} />
                    Préparer une offre
                  </button>
                )}
              </div>
            </div>

            <div className="flex min-w-[190px] flex-col items-center rounded-3xl border border-white/20 bg-white/10 px-8 py-6 backdrop-blur-sm">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Gift size={29} className="text-pink-100" />
              </div>
              <span className="text-4xl font-extrabold">{kpis?.activeCount ?? "—"}</span>
              <span className="mt-1 text-xs font-medium text-pink-100">Promotions actives</span>
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[24px] border border-[#EAD5DF] bg-gradient-to-r from-[#FFF4F8] via-white to-[#FFF8FB] p-6 text-[#382633] shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="max-w-4xl space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FCE9F4] text-[#831D4A]">
                  <Bot size={14} />
                </span>
                <span className="text-[14px] font-bold uppercase tracking-wider text-[#831D4A]">
                  Copilote · performance & conflits
                </span>
                <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#981C52]">
                  Données du mois
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-[#382633]">{insight.headline}</p>
              <p className="text-[13px] text-[#765E6B]">{insight.recommendation}</p>
              <p className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-0.5 text-[11px] text-[#765E6B]">
                <CheckCircle2 size={13} className="text-emerald-600" />
                {insight.conflict}
              </p>
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
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[#F1E8EC] bg-white p-2 shadow-sm">
              {(
                [
                  ["all", "Toutes"],
                  ["codes", "Codes promo"],
                  ["auto", "Offres auto"],
                  ["audit", "Historique"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200",
                    tab === id
                      ? "bg-[#981C52] text-white shadow-sm"
                      : "text-[#765E6B] hover:bg-[#FAF0F5]",
                  )}
                >
                  {label} ({counts[id]})
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#F1E8EC] bg-white p-3 shadow-sm">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher une promotion, un code, un soin…"
                className="h-11 w-full rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] pl-10 pr-4 text-[13px] outline-none transition focus:border-[#C95483] focus:ring-2 focus:ring-pink-100"
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
            <div className="overflow-hidden rounded-[26px] border border-[#F0E7EB] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F4EDF0] bg-[#FFFCFD] px-5 py-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold text-[#30202C]">Offres & codes</h2>
                  <span className="rounded-full bg-[#FCE9F4] px-2.5 py-0.5 text-[11px] font-bold text-[#981C52]">
                    {kpis?.activeCount ?? 0} en cours
                  </span>
                </div>
                <span className="text-[12px] text-[#765E6B]">Calcul serveur · snapshots facture</span>
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
                  <tbody className="divide-y divide-[#F4EDF0]">
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
                              "cursor-pointer transition-colors hover:bg-[#FFF7FB]",
                              selectedRow && "bg-[#FFF4F8]",
                            )}
                          >
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-[#30202C]">{p.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {p.code ? (
                                  <span className="rounded-lg bg-[#FCE9F4] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#981C52]">
                                    {p.code}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#765E6B]">Sans code</span>
                                )}
                                <span className="text-[10px] uppercase text-[#765E6B]">{discountLabel(p)}</span>
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
                                {p.code ? (
                                  <button
                                    type="button"
                                    title="Copier le code"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCopy(p.code!, "Code copié");
                                    }}
                                    className="rounded-lg p-1 text-[#765E6B] hover:bg-[#FAF0F5] hover:text-[#981C52]"
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
                                  className="rounded-lg p-1 text-[#765E6B] hover:bg-[#FAF0F5]"
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {menuId === p.id ? (
                                  <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg bg-white p-1 text-left shadow-lg">
                                    {canWrite ? (
                                      <button
                                        type="button"
                                        className="block w-full rounded-lg px-3 py-1.5 text-[12px] hover:bg-[#FAF0F5]"
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
                    className="rounded-lg bg-[#FAF4F7] p-1 text-[#831D4A] disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 font-semibold text-[#30202C]">
                    {pageSafe} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pageSafe >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg bg-[#FAF4F7] p-1 text-[#831D4A] disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 xl:col-span-4">
            {selected ? (
              <div className="space-y-4 rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#981C52]">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-[#981C52]" />
                    Inspection
                  </span>
                  <span className="font-mono text-[11px] text-[#765E6B]">{promoShortId(selected.id)}</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[22px] font-bold text-[#30202C]">{selected.code ?? selected.name}</h3>
                    <span className="rounded-lg bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-bold text-[#981C52]">
                      {discountLabel(selected)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#765E6B]">{selected.name}</p>
                </div>
                <div className="space-y-1.5 rounded-2xl border border-[#F1E8EC] bg-[#FFFCFD] p-3 text-[12px]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#765E6B]">Règles</p>
                  <p>
                    Usage :{" "}
                    <strong>
                      {selected.maxUsesPerCustomer === 1 ? "Une seule fois" : "Plusieurs fois"}
                    </strong>
                  </p>
                </div>
                {sim ? (
                  <div className="space-y-2 rounded-2xl border border-[#F1E8EC] bg-[#FFF7FB] p-4">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1 text-[14px] font-bold text-[#981C52]">
                        <Receipt size={18} />
                        Simulation ticket
                      </p>
                      <span className="rounded-lg bg-[#FCE9F4] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#831D4A]">
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
              </div>
            ) : (
              <div className="rounded-[26px] border border-[#F0E7EB] bg-white p-5 text-[13px] text-[#765E6B] shadow-sm">
                Sélectionnez une promotion.
              </div>
            )}
          </aside>
        </div>
      </div>

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Nouvelle promotion"
        side="right"
        className="max-w-xl"
      >
        <div className="overflow-y-auto bg-[#FFFCFD] p-5">
          <p className="mb-4 text-[13px] text-[#765E6B]">Liaison POS — une remise à la fois.</p>
          <PromoForm {...formProps} />
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
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-[#F1E8EC] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E7B9CD] hover:shadow-lg">
      <div className="flex items-center justify-between text-[#765E6B]">
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FAF4F7] text-[#981C52]">
          {icon}
        </span>
      </div>
      <div className="pt-2">
        <div className="text-[22px] font-bold text-[#30202C]">{value}</div>
        <div
          className={cn(
            "pt-1 text-[12px]",
            accent ? "font-semibold text-emerald-700" : "text-[#765E6B]",
          )}
        >
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
  usageOnce,
  setUsageOnce,
  serviceId,
  setServiceId,
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
  usageOnce: boolean;
  setUsageOnce: (v: boolean) => void;
  serviceId: string;
  setServiceId: (v: string) => void;
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
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider">Utilisation</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setUsageOnce(true)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-200",
              usageOnce ? "bg-[#981C52] text-white shadow-sm" : "bg-[#FAF4F7] text-[#765E6B] hover:bg-[#F4E5EC]",
            )}
          >
            Une seule fois
          </button>
          <button
            type="button"
            onClick={() => setUsageOnce(false)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-200",
              !usageOnce ? "bg-[#981C52] text-white shadow-sm" : "bg-[#FAF4F7] text-[#765E6B] hover:bg-[#F4E5EC]",
            )}
          >
            Plusieurs fois
          </button>
        </div>
        <p className="mt-1.5 text-[12px] text-[#765E6B]">
          {usageOnce
            ? "Chaque cliente ne peut l’utiliser qu’une fois."
            : "Chaque cliente peut l’utiliser plusieurs fois."}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-xl border border-[#EADDE4] bg-white px-4 text-[14px] font-semibold text-[#69515E] transition hover:bg-[#FAF0F5]"
        >
          Annuler
        </button>
        <Button
          type="submit"
          variant="brand"
          disabled={submitting || !name.trim()}
          className="h-12 rounded-xl bg-[#981C52] hover:bg-[#78133E]"
        >
          {submitting ? "…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
