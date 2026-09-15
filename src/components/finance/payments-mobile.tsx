"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import {
  Banknote,
  CreditCard,
  Download,
  Gift,
  Landmark,
  Plus,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  type PaymentPeriod,
  type PaymentTab,
  formatPaymentTime,
  paymentOrigin,
  paymentShortId,
  paymentStatusChip,
  signedPaymentAmount,
  waMeLink,
} from "@/components/finance/payment-helpers";
import { cn } from "@/lib/utils";
import { formatMad, PAYMENT_METHOD_LABEL } from "@/modules/finance/service";
import type { AppointmentPaymentSummary, PaymentItem, PaymentMethod } from "@/types/finance";

type MixSlice = { key: string; label: string; amount: number; pct: number; bar: string; dot: string };

type Kpis = {
  inflow: number;
  refunds: number;
  net: number;
  count: number;
  paidCount: number;
  pendingCount: number;
  depositCount: number;
  refundedCount: number;
  failedCount: number;
  byMethod: Record<PaymentMethod, number>;
};

type Props = {
  orgName: string;
  insight: string;
  kpis: Kpis;
  mix: MixSlice[];
  search: string;
  onSearch: (v: string) => void;
  tab: PaymentTab;
  onTab: (t: PaymentTab) => void;
  period: PaymentPeriod;
  onPeriod: (p: PaymentPeriod) => void;
  method: PaymentMethod | "";
  onMethod: (m: PaymentMethod | "") => void;
  canWrite: boolean;
  canPos: boolean;
  canCash: boolean;
  loading: boolean;
  rows: PaymentItem[];
  selected: PaymentItem | null;
  onSelect: (id: string) => void;
  remaining: AppointmentPaymentSummary | null;
  onNew: () => void;
  onRefund: (p: PaymentItem) => void;
  onCollectRemaining: () => void;
  canRefund: (p: PaymentItem) => boolean;
  exportCsv: () => void;
};

function MethodGlyph({ method }: { method: PaymentMethod }) {
  const cls = "h-[18px] w-[18px]";
  if (method === "CARD") return <CreditCard className={cls} />;
  if (method === "CASH") return <Banknote className={cls} />;
  if (method === "TRANSFER") return <Landmark className={cls} />;
  if (method === "GIFT_CARD") return <Gift className={cls} />;
  return <Wallet className={cls} />;
}

