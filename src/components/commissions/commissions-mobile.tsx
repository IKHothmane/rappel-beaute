"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Download,
  FileText,
  Lock,
  Search,
  Sparkles,
  Trophy,
  Wallet,
} from "lucide-react";
import {
  type CommissionTab,
  type StaffRow,
  commissionShortId,
  formatCommissionDate,
  formatCommissionTime,
  lineCommissionLabel,
  periodPresetLabel,
  rateTiers,
  staffStatusChip,
  ticketRef,
} from "@/components/commissions/commission-helpers";
import { staffInitials } from "@/components/staff/staff-helpers";
import { cn } from "@/lib/utils";
import { formatMad } from "@/modules/commissions/service";
import type { CommissionKpis, CommissionListItem, CommissionPeriodPreset } from "@/types/commission";

type Props = {
  orgName: string;
  roleLabel: string;
  insight: string;
  kpis: CommissionKpis | null;
  evolution: number | null;
  search: string;
  onSearch: (v: string) => void;
  tab: CommissionTab;
  onTab: (t: CommissionTab) => void;
  preset: CommissionPeriodPreset;
  onPreset: (p: CommissionPeriodPreset) => void;
  periodYear?: number;
  periodMonth?: number;
  staffId: string;
  onStaffId: (id: string) => void;
  staffOpts: { id: string; name: string }[];
  loading: boolean;
  rows: StaffRow[];
  selected: StaffRow | null;
  onSelect: (id: string) => void;
  canWrite: boolean;
  canExport: boolean;
  isStaffLimited: boolean;
  periodClosed: boolean;
  onPayStaff: (row: StaffRow) => void;
  onPayBulk: () => void;
  onExport: () => void;
  onRules: () => void;
  onAdjust: (item: CommissionListItem) => void;
  unpaidStaffCount: number;
  unpaidAmount: number;
};

