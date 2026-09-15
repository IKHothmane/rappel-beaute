"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Download, MessageCircle, Plus, Search, Sparkles } from "lucide-react";
import {
  type InvoicePeriod,
  type InvoiceTab,
  formatInvoiceDate,
  formatInvoiceTime,
  initials,
  invoiceStatusChip,
  invoiceWhen,
  reminderText,
  waMeLink,
} from "@/components/invoices/invoice-helpers";
import { cn } from "@/lib/utils";
import { formatMad, INVOICE_STATUS_LABEL } from "@/modules/invoices/service";
import type { InvoiceKpis, InvoiceListItem } from "@/types/invoice";

type Props = {
  orgName: string;
  insight: string;
  kpis: InvoiceKpis | null;
  search: string;
  onSearch: (v: string) => void;
  tab: InvoiceTab;
  onTab: (t: InvoiceTab) => void;
  tabCounts: { all: number; paid: number; partial: number; unpaid: number; voided: number };
  period: InvoicePeriod;
  onPeriod: (p: InvoicePeriod) => void;
  method: string;
  onMethod: (m: string) => void;
  canWrite: boolean;
  canPayments: boolean;
  canCustomers: boolean;
  loading: boolean;
  rows: InvoiceListItem[];
  priority: InvoiceListItem[];
  selected: InvoiceListItem | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onVoid: (e: InvoiceListItem) => void;
  onCollect: (e: InvoiceListItem) => void;
  exportCsv: () => void;
};