export function PaymentsMobile({
  orgName,
  insight,
  kpis,
  mix,
  search,
  onSearch,
  tab,
  onTab,
  period,
  onPeriod,
  method,
  onMethod,
  canWrite,
  canPos,
  canCash,
  loading,
  rows,
  selected,
  onSelect,
  remaining,
  onNew,
  onRefund,
  onCollectRemaining,
  canRefund,
  exportCsv,
}: Props) {
  const [view, setView] = useState<"list" | "focus">("list");

  const tabs: { id: PaymentTab; label: string; count: number; dot?: string }[] = [
    { id: "all", label: "Tous", count: kpis.count },
    { id: "paid", label: "Payés", count: kpis.paidCount, dot: "bg-primary" },
    { id: "pending", label: "En attente", count: kpis.pendingCount, dot: "bg-[#FCCA66]" },
    { id: "deposit", label: "Acomptes", count: kpis.depositCount, dot: "bg-[#FFDEA4]" },
    { id: "refunded", label: "Remboursés", count: kpis.refundedCount, dot: "bg-[#E4BDC2]" },
    { id: "failed", label: "Échoués", count: kpis.failedCount, dot: "bg-[#BA1A1A]" },
  ];

  if (view === "focus" && selected) {
    const wa = waMeLink(selected.customerPhone);
    const chip = paymentStatusChip(selected);
    const signed = signedPaymentAmount(selected);
    return (
      <div className="w-full space-y-4 pb-8 lg:hidden">
        <button
          type="button"
          className="text-[13px] font-semibold text-primary"
          onClick={() => {
            setView("list");
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          ← Journal
        </button>
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Fiche règlement
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <h2 className="text-[22px] font-bold">{paymentShortId(selected.id)}</h2>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
                  {chip.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("text-[22px] font-extrabold", signed < 0 && "text-[#BA1A1A]")}>
                {signed < 0 ? "−" : ""}
                {formatMad(Math.abs(signed))}
              </p>
            </div>
          </div>
          <dl className="space-y-2 rounded-xl bg-[#FFEFF8] p-3 text-[13px]">
            <Row label="Cliente" value={selected.customerName ?? "—"} />
            {selected.customerPhone ? <Row label="Téléphone" value={selected.customerPhone} /> : null}
            <Row label="Prestation" value={selected.serviceName ?? "—"} />
            <Row label="Méthode" value={PAYMENT_METHOD_LABEL[selected.method]} />
            <Row label="Horodatage" value={new Date(selected.paidAt).toLocaleString("fr-FR")} />
            <Row label="Opérateur" value={selected.userName ?? "—"} />
            {selected.notes ? <Row label="Notes" value={selected.notes} /> : null}
          </dl>
          {remaining && remaining.remaining > 0 ? (
            <div className="space-y-2 rounded-xl bg-[#FFDEA4]/40 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5D4200]">
                Solde RDV
              </p>
              <p className="text-[13px] text-[#261900]">
                Payé {formatMad(remaining.netPaid)} sur {formatMad(remaining.price)} · reste{" "}
                <strong>{formatMad(remaining.remaining)}</strong>
              </p>
              {canWrite ? (
                <button
                  type="button"
                  onClick={onCollectRemaining}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-[#7B5900] text-[14px] font-semibold text-white"
                >
                  Encaisser le solde
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center rounded-lg bg-emerald-700 text-[13px] font-semibold text-white"
              >
                WhatsApp
              </a>
            ) : null}
            {canRefund(selected) ? (
              <button
                type="button"
                onClick={() => onRefund(selected)}
                className="flex h-10 items-center justify-center rounded-lg bg-[#FFDAD6] text-[13px] font-semibold text-[#93000A]"
              >
                Rembourser
              </button>
            ) : null}
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
          <h1 className="mt-0.5 text-[22px] font-bold leading-tight text-ink">Paiements & flux</h1>
          <p className="mt-1 text-[13px] text-ink/55">Journal des encaissements et remboursements.</p>
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
          Nouveau paiement
        </button>
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Cliente, id, prestation…"
          className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[13px] shadow-sm outline-none"
        />
      </div>

      <div className="flex gap-2">
        <select
          value={period}
          onChange={(e) => onPeriod(e.target.value as PaymentPeriod)}
          className="h-10 flex-1 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
        >
          <option value="all">Toutes les dates</option>
          <option value="today">Aujourd’hui</option>
          <option value="yesterday">Hier</option>
          <option value="7d">7 jours</option>
          <option value="month">Mois en cours</option>
        </select>
        <select
          value={method}
          onChange={(e) => onMethod(e.target.value as PaymentMethod | "")}
          className="h-10 flex-1 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
        >
          <option value="">Toutes méthodes</option>
          <option value="CASH">Espèces</option>
          <option value="CARD">Carte</option>
          <option value="TRANSFER">Virement</option>
          <option value="CHECK">Chèque</option>
          <option value="ONLINE">En ligne</option>
          <option value="GIFT_CARD">Carte cadeau</option>
        </select>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {tabs
          .filter((t) => t.id === "all" || t.count > 0)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
                tab === t.id ? "bg-primary text-white" : "bg-white text-ink",
              )}
            >
              {t.dot ? <span className={cn("h-2 w-2 rounded-full", t.dot)} /> : null}
              {t.label} ({t.count})
            </button>
          ))}
      </div>

      {remaining && remaining.remaining > 0 && selected ? (
        <section className="space-y-2 rounded-xl bg-gradient-to-r from-[#FFDEA4] via-[#FCE9F4] to-[#FFEFF8] p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Solde dû · {paymentShortId(selected.id)}
              </p>
              <p className="text-[16px] font-bold">{selected.customerName ?? "Cliente"}</p>
            </div>
            <span className="rounded-full bg-[#7B5900] px-2 py-0.5 text-[11px] font-bold text-white">
              Reste {formatMad(remaining.remaining)}
            </span>
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={onCollectRemaining}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-white"
            >
              Encaisser le solde
            </button>
          ) : null}
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <KpiMini label="Encaissé" value={formatMad(kpis.inflow)} hint={`${kpis.count} op.`} />
        <KpiMini label="Net" value={formatMad(kpis.net)} hint={`Remb. ${formatMad(kpis.refunds)}`} accent />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <KpiMini label="Carte" value={formatMad(kpis.byMethod.CARD)} compact />
        <KpiMini label="Espèces" value={formatMad(kpis.byMethod.CASH)} compact />
        <KpiMini label="Virement" value={formatMad(kpis.byMethod.TRANSFER)} compact />
      </div>

      {mix.length > 0 ? (
        <section className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
          <h2 className="text-[16px] font-semibold">Ventilation</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-[#F0DDE9]">
            {mix.map((m) => (
              <div key={m.key} className={cn("h-full", m.bar)} style={{ width: `${m.pct}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-ink/60">
            {mix.map((m) => (
              <div key={m.key} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", m.dot)} />
                {m.label} {m.pct}%
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
          <Sparkles className="h-4 w-4" />
          Lecture du journal
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#FEECF7]/90">{insight}</p>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Journal</h2>
        <span className="text-[11px] text-ink/45">{rows.length} ligne{rows.length > 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50 shadow-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50 shadow-sm">
          Aucun paiement pour ces filtres.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const chip = paymentStatusChip(p);
            const origin = paymentOrigin(p);
            const signed = signedPaymentAmount(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p.id);
                  setView("focus");
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
                className="w-full rounded-xl bg-white p-3 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFEFF8] text-primary">
                      <MethodGlyph method={p.method} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold">{p.customerName ?? "—"}</p>
                      <p className="truncate text-[13px] text-ink/50">
                        {p.serviceName ?? origin.label}
                      </p>
                      <p className="mt-1 text-[11px] text-ink/45">
                        {paymentShortId(p.id)} · {formatPaymentTime(p.paidAt)} ·{" "}
                        {PAYMENT_METHOD_LABEL[p.method]}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-[16px] font-extrabold", signed < 0 && "text-[#BA1A1A]")}>
                      {signed < 0 ? "−" : ""}
                      {formatMad(Math.abs(signed))}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        chip.className,
                      )}
                    >
                      {chip.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[13px]">
        {canCash ? (
          <Link href="/cash-register/" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">
            Caisse →
          </Link>
        ) : null}
        {canPos ? (
          <Link href="/pos/" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">
            POS →
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
  accent,
  compact,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-xl bg-white p-3 shadow-sm", accent && "bg-ink text-[#FEECF7]")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-wider", accent ? "text-[#FFDEA4]" : "text-ink/45")}>
        {label}
      </p>
      <p className={cn("mt-1 font-extrabold tracking-tight", compact ? "text-[14px]" : "text-[18px]")}>{value}</p>
      {hint ? <p className={cn("mt-0.5 text-[11px]", accent ? "text-[#FEECF7]/70" : "text-ink/45")}>{hint}</p> : null}
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
