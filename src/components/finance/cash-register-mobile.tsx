"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Landmark,
  Lock,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  type CashTab,
  closedHistoryLabel,
  formatCashTime,
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
  onBank: () => void;
  onClose: () => void;
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
  onBank,
  onClose,
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
      <section className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-full bg-[#FFEFF8] px-3 py-1.5">
          <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                isOpen ? "animate-pulse bg-emerald-600" : "bg-ink/30",
              )}
            />
            <span className="truncate">
              {isOpen
                ? `Ouverte ${formatCashTime(session?.openedAt)} · ${session?.openedByName ?? "—"}`
                : "Caisse fermée"}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[#F0DDE9] px-2 py-0.5 text-[11px] font-semibold text-ink/60">
            Fond {formatMad(session?.openingFloat ?? Number(float) || 0)}
          </span>
        </div>
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-ink">Caisse & mouvements</h1>
          <p className="mt-0.5 text-[13px] text-ink/55">
            {orgName} · {roleLabel}. Espèces au tiroir ≠ paiements carte / virement.
          </p>
        </div>
        {canWrite && isOpen ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onPay}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm"
            >
              <Plus className="h-5 w-5" />
              Nouvel encaissement
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onOut}
                className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FCE9F4] text-[11px] font-bold text-ink"
              >
                <Banknote className="h-4 w-4 text-[#7B5900]" />
                Sortie
              </button>
              <button
                type="button"
                onClick={onBank}
                className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FCE9F4] text-[11px] font-bold text-ink"
              >
                <Landmark className="h-4 w-4" />
                Banque
              </button>
              <button
                type="button"
                onClick={() => {
                  onCounted(String(theoretical));
                  onTab("overview");
                  document.getElementById("cash-close-mobile")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FCE9F4] text-[11px] font-bold text-primary"
              >
                <Lock className="h-4 w-4" />
                Clôture
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {(
            [
              ["overview", "Vue générale"],
              ["journal", `Flux (${txns.length})`],
              ["out", `Sorties (${formatMad(session?.cashOut ?? 0)})`],
              ["refunds", `Remb. (${formatMad(refunds)})`],
              ["history", "Clôtures"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold",
                tab === id ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink",
              )}
            >
              {label}
            </button>
          ))}
          {showExpenses ? (
            <Link
              href="/expenses/"
              className="shrink-0 rounded-full bg-[#FCE9F4] px-3 py-1.5 text-[12px] font-bold text-ink"
            >
              Dépenses
            </Link>
          ) : null}
        </div>
      </section>

      {tab !== "history" ? (
        <section className="space-y-2">
          <h2 className="px-0.5 text-[18px] font-semibold text-ink">Indicateurs</h2>
          <div className="grid grid-cols-2 gap-2">
            <KpiMini
              label="Espèces tiroir"
              value={formatMad(drawer)}
              hint={isOpen ? "Solde théorique" : "Dernier comptage"}
              alert={session?.status === "CLOSED" && (session.difference ?? 0) !== 0}
            />
            <KpiMini
              label="Encaissements"
              value={formatMad(session?.cashIn ?? 0)}
              hint="Espèces session"
            />
            <KpiMini
              label="Sorties caisse"
              value={formatMad(session?.cashOut ?? 0)}
              hint="Espèces décaissées"
            />
            <KpiMini label="Remboursements" value={formatMad(refunds)} hint="Sorties REFUND" />
            <KpiMini
              label="Paiements jour"
              value={formatMad(session?.paymentsToday.total ?? 0)}
              hint="Toutes méthodes"
              accent
            />
            <KpiMini
              label="Mouvements"
              value={`${ops}`}
              hint={`${sales} encaissement${sales > 1 ? "s" : ""}`}
            />
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
          <Sparkles className="h-4 w-4" />
          Lecture de caisse
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#FEECF7]/90">{insight}</p>
      </section>

      {!isOpen && canWrite ? (
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-[18px] font-semibold text-ink">Ouvrir la caisse</h2>
          {session?.status === "CLOSED" ? (
            <p className="text-[13px] text-ink/55">
              Dernière clôture {formatCashTime(session.closedAt)}
              {session.difference != null ? ` · écart ${formatMad(session.difference)}` : ""}.
            </p>
          ) : (
            <p className="text-[13px] text-ink/55">Aucun tiroir ouvert aujourd’hui.</p>
          )}
          <label className="block text-[13px]">
            <span className="mb-1 block font-semibold">Fond de caisse</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={float}
              onChange={(e) => onFloat(e.target.value)}
              className="h-12 w-full rounded-lg bg-[#FFEFF8] px-3 text-[18px] font-bold outline-none"
            />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={onOpen}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-[14px] font-semibold text-white"
          >
            {submitting ? "Ouverture…" : "Ouvrir la caisse"}
          </button>
        </section>
      ) : null}

      {isOpen && tab !== "history" ? (
        <section id="cash-close-mobile" className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Audit physique</p>
            <h2 className="text-[18px] font-semibold text-ink">Rapprochement tiroir</h2>
          </div>
          <div className="space-y-2 rounded-xl bg-[#FFEFF8] p-3 text-[13px]">
            <Row label="Fonds initial" value={formatMad(session?.openingFloat ?? 0)} />
            <Row label="+ Encaissements espèces" value={formatMad(session?.cashIn ?? 0)} positive />
            <Row label="- Sorties tiroir" value={formatMad(-(session?.cashOut ?? 0))} negative />
            <div className="mt-1 flex items-center justify-between rounded-lg bg-[#F0DDE9] px-2 py-1.5">
              <span className="text-[14px] font-bold">= Solde théorique</span>
              <span className="text-[18px] font-bold text-primary">{formatMad(theoretical)}</span>
            </div>
          </div>
          {canWrite ? (
            <>
              <label className="block text-[13px] font-semibold">
                Espèces réellement comptées
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={counted}
                  onChange={(e) => onCounted(e.target.value)}
                  className="mt-1 h-12 w-full rounded-lg bg-[#FFEFF8] px-3 text-[22px] font-bold outline-none"
                />
              </label>
              {gap != null && gap !== 0 ? (
                <div className="rounded-lg bg-[#FFDAD6] p-3 text-[#93000A]">
                  <div className="flex items-center gap-1.5 text-[14px] font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    Écart {formatMad(gap)}
                  </div>
                  <p className="mt-1 text-[13px]">Un motif est obligatoire pour sceller la clôture.</p>
                </div>
              ) : gap === 0 ? (
                <p className="text-[13px] font-semibold text-emerald-700">Comptage aligné sur le théorique.</p>
              ) : null}
              <label className="block text-[13px]">
                <span className="mb-1 block font-semibold">Motif de clôture</span>
                <textarea
                  value={closeReason}
                  onChange={(e) => onCloseReason(e.target.value)}
                  rows={2}
                  placeholder="Ex. rendu monnaie, fond conforme…"
                  className="w-full rounded-lg bg-[#FFEFF8] p-2.5 text-[13px] outline-none"
                />
              </label>
              <button
                type="button"
                disabled={submitting || counted === "" || !closeReason.trim()}
                onClick={onClose}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white disabled:opacity-40"
              >
                <Lock className="h-4 w-4" />
                Valider le rapprochement
              </button>
            </>
          ) : (
            <p className="text-[13px] text-ink/45">Lecture seule — clôture réservée à l’encaissement.</p>
          )}
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
            filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-bold">{CASH_TXN_LABEL[t.type]}</span>
                    <span className="rounded bg-[#FCE9F4] px-1.5 text-[10px] text-ink/50">
                      {formatCashTime(t.createdAt)}
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
            ))
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
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/55">{label}</span>
      <span
        className={cn(
          "font-semibold",
          positive && "text-emerald-700",
          negative && "text-[#BA1A1A]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
