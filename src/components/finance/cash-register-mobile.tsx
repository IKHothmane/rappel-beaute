"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Lock,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  type CashTab,
  closedHistoryLabel,
  formatCashDateTime,
  opsCount,
  paymentMix,
  saleCount,
  sumAbsTypes,
  txnTypeChip,
} from "@/components/finance/cash-helpers";
import { cn } from "@/lib/utils";
import { CASH_TXN_LABEL, formatMad, PAYMENT_METHOD_LABEL } from "@/modules/finance/service";
import type { CashSessionSummary, CashTxnItem, ClosedSessionPreview } from "@/types/finance";

type Props = {
  orgName: string;
  roleLabel: string;
  session: CashSessionSummary | null;
  isOpen: boolean;
  canWrite: boolean;
  showExpenses: boolean;
  showPayments: boolean;
  insight: string;
  tab: CashTab;
  onTab: (t: CashTab) => void;
  search: string;
  onSearch: (v: string) => void;
  txns: CashTxnItem[];
  filtered: CashTxnItem[];
  recentClosed: ClosedSessionPreview[];
  float: string;
  onFloat: (v: string) => void;
  counted: string;
  onCounted: (v: string) => void;
  closeReason: string;
  onCloseReason: (v: string) => void;
  submitting: boolean;
  onOpen: () => void;
  onPay: () => void;
  onOut: () => void;
  onClose: () => void;
  onTicket?: (paymentId: string | null) => void;
  ticketLoadingId?: string | null;
};

