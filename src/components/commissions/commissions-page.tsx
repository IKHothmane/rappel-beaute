"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Download,
  FileSpreadsheet,
  Lock,
  Percent,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type CommissionTab,
  type StaffRow,
  buildStaffRows,
  commissionInsight,
  commissionShortId,
  evolutionPct,
  filterStaffRows,
  formatCommissionDate,
  formatCommissionTime,
  lineCommissionLabel,
  periodPresetLabel,
  rateTiers,
  staffStatusChip,
  ticketRef,
  unpaidIds,
} from "@/components/commissions/commission-helpers";
import { CommissionsMobile } from "@/components/commissions/commissions-mobile";
import { staffInitials } from "@/components/staff/staff-helpers";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canCloseCommissionPeriod, canExportCommissions, canWriteCommissions } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  adjustCommission,
  closeCommissionPeriod,
  downloadCommissionsExport,
  formatMad,
  listCommissions,
  markCommissionsPaidBulk,
} from "@/modules/commissions/service";
import { listStaff } from "@/modules/staff/service";
import type {
  CommissionKpis,
  CommissionListItem,
  CommissionPeriodPreset,
} from "@/types/commission";

export function CommissionsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCommissions(user.role);
  const canClose = canCloseCommissionPeriod(user.role);
  const canExport = canExportCommissions(user.role);
  const canStaff = canAccessNav(user.role, "staff");
  const canServices = canAccessNav(user.role, "services");
  const isStaffLimited = user.role === "STAFF";

  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<CommissionPeriodPreset>("month");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [staffId, setStaffId] = useState("");
  const [tab, setTab] = useState<CommissionTab>("overview");
  const [rowsRaw, setRowsRaw] = useState<CommissionListItem[]>([]);
  const [kpis, setKpis] = useState<CommissionKpis | null>(null);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);
  const [periodMeta, setPeriodMeta] = useState<{
    year: number;
    month: number;
    status: string;
  } | null>(null);
  const [staffOpts, setStaffOpts] = useState<{ id: string; name: string; position: string | null }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjustItem, setAdjustItem] = useState<CommissionListItem | null>(null);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [payTarget, setPayTarget] = useState<{ label: string; ids: string[]; amount: number } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const [res, prev] = await Promise.all([
        listCommissions({
          preset,
          staffId: staffId || undefined,
          search: search || undefined,
          limit: 200,
        }),
        preset === "month"
          ? listCommissions({ preset: "prev_month", limit: 1 }).catch(() => null)
          : Promise.resolve(null),
      ]);
      setRowsRaw(res.data);
      setKpis(res.kpis);
      setPeriodMeta({
        year: res.period.year,
        month: res.period.month,
        status: res.period.status,
      });
      setPrevTotal(prev?.kpis.commissionTotal ?? null);
    } catch {
      toast("Impossible de charger les commissions.", "error");
    }
  }, [preset, staffId, search, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (isStaffLimited) return;
    listStaff({ limit: 100, status: "ACTIVE" })
      .then((r) =>
        setStaffOpts(
          r.data.map((s) => ({
            id: s.id,
            name: s.displayName ?? `${s.firstName} ${s.lastName}`,
            position: s.position,
          })),
        ),
      )
      .catch(() => undefined);
  }, [isStaffLimited]);

  useEffect(() => {
    setSelectedId(null);
  }, [preset, staffId, search, tab]);

  const positions = useMemo(
    () => Object.fromEntries(staffOpts.map((s) => [s.id, s.position])),
    [staffOpts],
  );
  const allRows = useMemo(
    () => buildStaffRows(kpis?.byStaff ?? [], rowsRaw, positions),
    [kpis, rowsRaw, positions],
  );
  const filtered = useMemo(
    () => filterStaffRows(allRows, tab, "", search),
    [allRows, tab, search],
  );
  const selected =
    (selectedId ? filtered.find((r) => r.staffId === selectedId) : undefined) ??
    filtered[0] ??
    null;

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.staffId);
  }, [selected, selectedId]);

  const evolution = evolutionPct(kpis?.commissionTotal ?? 0, prevTotal);
  const insight = useMemo(
    () => commissionInsight(allRows, kpis, prevTotal),
    [allRows, kpis, prevTotal],
  );
  const periodClosed = periodMeta?.status === "CLOSED";
  const periodLabel = periodPresetLabel(preset, periodMeta?.year, periodMeta?.month);
  const unpaidAmount = kpis?.unpaidTotal ?? 0;
  const unpaidStaffCount = allRows.filter((r) => r.unpaidTotal > 0.009).length;
  const avgPerStaff =
    (kpis?.byStaff.length ?? 0) > 0
      ? Math.round(((kpis?.commissionTotal ?? 0) / (kpis?.byStaff.length ?? 1)) * 100) / 100
      : 0;
  const tiers = rateTiers(rowsRaw);
  const bulkIds = unpaidIds(allRows);

  function openPayStaff(row: StaffRow) {
    const ids = row.items.filter((i) => !i.paid).map((i) => i.id);
    if (!ids.length) {
      toast("Rien à régler pour cette collaboratrice.", "error");
      return;
    }
    setPayTarget({
      label: `${row.staffName} · ${formatMad(row.unpaidTotal)}`,
      ids,
      amount: row.unpaidTotal,
    });
  }

  function openPayBulk() {
    if (!bulkIds.length) {
      toast("Aucune commission en attente.", "error");
      return;
    }
    setPayTarget({
      label: `${unpaidStaffCount} collaboratrice${unpaidStaffCount > 1 ? "s" : ""} · ${formatMad(unpaidAmount)}`,
      ids: bulkIds,
      amount: unpaidAmount,
    });
  }

  async function handlePay() {
    if (!payTarget) return;
    setSubmitting(true);
    const result = await markCommissionsPaidBulk(payTarget.ids);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setPayTarget(null);
    toast(`${result.updated} commission${result.updated > 1 ? "s" : ""} marquée${result.updated > 1 ? "s" : ""} payée${result.updated > 1 ? "s" : ""}.`, "success");
    refresh();
  }

  async function handleAdjust() {
    if (!adjustItem) return;
    setSubmitting(true);
    const result = await adjustCommission(adjustItem.id, {
      amount: Number(adjAmount),
      reason: adjReason,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setAdjustItem(null);
    setAdjAmount("");
    setAdjReason("");
    toast("Ajustement enregistré (audit).", "success");
    refresh();
  }

  async function handleClose() {
    if (!periodMeta || !canClose) return;
    setSubmitting(true);
    const result = await closeCommissionPeriod(periodMeta.year, periodMeta.month);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setRulesOpen(false);
    toast("Période clôturée.", "success");
    refresh();
  }

  function exportAudit() {
    downloadCommissionsExport({
      preset,
      staffId,
      format: "excel",
    });
  }

  const tableRows = tab === "goals" ? [...filtered].sort((a, b) => b.baseTotal - a.baseTotal) : filtered;
  const maxBase = Math.max(1, ...tableRows.map((r) => r.baseTotal));

  return (
    <>
      <CommissionsMobile
        orgName={user.orgName}
        roleLabel={ROLE_LABEL[user.role]}
        insight={insight}
        kpis={kpis}
        evolution={evolution}
        search={searchInput}
        onSearch={setSearchInput}
        tab={tab}
        onTab={setTab}
        preset={preset}
        onPreset={setPreset}
        periodYear={periodMeta?.year}
        periodMonth={periodMeta?.month}
        staffId={staffId}
        onStaffId={setStaffId}
        staffOpts={staffOpts}
        loading={loading}
        rows={filtered}
        selected={selected}
        onSelect={setSelectedId}
        canWrite={canWrite}
        canExport={canExport}
        isStaffLimited={isStaffLimited}
        periodClosed={periodClosed}
        onPayStaff={openPayStaff}
        onPayBulk={openPayBulk}
        onExport={exportAudit}
        onRules={() => setRulesOpen(true)}
        onAdjust={(item) => {
          setAdjustItem(item);
          setAdjAmount("");
          setAdjReason("");
        }}
        unpaidStaffCount={unpaidStaffCount}
        unpaidAmount={unpaidAmount}
      />

      <div className="hidden space-y-4 lg:block">
        <section className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
                <Shield size={12} />
                {ROLE_LABEL[user.role]}
              </span>
              <span className="text-[#E4BDC2]">•</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4]/40 px-2.5 py-0.5 text-[#5D4200]">
                <Lock size={12} />
                Snapshots figés
              </span>
              <span className="text-[#E4BDC2]">•</span>
              <span className="font-medium normal-case tracking-normal text-ink/50">
                Finance · {user.orgName}
              </span>
            </div>
            <h1 className="mt-2 text-[28px] font-semibold leading-9 tracking-tight">
              Commissions & rémunération variable
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] text-ink/55">
              Calcul automatisé au dirham près, traçabilité des soins COMPLETED, et règlements
              journalisés. {periodClosed ? "Période clôturée — ajustements uniquement." : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-4 text-[14px] font-semibold"
            >
              Règles & taux
            </button>
            {canExport ? (
              <button
                type="button"
                onClick={exportAudit}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#F6E3EF] px-4 text-[14px] font-semibold"
              >
                <Download size={18} />
                Exporter audit
              </button>
            ) : null}
            {canWrite && unpaidAmount > 0 && !periodClosed ? (
              <button
                type="button"
                onClick={openPayBulk}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-[14px] font-bold text-white shadow-sm"
              >
                <Wallet size={18} />
                Valider & payer
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Total généré"
            value={formatMad(kpis?.commissionTotal ?? 0)}
            hint={
              evolution == null
                ? `${kpis?.count ?? 0} soin${(kpis?.count ?? 0) > 1 ? "s" : ""}`
                : `${evolution > 0 ? "+" : ""}${evolution} % vs mois préc.`
            }
            icon={<Wallet size={18} className="text-primary" />}
          />
          <Kpi
            label="Solde à payer"
            value={formatMad(kpis?.unpaidTotal ?? 0)}
            hint={`${unpaidStaffCount} collaboratrice${unpaidStaffCount > 1 ? "s" : ""}`}
            icon={<FileSpreadsheet size={18} className="text-[#7B5900]" />}
            alert={unpaidAmount > 0}
          />
          <Kpi
            label="Déjà versé"
            value={formatMad(kpis?.paidTotal ?? 0)}
            hint={`${kpis?.paidCount ?? 0} écriture${(kpis?.paidCount ?? 0) > 1 ? "s" : ""}`}
            icon={<BadgeCheck size={18} className="text-emerald-700" />}
          />
          <Kpi
            label="Équipe active"
            value={`${kpis?.byStaff.length ?? 0}`}
            hint="Avec commissions sur la période"
            icon={<Users size={18} className="text-ink/50" />}
          />
          <Kpi
            label="Com. moyenne"
            value={formatMad(avgPerStaff)}
            hint="Par employée éligible"
            icon={<Trophy size={18} className="text-ink/50" />}
          />
          <Kpi
            label="Taux moyen"
            value={kpis?.avgRatePct == null ? "—" : `${kpis.avgRatePct} %`}
            hint="Sur CA soins"
            icon={<Percent size={18} className="text-primary" />}
          />
        </section>

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher une praticienne, un soin, un ticket…"
                className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-10 pr-3 text-[13px] outline-none ring-primary/30 focus:bg-white focus:ring-2"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="h-11 w-[180px]"
                value={preset}
                onChange={(e) => setPreset(e.target.value as CommissionPeriodPreset)}
              >
                <option value="month">Ce mois</option>
                <option value="prev_month">Mois précédent</option>
                <option value="week">Cette semaine</option>
                <option value="today">Aujourd’hui</option>
              </Select>
              {!isStaffLimited ? (
                <Select className="h-11 w-[200px]" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">Tous les employés ({staffOpts.length || allRows.length})</option>
                  {staffOpts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <button
                type="button"
                aria-label="Actualiser"
                onClick={() => refresh()}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FFEFF8] text-ink hover:bg-[#F6E3EF]"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["overview", `Vue générale (${allRows.length})`],
                ["unpaid", `À régler (${formatMad(unpaidAmount)})`],
                ["paid", `Déjà payé (${formatMad(kpis?.paidTotal ?? 0)})`],
                ["goals", "Objectifs & taux"],
                ["history", "Historique règlements"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center rounded-lg px-3 py-1.5 text-[14px] font-semibold",
                  tab === id ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink hover:bg-[#F6E3EF]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <section className="overflow-hidden rounded-xl bg-white shadow-sm xl:col-span-8">
            <div className="flex items-center justify-between bg-[#FFEFF8] px-4 py-3">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-primary" />
                <div>
                  <h2 className="text-[18px] font-semibold">Récapitulatif rémunération variable</h2>
                  <p className="text-[12px] capitalize text-ink/50">{periodLabel} · MAD</p>
                </div>
              </div>
            </div>
            {loading ? (
              <p className="p-8 text-center text-[13px] text-ink/50">Chargement…</p>
            ) : tab === "history" ? (
              <HistoryTable items={rowsRaw.filter((i) => i.paid)} />
            ) : tableRows.length === 0 ? (
              <p className="p-8 text-center text-[13px] text-ink/50">Aucune commission pour ces filtres.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#FCE9F4] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                        <th className="px-4 py-2.5">Employée</th>
                        <th className="px-3 py-2.5 text-right">CA soins</th>
                        <th className="px-3 py-2.5 text-center">Services</th>
                        <th className="px-3 py-2.5 text-center">Taux</th>
                        <th className="px-3 py-2.5 text-right">Com. nette</th>
                        <th className="px-3 py-2.5 text-right">Déjà versé</th>
                        <th className="px-3 py-2.5 text-right text-primary">Reste dû</th>
                        <th className="px-3 py-2.5 text-center">Statut</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => {
                        const chip = staffStatusChip(row.status);
                        const active = selected?.staffId === row.staffId;
                        return (
                          <tr
                            key={row.staffId}
                            onClick={() => setSelectedId(row.staffId)}
                            className={cn(
                              "cursor-pointer border-t border-transparent transition-colors",
                              active ? "bg-[#FFD9DE]/40" : "hover:bg-[#FFEFF8]/70",
                            )}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD9DE] text-[12px] font-bold text-primary">
                                  {staffInitials(row.firstName, row.lastName)}
                                  {allRows[0]?.staffId === row.staffId ? (
                                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FCCA66] text-[9px]">
                                      ★
                                    </span>
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-bold">{row.staffName}</p>
                                  <p className="truncate text-[12px] text-ink/45">
                                    {row.position || "Collaboratrice"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold">
                              {formatMad(row.baseTotal)}
                              {tab === "goals" ? (
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.round((row.baseTotal / maxBase) * 100)}%` }}
                                  />
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="rounded-full bg-[#FFEFF8] px-2 py-0.5 text-[11px] font-semibold text-ink/60">
                                {row.count} soin{row.count > 1 ? "s" : ""}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="rounded-md bg-[#FFDEA4] px-2 py-1 text-[11px] font-bold text-[#261900]">
                                {row.rateLabel}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right font-bold">
                              {formatMad(row.netTotal)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right text-ink/50">
                              {formatMad(row.paidTotal)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right font-bold text-primary">
                              {formatMad(row.unpaidTotal)}
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", chip.className)}>
                                {chip.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                              {canWrite && row.unpaidTotal > 0 && !periodClosed ? (
                                <button
                                  type="button"
                                  onClick={() => openPayStaff(row)}
                                  className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-white"
                                >
                                  Payer
                                </button>
                              ) : (
                                <span className="text-[11px] text-ink/40">{commissionShortId(row.staffId)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {canWrite && unpaidAmount > 0 && !periodClosed ? (
                  <div className="flex flex-col items-center justify-between gap-2 bg-[#FFEFF8] px-4 py-3 text-[13px] sm:flex-row">
                    <p className="text-ink/60">
                      {unpaidStaffCount} collaboratrice{unpaidStaffCount > 1 ? "s" : ""} en attente
                      <span className="mx-2 text-[#E4BDC2]">•</span>
                      <strong className="text-primary">À débloquer : {formatMad(unpaidAmount)}</strong>
                    </p>
                    <div className="flex gap-2">
                      {canExport ? (
                        <button
                          type="button"
                          onClick={exportAudit}
                          className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold"
                        >
                          Exporter Excel
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={openPayBulk}
                        className="rounded-lg bg-primary px-3 py-2 text-[13px] font-bold text-white"
                      >
                        Régler la sélection
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <aside className="space-y-4 xl:col-span-4">
            {selected ? (
              <InspectPanel
                row={selected}
                canWrite={canWrite && !periodClosed}
                canStaff={canStaff}
                onPay={() => openPayStaff(selected)}
                onAdjust={(item) => {
                  setAdjustItem(item);
                  setAdjAmount("");
                  setAdjReason("");
                }}
                onExport={() =>
                  downloadCommissionsExport({ preset, staffId: selected.staffId, format: "excel" })
                }
                canExport={canExport}
              />
            ) : (
              <div className="rounded-xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">
                Sélectionnez une collaboratrice pour inspecter le relevé.
              </div>
            )}
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm lg:col-span-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFDEA4]/50 text-[#5D4200]">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold">Taux appliqués sur la période</h3>
                  <p className="text-[12px] text-ink/45">Issus des règles figées au moment du soin</p>
                </div>
              </div>
              <span className="rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-bold text-[#7B5900]">
                Automatisé
              </span>
            </div>
            {tiers.length ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                {tiers.map((t, i) => (
                  <div
                    key={t.rate}
                    className={cn(
                      "rounded-lg p-3",
                      i === tiers.length - 1 ? "bg-[#FFD9DE]/50" : "bg-[#FFEFF8]",
                    )}
                  >
                    <p className="text-[11px] font-bold uppercase text-ink/45">{t.label}</p>
                    <p className="text-[22px] font-bold">{t.rate} %</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-ink/50">Aucun taux pourcentage sur cette période.</p>
            )}
            {selected ? (
              <div className="space-y-2 rounded-xl bg-[#FFEFF8] p-4">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-bold">Progression CA · {selected.staffName}</span>
                  <span className="font-bold">{formatMad(selected.baseTotal)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FCCA66] to-primary"
                    style={{
                      width: `${Math.min(100, Math.round((selected.baseTotal / maxBase) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[12px] text-ink/50">
                  {selected.count} soin{selected.count > 1 ? "s" : ""} · taux {selected.rateLabel}
                </p>
              </div>
            ) : null}
          </section>

          <section className="relative overflow-hidden rounded-xl bg-ink p-5 text-[#FEECF7] shadow-sm lg:col-span-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#FFDEA4]">
              <Sparkles size={16} />
              Copilote rémunération
            </div>
            <p className="mt-3 text-[15px] font-semibold leading-7">{insight}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-white/50">Lecture des totaux salon — pas de suggestion tarifaire inventée</span>
              <Link
                href="/ai/"
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-semibold text-[#FCCA66] hover:bg-white/15"
              >
                Ouvrir l’IA
              </Link>
            </div>
          </section>
        </div>

        <footer className="flex flex-col items-start justify-between gap-3 rounded-xl bg-[#FFEFF8] p-4 text-[12px] text-ink/55 md:flex-row md:items-center">
          <p>
            <strong className="text-ink/70">Règle de figement :</strong> une commission née d’un RDV COMPLETED
            n’est pas recalculée. Correction uniquement par ajustement journalisé.
          </p>
          <span className="inline-flex items-center gap-1 font-semibold text-ink/60">
            <Lock size={14} className="text-emerald-700" /> Loi 09-08 · MAD
          </span>
        </footer>
      </div>

      <Drawer open={Boolean(adjustItem)} onClose={() => setAdjustItem(null)} title="Ajustement commission">
        <div className="space-y-4 text-sm">
          <p className="text-ink/60">
            Ne modifie pas le snapshot. Montant signé (ex. -45 pour un remboursement).
          </p>
          {adjustItem ? (
            <p className="rounded-lg bg-[#FFEFF8] p-3 text-[13px]">
              {adjustItem.serviceName} · {adjustItem.staffName} · {formatMad(adjustItem.netAmount)}
            </p>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block font-medium">Montant *</span>
            <Input type="number" step={0.01} value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-medium">Motif *</span>
            <Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !adjAmount || !adjReason}
            onClick={handleAdjust}
          >
            Enregistrer
          </Button>
        </div>
      </Drawer>

      <Drawer open={Boolean(payTarget)} onClose={() => setPayTarget(null)} title="Valider le règlement">
        {payTarget ? (
          <div className="space-y-4 text-sm">
            <p className="text-ink/60">
              Marque les commissions sélectionnées comme payées. L’action est journalisée — pas de virement
              bancaire automatique.
            </p>
            <p className="rounded-lg bg-[#FFEFF8] p-3 font-semibold">{payTarget.label}</p>
            <p className="text-[12px] text-ink/45">{payTarget.ids.length} écriture{payTarget.ids.length > 1 ? "s" : ""}</p>
            <Button type="button" variant="primary" className="w-full" disabled={submitting} onClick={handlePay}>
              Confirmer le paiement ({formatMad(payTarget.amount)})
            </Button>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={rulesOpen} onClose={() => setRulesOpen(false)} title="Règles & taux">
        <div className="space-y-4 text-sm">
          <p className="text-ink/60">
            Les taux se configurent par employée et par prestation. Ici, seuls les taux déjà figés sur la
            période sont affichés.
          </p>
          {tiers.length ? (
            <ul className="space-y-2">
              {tiers.map((t) => (
                <li key={t.rate} className="flex justify-between rounded-lg bg-[#FFEFF8] px-3 py-2">
                  <span>{t.label}</span>
                  <strong>{t.rate} %</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink/50">Aucun taux pourcentage sur cette période.</p>
          )}
          <div className="grid grid-cols-1 gap-2">
            {canStaff ? (
              <Link href="/staff/" className="rounded-lg bg-[#F6E3EF] px-3 py-2 text-center font-semibold">
                Règles employées
              </Link>
            ) : null}
            {canServices ? (
              <Link href="/services/" className="rounded-lg bg-[#F6E3EF] px-3 py-2 text-center font-semibold">
                Prestations & commissions
              </Link>
            ) : null}
            {canExport ? (
              <Link href="/reports/commissions/" className="rounded-lg bg-[#F6E3EF] px-3 py-2 text-center font-semibold">
                Rapport détaillé
              </Link>
            ) : null}
            {canClose && periodMeta?.status === "OPEN" ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleClose}
                className="rounded-lg bg-ink px-3 py-2 font-semibold text-white"
              >
                Clôturer {periodMeta.month}/{periodMeta.year}
              </button>
            ) : null}
          </div>
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
  alert,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={cn("flex flex-col justify-between rounded-xl p-4 shadow-sm", alert ? "bg-[#FFDEA4]/35" : "bg-white")}>
      <div className={cn("flex items-center justify-between", alert ? "text-[#5D4200]" : "text-ink/50")}>
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="shrink-0">{icon}</span>
      </div>
      <div className="mt-2">
        <div className={cn("text-[22px] font-bold", alert && "text-[#5D4200]")}>{value}</div>
        <div className={cn("mt-1 truncate text-[11px]", alert ? "text-[#5D4200]/80" : "text-ink/45")}>{hint}</div>
      </div>
    </div>
  );
}

function InspectPanel({
  row,
  canWrite,
  canStaff,
  canExport,
  onPay,
  onAdjust,
  onExport,
}: {
  row: StaffRow;
  canWrite: boolean;
  canStaff: boolean;
  canExport: boolean;
  onPay: () => void;
  onAdjust: (item: CommissionListItem) => void;
  onExport: () => void;
}) {
  const proof = row.items.slice(0, 5);
  return (
    <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
          <BadgeCheck size={14} />
          Relevé POS / soins
        </p>
        <span className="rounded bg-[#F0DDE9] px-2 py-0.5 text-[11px] text-ink/50">
          {commissionShortId(row.staffId)}
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-[#FFEFF8] p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD9DE] text-[14px] font-bold text-primary">
          {staffInitials(row.firstName, row.lastName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold">{row.staffName}</p>
          <p className="text-[12px] font-semibold text-primary">
            {formatMad(row.unpaidTotal)} à débloquer · {row.rateLabel}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-[#FCE9F4] p-2">
          <p className="text-[10px] font-bold uppercase text-ink/40">CA prestations</p>
          <p className="text-[18px] font-bold">{formatMad(row.baseTotal)}</p>
        </div>
        <div className="rounded-lg bg-[#FCE9F4] p-2">
          <p className="text-[10px] font-bold uppercase text-ink/40">Actes figés</p>
          <p className="text-[18px] font-bold">{row.count}</p>
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Derniers soins rattachés</p>
      <div className="space-y-2">
        {proof.length ? (
          proof.map((item) => (
            <div key={item.id} className="rounded-lg bg-[#FFEFF8] p-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-[13px] font-bold">{item.serviceName}</span>
                <span className="shrink-0 font-bold text-primary">{formatMad(item.netAmount)}</span>
              </div>
              <div className="mt-0.5 flex justify-between text-[12px] text-ink/50">
                <span>{item.customerName ?? "Cliente"}</span>
                <span>
                  {formatMad(item.baseAmount)} · {lineCommissionLabel(item)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink/45">
                <span className="font-mono">
                  {formatCommissionDate(item.appointmentAt)} {formatCommissionTime(item.appointmentAt)} ·{" "}
                  {ticketRef(item)}
                </span>
                <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700">
                  <Lock size={12} /> {item.paid ? "Payé" : "Figé"}
                </span>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  className="mt-1 text-[11px] font-semibold text-primary"
                  onClick={() => onAdjust(item)}
                >
                  Ajuster
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-[13px] text-ink/45">Les lignes détaillées arriveront au prochain chargement.</p>
        )}
      </div>
      <p className="rounded-lg bg-[#FCE9F4] p-2 text-[12px] leading-relaxed text-ink/55">
        Un remboursement ou un ajustement soustrait la commission via une écriture d’audit, sans écraser le
        snapshot d’origine.
      </p>
      <div className="space-y-2">
        {canWrite && row.unpaidTotal > 0 ? (
          <button
            type="button"
            onClick={onPay}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold text-white"
          >
            Déclencher le paiement ({formatMad(row.unpaidTotal)})
          </button>
        ) : null}
        {canExport ? (
          <button
            type="button"
            onClick={onExport}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-[#F0DDE9] text-[13px] font-semibold"
          >
            Télécharger le relevé
          </button>
        ) : null}
        {canStaff ? (
          <Link
            href={`/staff/${row.staffId}/`}
            className="flex h-10 items-center justify-center rounded-lg bg-[#FFEFF8] text-[13px] font-semibold"
          >
            Fiche collaboratrice
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function HistoryTable({ items }: { items: CommissionListItem[] }) {
  if (!items.length) {
    return <p className="p-8 text-center text-[13px] text-ink/50">Aucun règlement sur cette période.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="bg-[#FCE9F4] text-[11px] font-bold uppercase tracking-wider text-ink/50">
            <th className="px-4 py-2.5">Date</th>
            <th className="px-3 py-2.5">Employée</th>
            <th className="px-3 py-2.5">Soin</th>
            <th className="px-3 py-2.5 text-right">Net</th>
            <th className="px-4 py-2.5">Réf.</th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 40).map((item) => (
            <tr key={item.id} className="border-t border-[#FFEFF8]">
              <td className="whitespace-nowrap px-4 py-3">
                {formatCommissionDate(item.appointmentAt)} {formatCommissionTime(item.appointmentAt)}
              </td>
              <td className="px-3 py-3 font-semibold">{item.staffName}</td>
              <td className="px-3 py-3">{item.serviceName}</td>
              <td className="px-3 py-3 text-right font-bold">{formatMad(item.netAmount)}</td>
              <td className="px-4 py-3 text-[11px] text-ink/45">{commissionShortId(item.id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