export function CommissionsMobile({
  orgName,
  roleLabel,
  insight,
  kpis,
  evolution,
  search,
  onSearch,
  tab,
  onTab,
  preset,
  onPreset,
  periodYear,
  periodMonth,
  staffId,
  onStaffId,
  staffOpts,
  loading,
  rows,
  selected,
  onSelect,
  canWrite,
  canExport,
  isStaffLimited,
  periodClosed,
  onPayStaff,
  onPayBulk,
  onExport,
  onRules,
  onAdjust,
  unpaidStaffCount,
  unpaidAmount,
}: Props) {
  const [view, setView] = useState<"list" | "focus">("list");
  const [proofOpen, setProofOpen] = useState(false);
  const top = rows[0] ?? null;
  const rest = rows.slice(top && tab !== "history" ? 1 : 0);
  const periodLabel = periodPresetLabel(preset, periodYear, periodMonth);
  const tiers = rateTiers(rows.flatMap((r) => r.items));

  if (view === "focus" && selected) {
    const chip = staffStatusChip(selected.status);
    const proof = selected.items.slice(0, 6);
    return (
      <div className="w-full space-y-4 pb-8 lg:hidden">
        <button
          type="button"
          className="text-[13px] font-semibold text-primary"
          onClick={() => {
            setView("list");
            setProofOpen(false);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          ← Équipe
        </button>
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD9DE] text-[14px] font-bold text-primary">
                {staffInitials(selected.firstName, selected.lastName)}
              </div>
              <div>
                <h2 className="text-[18px] font-bold">{selected.staffName}</h2>
                <p className="text-[12px] text-ink/50">
                  {selected.position || "Collaboratrice"} · {selected.count} soin
                  {selected.count > 1 ? "s" : ""}
                </p>
                <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
                  {chip.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Reste dû</p>
              <p className="text-[22px] font-extrabold text-primary">{formatMad(selected.unpaidTotal)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-[#FFEFF8] p-2">
              <p className="text-[10px] font-bold uppercase text-ink/40">CA soins</p>
              <p className="text-[16px] font-bold">{formatMad(selected.baseTotal)}</p>
            </div>
            <div className="rounded-lg bg-[#FFEFF8] p-2">
              <p className="text-[10px] font-bold uppercase text-ink/40">Taux</p>
              <p className="text-[16px] font-bold">{selected.rateLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProofOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-[#FCE9F4] px-3 py-2.5 text-left text-[13px] font-bold"
          >
            <span className="inline-flex items-center gap-2">
              <Lock size={16} className="text-[#7B5900]" />
              Soins rattachés ({selected.items.length})
            </span>
            <ChevronDown size={18} className={cn("transition-transform", proofOpen && "rotate-180")} />
          </button>
          {proofOpen ? (
            <div className="space-y-2">
              {proof.map((item) => (
                <div key={item.id} className="rounded-lg bg-[#FFEFF8] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold">{item.serviceName}</p>
                      <p className="text-[11px] text-ink/45">
                        {item.customerName ?? "Cliente"} · {ticketRef(item)}
                      </p>
                    </div>
                    <p className="text-[13px] font-bold text-primary">{formatMad(item.netAmount)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink/45">
                    <span>
                      {formatCommissionDate(item.appointmentAt)} {formatCommissionTime(item.appointmentAt)} ·{" "}
                      {lineCommissionLabel(item)}
                    </span>
                    {canWrite && !periodClosed ? (
                      <button
                        type="button"
                        className="font-semibold text-primary"
                        onClick={() => onAdjust(item)}
                      >
                        Ajuster
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {canWrite && selected.unpaidTotal > 0 && !periodClosed ? (
            <button
              type="button"
              onClick={() => onPayStaff(selected)}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-bold text-white"
            >
              <Wallet size={16} />
              Déclencher le paiement ({formatMad(selected.unpaidTotal)})
            </button>
          ) : null}
          <Link
            href={`/staff/${selected.staffId}/`}
            className="flex h-10 items-center justify-center rounded-lg bg-[#F6E3EF] text-[13px] font-semibold"
          >
            Fiche collaboratrice
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              <Lock size={11} />
              {roleLabel}
            </span>
            <span className="text-[11px] text-ink/45">{periodLabel}</span>
          </div>
          <h1 className="mt-1 text-[22px] font-bold leading-tight text-ink">Commissions & rémunération</h1>
          <p className="mt-0.5 text-[13px] text-ink/55">
            Calcul figé au dirham près · {orgName}
          </p>
        </div>
        {canExport ? (
          <button
            type="button"
            aria-label="Exporter"
            onClick={onExport}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FCE9F4] text-ink"
          >
            <Download size={18} />
          </button>
        ) : null}
      </div>

      {canWrite && unpaidAmount > 0 && !periodClosed ? (
        <button
          type="button"
          onClick={onPayBulk}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[14px] font-semibold text-white shadow-sm"
        >
          <Wallet size={18} />
          Valider & payer ({formatMad(unpaidAmount)})
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRules}
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FCE9F4] text-[12px] font-semibold"
        >
          Règles & taux
        </button>
        {canExport ? (
          <button
            type="button"
            onClick={onExport}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FCE9F4] text-[12px] font-semibold"
          >
            <FileText size={14} />
            Exporter audit
          </button>
        ) : (
          <div />
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Praticienne, soin, ticket…"
          className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-[13px] shadow-sm outline-none"
        />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {(
          [
            ["overview", `Vue générale (${rows.length})`],
            ["unpaid", `À régler (${formatMad(unpaidAmount)})`],
            ["paid", "Déjà payé"],
            ["goals", "Objectifs"],
            ["history", "Historique"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold shadow-sm",
              tab === id ? "bg-primary text-white" : "bg-white text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={preset}
          onChange={(e) => onPreset(e.target.value as CommissionPeriodPreset)}
          className="h-10 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
        >
          <option value="month">Ce mois</option>
          <option value="prev_month">Mois précédent</option>
          <option value="week">Cette semaine</option>
          <option value="today">Aujourd’hui</option>
        </select>
        {!isStaffLimited ? (
          <select
            value={staffId}
            onChange={(e) => onStaffId(e.target.value)}
            className="h-10 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
          >
            <option value="">Toute l’équipe</option>
            {staffOpts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex h-10 items-center rounded-lg bg-white px-3 text-[12px] font-semibold text-ink/55 shadow-sm">
            Mes commissions
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-2">
        <Kpi
          label="Total généré"
          value={formatMad(kpis?.commissionTotal ?? 0)}
          hint={
            evolution == null
              ? `${kpis?.count ?? 0} soins`
              : `${evolution > 0 ? "+" : ""}${evolution} % vs préc.`
          }
        />
        <Kpi
          label="Solde à payer"
          value={formatMad(kpis?.unpaidTotal ?? 0)}
          hint={`${unpaidStaffCount} en attente`}
          accent
        />
        <Kpi
          label="Déjà versé"
          value={formatMad(kpis?.paidTotal ?? 0)}
          hint={`${kpis?.paidCount ?? 0} écriture${(kpis?.paidCount ?? 0) > 1 ? "s" : ""}`}
        />
        <Kpi
          label="Équipe"
          value={`${kpis?.byStaff.length ?? 0}`}
          hint="Collaboratrices actives"
        />
        <Kpi
          label="Com. moyenne"
          value={formatMad(
            (kpis?.byStaff.length ?? 0) > 0
              ? Math.round(((kpis?.commissionTotal ?? 0) / (kpis?.byStaff.length ?? 1)) * 100) / 100
              : 0,
          )}
          hint="Par praticienne"
        />
        <Kpi
          label="Taux moyen"
          value={kpis?.avgRatePct == null ? "—" : `${kpis.avgRatePct} %`}
          hint="Sur CA soins"
        />
      </section>

      {top && tab !== "history" ? (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Trophy size={18} className="text-primary" />
            <h3 className="text-[16px] font-bold">Top performer</h3>
          </div>
          <StaffCard
            row={top}
            featured
            canWrite={canWrite && !periodClosed}
            onOpen={() => {
              onSelect(top.staffId);
              setView("focus");
            }}
            onPay={() => onPayStaff(top)}
          />
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold">
            {tab === "history" ? "Écritures" : "Collaboratrices"}
          </h3>
          <span className="text-[11px] text-ink/45">
            {tab === "history" ? `${kpis?.count ?? 0} lignes` : `${unpaidStaffCount} à payer`}
          </span>
        </div>
        {loading ? (
          <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50">Chargement…</p>
        ) : tab === "history" ? (
          <HistoryList rows={rows} />
        ) : rest.length === 0 && !top ? (
          <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50">
            Aucune commission sur cette période.
          </p>
        ) : (
          <div className="space-y-2">
            {(top ? rest : rows).map((row) => (
              <StaffCard
                key={row.staffId}
                row={row}
                canWrite={canWrite && !periodClosed}
                onOpen={() => {
                  onSelect(row.staffId);
                  setView("focus");
                }}
                onPay={() => onPayStaff(row)}
              />
            ))}
          </div>
        )}
      </section>

      {canWrite && unpaidAmount > 0 && !periodClosed && tab !== "history" ? (
        <section className="space-y-3 rounded-xl bg-[#FFEFF8] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold">Clôture des règlements</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink/50">
              {unpaidStaffCount} praticienne{unpaidStaffCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-ink/55">Total dû</span>
            <span className="text-[22px] font-bold text-primary">{formatMad(unpaidAmount)}</span>
          </div>
          <button
            type="button"
            onClick={onPayBulk}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold text-white shadow-sm"
          >
            Régler toute la sélection
          </button>
        </section>
      ) : null}

      {tiers.length > 0 ? (
        <section className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <BadgeCheck size={16} className="text-[#7B5900]" />
            <h3 className="text-[13px] font-bold">Taux observés sur la période</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {tiers.map((t) => (
              <div key={t.rate} className="rounded-lg bg-[#FFEFF8] p-2">
                <p className="text-[10px] font-bold uppercase text-ink/45">{t.label}</p>
                <p className="text-[18px] font-bold">{t.rate} %</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#FFDEA4]">
            <Sparkles size={16} />
            Lecture rémunération
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/90">{insight}</p>
        <Link
          href="/ai/"
          className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FCCA66] text-[12px] font-bold text-[#755400]"
        >
          Ouvrir le copilote IA
        </Link>
      </section>

      <p className="text-center text-[11px] leading-relaxed text-ink/45">
        Snapshots figés au COMPLETED · montants en MAD · conformité Loi 09-08 (CNDP).
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("flex flex-col justify-between rounded-xl p-3 shadow-sm", accent ? "bg-[#FFEFF8]" : "bg-white")}>
      <p className={cn("text-[11px] font-medium", accent ? "font-bold text-primary" : "text-ink/50")}>{label}</p>
      <p className={cn("mt-1 text-[18px] font-bold leading-tight", accent && "text-primary")}>{value}</p>
      <p className="mt-0.5 text-[10px] text-ink/45">{hint}</p>
    </div>
  );
}

function StaffCard({
  row,
  featured,
  canWrite,
  onOpen,
  onPay,
}: {
  row: StaffRow;
  featured?: boolean;
  canWrite: boolean;
  onOpen: () => void;
  onPay: () => void;
}) {
  const chip = staffStatusChip(row.status);
  return (
    <article
      className={cn(
        "space-y-2 rounded-xl bg-white p-3 shadow-sm",
        featured && "ring-1 ring-[#FCCA66]/60",
        row.status === "paid" && "opacity-90",
      )}
    >
      <button type="button" onClick={onOpen} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFD9DE] text-[13px] font-bold text-primary">
            {staffInitials(row.firstName, row.lastName)}
          </div>
          <div>
            <p className="text-[16px] font-bold">{row.staffName}</p>
            <p className="text-[12px] text-ink/50">
              {row.position || "Collaboratrice"} · {row.count} soin{row.count > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", chip.className)}>{chip.label}</span>
      </button>
      <div className="flex items-end justify-between text-[13px]">
        <div>
          <p className="text-[10px] font-bold uppercase text-ink/40">CA soins</p>
          <p className="font-semibold">{formatMad(row.baseTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-ink/40">Versé</p>
          <p className="font-semibold">{formatMad(row.paidTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-ink/40">Reste</p>
          <p className="text-[16px] font-bold text-primary">{formatMad(row.unpaidTotal)}</p>
        </div>
      </div>
      {canWrite && row.unpaidTotal > 0 ? (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="h-9 rounded-lg bg-[#F6E3EF] px-3 text-[11px] font-bold"
          >
            Relevé
          </button>
          <button
            type="button"
            onClick={onPay}
            className="h-9 rounded-lg bg-primary px-3 text-[11px] font-bold text-white"
          >
            Régler {formatMad(row.unpaidTotal)}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function HistoryList({ rows }: { rows: StaffRow[] }) {
  const items = rows
    .flatMap((r) => r.items)
    .filter((i) => i.paid)
    .sort((a, b) => +new Date(b.paidAt ?? b.appointmentAt) - +new Date(a.paidAt ?? a.appointmentAt))
    .slice(0, 30);
  if (!items.length) {
    return <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50">Aucun règlement sur cette période.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <div>
            <p className="text-[13px] font-semibold">{item.staffName}</p>
            <p className="text-[11px] text-ink/45">
              {item.serviceName} · {commissionShortId(item.id)}
            </p>
          </div>
          <p className="text-[13px] font-bold">{formatMad(item.netAmount)}</p>
        </div>
      ))}
    </div>
  );
}