export function CashRegisterMobile({
  orgName,
  roleLabel,
  session,
  isOpen,
  canWrite,
  showExpenses,
  showPayments,
  insight,
  tab,
  onTab,
  search,
  onSearch,
  txns,
  filtered,
  recentClosed,
  float,
  onFloat,
  counted,
  onCounted,
  closeReason,
  onCloseReason,
  submitting,
  onOpen,
  onPay,
  onOut,
  onClose,
  onTicket,
  ticketLoadingId = null,
}: Props) {
  const mix = paymentMix(session);
  const refunds = sumAbsTypes(txns, ["REFUND_OUT"]);
  const ops = opsCount(txns);
  const sales = saleCount(txns);
  const theoretical = session?.theoreticalBalance ?? 0;
  const countedN = counted === "" ? null : Number(counted);
  const gap = countedN == null || Number.isNaN(countedN) ? null : countedN - theoretical;
  const drawer = isOpen
    ? theoretical
    : (session?.closingCounted ?? session?.theoreticalBalance ?? 0);

  return (
    <div className="space-y-4 pb-8 lg:hidden">
      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#54112F] via-[#831D4A] to-[#B83E72] p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border-[28px] border-white/10" />
        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Gestion financière
          </span>
          <div>
            <h1 className="text-[24px] font-extrabold leading-tight">Caisse & mouvements</h1>
            <p className="mt-1 text-[12px] text-pink-100">
              {orgName} · {roleLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold",
                isOpen ? "bg-emerald-400/20 text-emerald-100" : "bg-white/15 text-white",
              )}
            >
              {isOpen ? "● Ouverte" : "● Fermée"}
            </span>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-[11px] text-pink-100">
              {isOpen ? "Solde théorique" : "Dernier solde compté"}
            </p>
            <p className="mt-1 text-[26px] font-extrabold tracking-tight">{formatMad(drawer)}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-pink-100/90">{insight}</p>
          </div>
          {canWrite && isOpen ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onPay}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white text-[13px] font-bold text-[#831D4A]"
                >
                  <Plus className="h-4 w-4" />
                  Encaisser
                </button>
                <button
                  type="button"
                  onClick={onOut}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 text-[13px] font-semibold text-white"
                >
                  <Banknote className="h-4 w-4" />
                  Sortie
                </button>
              </div>
              <div
                id="cash-close-mobile"
                className="space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-pink-100">Clôture</p>
                  <h2 className="mt-1 text-[18px] font-bold">Rapprochement espèces</h2>
                </div>
                <div className="space-y-1.5 rounded-xl bg-black/15 p-3 text-[12px]">
                  <Row label="Fonds initial" value={formatMad(session?.openingFloat ?? 0)} light />
                  <Row label="+ Encaissements" value={formatMad(session?.cashIn ?? 0)} positive light />
                  <Row label="- Sorties" value={formatMad(-(session?.cashOut ?? 0))} negative light />
                  <div className="mt-1 flex items-center justify-between border-t border-white/15 pt-2">
                    <span className="text-[13px] font-bold">= Théorique</span>
                    <span className="text-[16px] font-bold tabular-nums">{formatMad(theoretical)}</span>
                  </div>
                </div>
                <label className="block text-[12px]">
                  <span className="mb-1 block font-semibold text-pink-100">Espèces comptées (MAD)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={counted}
                    onChange={(e) => onCounted(e.target.value)}
                    className="h-12 w-full rounded-xl border border-white/20 bg-white px-3 text-[18px] font-bold text-[#54112F] outline-none"
                  />
                </label>
                {gap != null && gap !== 0 ? (
                  <div className="rounded-xl bg-[#FFDAD6] p-3 text-[#93000A]">
                    <div className="flex items-center gap-1.5 text-[13px] font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      Écart {formatMad(gap)}
                    </div>
                    <p className="mt-1 text-[12px]">Motif obligatoire.</p>
                  </div>
                ) : gap === 0 ? (
                  <p className="text-[13px] font-semibold text-emerald-200">Comptage aligné.</p>
                ) : null}
                <label className="block text-[12px]">
                  <span className="mb-1 block font-semibold text-pink-100">
                    Motif{gap != null && gap !== 0 ? " (obligatoire)" : " (optionnel)"}
                  </span>
                  <textarea
                    value={closeReason}
                    onChange={(e) => onCloseReason(e.target.value)}
                    rows={2}
                    placeholder={
                      gap != null && gap !== 0
                        ? "Expliquez l’écart constaté…"
                        : "Ex. rendu monnaie, fond conforme…"
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/95 p-2.5 text-[13px] text-[#54112F] outline-none"
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    submitting || counted === "" || (gap != null && gap !== 0 && !closeReason.trim())
                  }
                  onClick={onClose}
                  className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-[14px] font-bold text-[#831D4A] disabled:opacity-40"
                >
                  <Lock className="h-4 w-4" />
                  {submitting ? "Clôture…" : "Valider le rapprochement"}
                </button>
              </div>
            </>
          ) : null}

          {!isOpen && canWrite ? (
            <div className="space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink-100">Session fermée</p>
                <h2 className="mt-1 text-[18px] font-bold">Ouvrir la caisse</h2>
                {session?.status === "CLOSED" ? (
                  <p className="mt-1.5 text-[12px] text-pink-100/90">
                    Dernière clôture : {formatCashDateTime(session.closedAt)}
                    {session.difference != null
                      ? session.difference === 0
                        ? " · écart nul"
                        : ` · écart ${formatMad(session.difference)}`
                      : ""}
                    .
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12px] text-pink-100/90">
                    Saisissez le fond de tiroir pour démarrer.
                  </p>
                )}
              </div>
              <label className="block text-[12px]">
                <span className="mb-1 block font-semibold text-pink-100">Fond de caisse (MAD)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={float}
                  placeholder="Ex. 500"
                  onChange={(e) => onFloat(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/20 bg-white px-3 text-[18px] font-bold text-[#54112F] outline-none"
                />
              </label>
              <button
                type="button"
                disabled={submitting || float.trim() === ""}
                onClick={onOpen}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-[14px] font-bold text-[#831D4A] disabled:opacity-40"
              >
                <Wallet className="h-4 w-4" />
                {submitting ? "Ouverture…" : "Ouvrir la caisse"}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {(
          [
            ["overview", "Vue générale"],
            ["journal", `Journal (${txns.length})`],
            ["out", `Sorties`],
            ["refunds", `Remb.`],
            ["history", "Clôtures"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-[12px] font-bold",
              tab === id ? "bg-[#981C52] text-white shadow-sm" : "bg-white text-ink shadow-sm",
            )}
          >
            {label}
          </button>
        ))}
        {showExpenses ? (
          <Link
            href="/expenses/"
            className="shrink-0 rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-ink shadow-sm"
          >
            Dépenses
          </Link>
        ) : null}
      </div>

      {tab !== "history" ? (
        <section className="grid grid-cols-2 gap-2">
          <KpiMini label="Espèces encaissées" value={formatMad(session?.cashIn ?? 0)} hint="Session" />
          <KpiMini label="Sorties" value={formatMad(session?.cashOut ?? 0)} hint="Décaissements" />
          <KpiMini label="Remboursements" value={formatMad(refunds)} hint="REFUND" />
          <KpiMini
            label="Mouvements"
            value={`${ops}`}
            hint={`${sales} encaissement${sales > 1 ? "s" : ""}`}
          />
        </section>
      ) : null}

      {tab !== "history" && mix.length > 0 ? (
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Ventilation du jour</h2>
            <span className="text-[11px] text-ink/50">{formatMad(session?.paymentsToday.total ?? 0)}</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F0DDE9]">
            {mix.map((m) => (
              <div key={m.key} className={cn("h-full", m.bar)} style={{ width: `${m.pct}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mix.map((m) => (
              <div key={m.key} className="flex items-center gap-2 rounded-lg bg-[#FFEFF8] p-2">
                <span className={cn("h-3 w-3 shrink-0 rounded-full", m.dot)} />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold">{m.label}</p>
                  <p className="text-[14px] font-bold">
                    {formatMad(m.amount)}{" "}
                    <span className="font-normal text-ink/45">({m.pct} %)</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-2">
          <h2 className="text-[18px] font-semibold">Historique des clôtures</h2>
          {recentClosed.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-center text-[13px] text-ink/50 shadow-sm">
              Aucune clôture enregistrée.
            </p>
          ) : (
            recentClosed.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                <div>
                  <p className="text-[14px] font-bold">{closedHistoryLabel(row)}</p>
                  <p className="text-[12px] text-ink/50">
                    {row.closedByName ?? "—"}
                    {row.expectedBalance != null ? ` · Th. ${formatMad(row.expectedBalance)}` : ""}
                    {row.closingCounted != null ? ` · Réel ${formatMad(row.closingCounted)}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] font-bold",
                    (row.difference ?? 0) === 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-[#FFDAD6] text-[#93000A]",
                  )}
                >
                  {row.difference == null ? "—" : formatMad(row.difference)}
                </span>
              </div>
            ))
          )}
        </section>
      ) : (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Flux de session</h2>
            {showPayments ? (
              <Link href="/payments/" className="text-[12px] font-bold text-primary">
                Paiements
              </Link>
            ) : null}
          </div>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ticket, motif, opératrice…"
            className="h-11 w-full rounded-xl bg-white px-3 text-[13px] shadow-sm outline-none placeholder:text-ink/35"
          />
          {filtered.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-center text-[13px] text-ink/50 shadow-sm">
              Aucun mouvement.
            </p>
          ) : (
            filtered.map((t) => {
              const canTicket =
                Boolean(t.paymentId) && t.type === "SALE" && Boolean(onTicket);
              return (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-bold">{CASH_TXN_LABEL[t.type]}</span>
                    <span className="rounded bg-[#FCE9F4] px-1.5 text-[10px] text-ink/50">
                      {formatCashDateTime(t.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-[13px] text-ink/55">{t.reason || "—"}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {t.method ? (
                      <span className="rounded bg-[#F0DDE9] px-1.5 py-0.5 text-[10px] font-semibold">
                        {PAYMENT_METHOD_LABEL[t.method]}
                      </span>
                    ) : null}
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", txnTypeChip(t.type))}>
                      {t.userName ?? "—"}
                    </span>
                    {canTicket ? (
                      <button
                        type="button"
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary disabled:opacity-50"
                        disabled={ticketLoadingId === t.paymentId}
                        onClick={() => onTicket?.(t.paymentId)}
                      >
                        {ticketLoadingId === t.paymentId ? "…" : "Ticket"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-[18px] font-bold",
                    t.amount < 0 ? "text-[#BA1A1A]" : "text-emerald-700",
                  )}
                >
                  {t.amount > 0 ? "+" : ""}
                  {formatMad(t.amount)}
                </p>
              </div>
              );
            })
          )}
        </section>
      )}

      <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#7B5900]" />
          <h2 className="text-[18px] font-semibold">Rôles caisse</h2>
        </div>
        <p className="text-[13px] text-ink/55">
          Votre rôle : <strong>{roleLabel}</strong>
          {canWrite ? " — ouverture, encaissement, sorties et clôture." : " — consultation du journal."}
        </p>
        <ul className="space-y-2 text-[13px] text-ink/55">
          <li className="rounded-lg bg-[#FFEFF8] p-2">
            <strong className="text-ink">Propriétaire / responsable :</strong> fond, clôture avec écart, sorties tiroir.
          </li>
          <li className="rounded-lg bg-[#FFEFF8] p-2">
            <strong className="text-ink">Caisse :</strong> encaisser les tickets, consulter le tiroir, sorties justifiées.
          </li>
          <li className="rounded-lg bg-[#FFEFF8] p-2">
            <strong className="text-ink">Comptable :</strong> lecture des sessions et des paiements, sans clôture.
          </li>
        </ul>
      </section>
    </div>
  );
}

function KpiMini({
  label,
  value,
  hint,
  alert,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
      <p className={cn("mt-1 text-[18px] font-bold", accent ? "text-primary" : "text-ink")}>{value}</p>
      <p className={cn("mt-0.5 text-[11px]", alert ? "font-bold text-[#BA1A1A]" : "text-ink/45")}>{hint}</p>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
  light,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  light?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={light ? "text-pink-100/85" : "text-ink/55"}>{label}</span>
      <span
        className={cn(
          "font-semibold",
          light ? "text-white" : undefined,
          positive && (light ? "text-emerald-200" : "text-emerald-700"),
          negative && (light ? "text-rose-200" : "text-[#BA1A1A]"),
        )}
      >
        {value}
      </span>
    </div>
  );
}