export function InvoicesMobile({
  orgName,
  insight,
  kpis,
  search,
  onSearch,
  tab,
  onTab,
  tabCounts,
  period,
  onPeriod,
  method,
  onMethod,
  canWrite,
  canPayments,
  canCustomers,
  loading,
  rows,
  priority,
  selected,
  onSelect,
  onNew,
  onVoid,
  onCollect,
  exportCsv,
}: Props) {
  const [view, setView] = useState<"list" | "focus">("list");

  if (view === "focus" && selected) {
    const chip = invoiceStatusChip(selected.status);
    const wa = waMeLink(selected.customerPhone);
    return (
      <div className="w-full space-y-4 pb-8 lg:hidden">
        <button
          type="button"
          className="text-[13px] font-semibold text-primary"
          onClick={() => {
            setView("list");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        >
          ← Registre
        </button>
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Fiche facture
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h2 className="text-[22px] font-bold">{selected.number}</h2>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
                  {chip.label}
                </span>
              </div>
            </div>
            <p className="text-[22px] font-extrabold text-primary">{formatMad(selected.total)}</p>
          </div>
          <dl className="space-y-2 rounded-xl bg-[#FFEFF8] p-3 text-[13px]">
            <Row label="Cliente" value={selected.customerName} />
            {selected.customerPhone ? <Row label="Téléphone" value={selected.customerPhone} /> : null}
            <Row label="Prestation" value={selected.firstItemName ?? "—"} />
            <Row label="Praticienne" value={selected.staffName ?? "—"} />
            <Row label="Date" value={formatInvoiceDate(invoiceWhen(selected))} />
            <Row label="Payé" value={formatMad(selected.paidAmount)} />
            <Row label="Reste" value={formatMad(selected.remaining)} />
          </dl>
          <div className="grid grid-cols-2 gap-2">
            {wa ? (
              <a
                href={`${wa}?text=${encodeURIComponent(reminderText(selected, orgName))}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FFDEA4] text-[13px] font-semibold text-[#5D4200]"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            ) : null}
            {canWrite && selected.status !== "VOID" && selected.remaining > 0 && selected.appointmentId ? (
              <button
                type="button"
                onClick={() => onCollect(selected)}
                className="flex h-10 items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-white"
              >
                Encaisser
              </button>
            ) : null}
            {canWrite && selected.status !== "VOID" ? (
              <button
                type="button"
                onClick={() => onVoid(selected)}
                className="flex h-10 items-center justify-center rounded-lg bg-[#FFDAD6] text-[13px] font-semibold text-[#93000A]"
              >
                Annuler
              </button>
            ) : null}
            <Link
              href={`/invoices/${selected.id}/`}
              className="flex h-10 items-center justify-center rounded-lg bg-[#F6E3EF] text-[13px] font-semibold"
            >
              Fiche / PDF
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{orgName}</p>
          <h1 className="mt-0.5 text-[22px] font-bold leading-tight text-ink">Factures & documents</h1>
          <p className="mt-1 text-[13px] text-ink/55">Registre émis depuis les RDV et le POS.</p>
        </div>
        <button
          type="button"
          aria-label="Exporter CSV"
          onClick={exportCsv}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FCE9F4] text-ink"
        >
          <Download size={18} />
        </button>
      </div>

      {canWrite ? (
        <button
          type="button"
          onClick={onNew}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm"
        >
          <Plus size={18} />
          Nouvelle facture
        </button>
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="N°, cliente, téléphone…"
          className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[13px] shadow-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={period}
          onChange={(e) => onPeriod(e.target.value as InvoicePeriod)}
          className="h-10 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
        >
          <option value="month">Ce mois</option>
          <option value="today">Aujourd’hui</option>
          <option value="all">Toutes les dates</option>
        </select>
        <select
          value={method}
          onChange={(e) => onMethod(e.target.value)}
          className="h-10 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
        >
          <option value="">Tous règlements</option>
          <option value="CASH">Espèces</option>
          <option value="CARD">Carte</option>
          <option value="TRANSFER">Virement</option>
          <option value="CHECK">Chèque</option>
          <option value="ONLINE">En ligne</option>
          <option value="GIFT_CARD">Carte cadeau</option>
        </select>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {(
          [
            ["all", "Toutes", tabCounts.all],
            ["paid", "Payées", tabCounts.paid],
            ["partial", "Partielles", tabCounts.partial],
            ["unpaid", "Impayées", tabCounts.unpaid],
            ["void", "Annulées", tabCounts.voided],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
              tab === id ? "bg-primary text-white" : "bg-white text-ink",
            )}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KpiMini label="CA facturé" value={formatMad(kpis?.billedTotal ?? 0)} hint={`${kpis?.monthCount ?? 0} ce mois`} />
        <KpiMini
          label="Encaissé"
          value={formatMad(kpis?.paidTotal ?? 0)}
          hint={kpis?.recoveryPct == null ? "—" : `${kpis.recoveryPct} % recouvré`}
        />
        <KpiMini
          label="À recouvrer"
          value={formatMad(kpis?.unpaidTotal ?? 0)}
          hint={`${kpis?.unpaidCount ?? 0} ouverte${(kpis?.unpaidCount ?? 0) > 1 ? "s" : ""}`}
          alert
        />
        <KpiMini
          label="Panier moyen"
          value={kpis?.avgBasket == null ? "—" : formatMad(kpis.avgBasket)}
          hint="Par facture du mois"
        />
      </div>

      {priority.length > 0 ? (
        <section className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Créances à recouvrer</h2>
            <span className="text-[11px] font-bold text-[#BA1A1A]">
              {formatMad(priority.reduce((s, p) => s + p.remaining, 0))}
            </span>
          </div>
          {priority.map((inv) => {
            const wa = waMeLink(inv.customerPhone);
            return (
              <div key={inv.id} className="rounded-lg bg-[#FFEFF8] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFDEA4] text-[11px] font-bold">
                      {initials(inv.customerName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{inv.customerName}</p>
                      <p className="truncate text-[11px] text-ink/50">
                        {inv.number} · {inv.firstItemName ?? INVOICE_STATUS_LABEL[inv.status]}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-[15px] font-extrabold text-primary">{formatMad(inv.remaining)}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  {wa ? (
                    <a
                      href={`${wa}?text=${encodeURIComponent(reminderText(inv, orgName))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-[#FFDEA4] text-[11px] font-bold text-[#5D4200]"
                    >
                      <MessageCircle size={14} />
                      Relance
                    </a>
                  ) : null}
                  {canWrite && inv.appointmentId ? (
                    <button
                      type="button"
                      onClick={() => onCollect(inv)}
                      className="flex h-8 flex-1 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-white"
                    >
                      Encaisser
                    </button>
                  ) : canPayments ? (
                    <Link
                      href="/payments/"
                      className="flex h-8 flex-1 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-white"
                    >
                      Paiements
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
          <Sparkles className="h-4 w-4" />
          Lecture du registre
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#FEECF7]/90">{insight}</p>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Dernières factures</h2>
        <span className="text-[11px] text-ink/45">
          {rows.length} {rows.length > 1 ? "lignes" : "ligne"}
        </span>
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50 shadow-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50 shadow-sm">
          Aucune facture pour ces filtres.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((inv) => {
            const chip = invoiceStatusChip(inv.status);
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => {
                  onSelect(inv.id);
                  setView("focus");
                  window.scrollTo({ top: 0, behavior: "auto" });
                }}
                className="w-full rounded-xl bg-white p-3 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-wider text-[#7B5900]">{inv.number}</p>
                    <p className="truncate text-[14px] font-bold">{inv.customerName}</p>
                    <p className="truncate text-[12px] text-ink/50">{inv.firstItemName ?? "—"}</p>
                    <p className="mt-1 text-[11px] text-ink/45">
                      {formatInvoiceDate(invoiceWhen(inv))} · {formatInvoiceTime(invoiceWhen(inv))}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[16px] font-extrabold">{formatMad(inv.total)}</p>
                    <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", chip.className)}>
                      {chip.label}
                    </span>
                    {inv.remaining > 0 && inv.status !== "VOID" ? (
                      <p className="mt-1 text-[11px] font-semibold text-[#BA1A1A]">Reste {formatMad(inv.remaining)}</p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[13px]">
        {canPayments ? (
          <Link href="/payments/" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">
            Paiements →
          </Link>
        ) : null}
        {canCustomers ? (
          <Link href="/customers/" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">
            Clientes →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function KpiMini({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className={cn("rounded-xl p-3 shadow-sm", alert ? "bg-[#FFDAD6]/50" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-wider", alert ? "text-[#93000A]" : "text-ink/45")}>
        {label}
      </p>
      <p className="mt-1 text-[16px] font-extrabold">{value}</p>
      {hint ? <p className={cn("mt-0.5 text-[11px]", alert ? "text-[#93000A]/80" : "text-ink/45")}>{hint}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink/50">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
