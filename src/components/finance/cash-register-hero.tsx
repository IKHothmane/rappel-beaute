"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Coins,
  Layers,
  Lock,
  MessageSquare,
  Wallet,
} from "lucide-react";
import AnimatedCashRegister from "@/components/finance/animated-cash-register";
import { formatMad } from "@/modules/finance/service";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  balance: number | null;
  openedAt?: string | null;
  canWrite: boolean;
  onPayment: () => void;
  onWithdrawal: () => void;
  onRefund: () => void;
  onClose: () => void;
  onOpen: () => void;
  float?: string;
  onFloatChange?: (value: string) => void;
  submitting?: boolean;
  lastClosedLabel?: string | null;
  lastCloseHint?: string | null;
  openingFloat?: number;
  cashIn?: number;
  cashOut?: number;
  theoretical?: number;
  refunds?: number;
  movements?: number;
  counted?: string;
  onCountedChange?: (value: string) => void;
  closeReason?: string;
  onCloseReasonChange?: (value: string) => void;
};

const money = (v: number | null) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `${new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} MAD`;

export function CashRegisterHero({
  isOpen,
  balance,
  openedAt,
  canWrite,
  onClose,
  onOpen,
  float = "",
  onFloatChange,
  submitting = false,
  lastClosedLabel,
  lastCloseHint,
  openingFloat = 0,
  cashIn = 0,
  cashOut = 0,
  theoretical = 0,
  refunds = 0,
  movements = 0,
  counted = "",
  onCountedChange,
  closeReason = "",
  onCloseReasonChange,
}: Props) {
  const reduced = useReducedMotion();
  const showOpenForm = !isOpen && canWrite && typeof onFloatChange === "function";
  const showCloseForm = isOpen && canWrite && typeof onCountedChange === "function";
  const countedN = counted === "" ? null : Number(counted);
  const gap = countedN == null || Number.isNaN(countedN) ? null : countedN - theoretical;
  const openedLabel =
    isOpen && openedAt && !Number.isNaN(new Date(openedAt).getTime())
      ? new Date(openedAt).toLocaleString("fr-MA", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#6B1438] text-white shadow-[0_20px_50px_rgba(60,10,30,.28)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(184,62,114,.5),transparent_50%),radial-gradient(ellipse_at_90%_90%,rgba(84,17,47,.65),transparent_45%)]"
      />

      <div className="relative grid gap-5 p-5 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.9fr)] lg:items-stretch lg:gap-8 lg:p-8">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
            <div className="shrink-0 overflow-visible pb-1">
              <AnimatedCashRegister embedded open={isOpen} />
            </div>

            <div className="min-w-0 flex-1 space-y-3.5 text-center sm:text-left">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold shadow-sm",
                  isOpen
                    ? "bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40"
                    : "bg-white/10 text-white ring-1 ring-white/25",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", isOpen ? "bg-emerald-300" : "bg-white/70")} />
                {isOpen ? "Caisse ouverte" : "Caisse fermée"}
              </span>

              <div>
                <p className="text-[13px] font-medium text-pink-100/90">
                  {isOpen ? "Solde théorique du tiroir" : "Dernier solde compté"}
                </p>
                <motion.h2
                  key={balance}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 break-words text-[clamp(2.1rem,3.6vw,3rem)] font-extrabold leading-[1.05] tracking-tight tabular-nums"
                >
                  {money(balance)}
                </motion.h2>
              </div>

              {openedLabel ? (
                <p className="inline-flex items-center justify-center gap-1.5 text-[12px] text-pink-100/85 sm:justify-start">
                  <CalendarDays size={14} className="shrink-0 opacity-80" />
                  Ouverte le {openedLabel}
                </p>
              ) : lastClosedLabel ? (
                <p className="text-[12px] text-pink-100/85">
                  Dernière clôture : {lastClosedLabel}
                  {lastCloseHint ? ` · ${lastCloseHint}` : ""}
                </p>
              ) : null}

              <p className="mx-auto max-w-md text-[12.5px] leading-relaxed text-pink-100/75 sm:mx-0">
                Gérez les encaissements, sorties et clôtures. Le rapprochement permet de vérifier le solde
                réel et de clôturer la session.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MiniKpi
              icon={<Coins size={14} className="text-[#981C52]" />}
              label="Encaissements"
              value={formatMad(cashIn)}
            />
            <MiniKpi
              icon={<ArrowUpRight size={14} className="text-[#981C52]" />}
              label="Sorties de caisse"
              value={formatMad(cashOut)}
            />
            <MiniKpi
              icon={<ArrowLeftRight size={14} className="text-[#981C52]" />}
              label="Remboursements"
              value={formatMad(refunds)}
            />
            <MiniKpi
              icon={<Layers size={14} className="text-[#981C52]" />}
              label="Mouvements"
              value={`${movements}`}
            />
          </div>
        </div>

        <div className="min-w-0 self-stretch">
          {showCloseForm ? (
            <div
              id="cash-close"
              className="flex h-full flex-col rounded-[24px] bg-white p-5 text-[#2A1520] shadow-[0_16px_36px_rgba(20,0,10,.2)] sm:p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE9F4] text-[#981C52]">
                  <Layers size={18} />
                </span>
                <h2 className="text-[17px] font-bold leading-tight tracking-tight text-[#2A1520]">
                  Clôture de la caisse
                </h2>
              </div>

              <div className="mb-5 space-y-2 rounded-2xl bg-[#FFF7FB] p-3.5">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#981C52]/80">
                  Rapprochement espèces
                </p>
                <CloseRow label="Fonds initial" value={formatMad(openingFloat)} />
                <CloseRow label="+ Encaissements" value={formatMad(cashIn)} tone="pos" />
                <CloseRow label="- Sorties" value={formatMad(cashOut)} tone="neg" />
                <div className="flex items-center justify-between rounded-xl bg-[#FCE9F4] px-3 py-2.5">
                  <span className="text-[13px] font-bold text-[#981C52]">Σ Théorique</span>
                  <span className="text-[16px] font-extrabold tabular-nums text-[#981C52]">
                    {formatMad(theoretical)}
                  </span>
                </div>
              </div>

              <label className="mb-3 block text-[12px] font-semibold text-[#765E6B]">
                Montant compté (réel) <span className="text-[#BA1A1A]">*</span>
                <div className="relative mt-1.5">
                  <Coins
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#981C52]/65"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={counted}
                    placeholder="Saisir le montant réellement compté…"
                    onChange={(e) => onCountedChange?.(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#EEDFE7] bg-white pl-10 pr-3 text-[14px] font-semibold text-[#2A1520] outline-none placeholder:font-normal placeholder:text-[#2A1520]/35 focus:border-[#981C52]/40 focus:ring-2 focus:ring-[#981C52]/15"
                  />
                </div>
              </label>

              {gap != null && gap !== 0 ? (
                <div className="mb-3 rounded-xl bg-[#FFDAD6] p-3 text-[#93000A]">
                  <div className="flex items-center gap-1.5 text-[13px] font-bold">
                    <AlertTriangle size={15} />
                    Écart : {formatMad(gap)}
                  </div>
                  <p className="mt-1 text-[12px]">Un motif est obligatoire avant validation.</p>
                </div>
              ) : gap === 0 ? (
                <p className="mb-3 text-[13px] font-semibold text-emerald-700">Comptage aligné.</p>
              ) : null}

              <label className="mb-5 block text-[12px] font-semibold text-[#765E6B]">
                Motif {gap != null && gap !== 0 ? "(obligatoire)" : "(facultatif)"}
                <div className="relative mt-1.5">
                  <MessageSquare
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-3.5 text-[#981C52]/65"
                  />
                  <textarea
                    value={closeReason}
                    onChange={(e) => onCloseReasonChange?.(e.target.value)}
                    rows={2}
                    placeholder="Ex. fin de journée, vérification, …"
                    className="min-h-[72px] w-full resize-none rounded-xl border border-[#EEDFE7] bg-white py-3 pl-10 pr-3 text-[13px] text-[#2A1520] outline-none placeholder:text-[#2A1520]/35 focus:border-[#981C52]/40 focus:ring-2 focus:ring-[#981C52]/15"
                  />
                </div>
              </label>

              <button
                type="button"
                disabled={
                  submitting || counted === "" || (gap != null && gap !== 0 && !closeReason.trim())
                }
                onClick={onClose}
                className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#831D4A] via-[#981C52] to-[#B83E72] text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(152,28,82,.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Lock size={17} />
                {submitting ? "Clôture…" : "Valider la clôture de la caisse"}
              </button>
            </div>
          ) : showOpenForm ? (
            <div
              id="cash-open"
              className="flex h-full flex-col rounded-[24px] bg-white p-5 text-[#2A1520] shadow-[0_16px_36px_rgba(20,0,10,.2)] sm:p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE9F4] text-[#981C52]">
                  <Wallet size={18} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#981C52]">Session fermée</p>
                  <h2 className="text-[17px] font-bold leading-tight text-[#2A1520]">Ouvrir la caisse</h2>
                </div>
              </div>

              {lastClosedLabel ? (
                <p className="mb-5 text-[13px] leading-relaxed text-[#765E6B]">
                  Dernière clôture : {lastClosedLabel}
                  {lastCloseHint ? ` · ${lastCloseHint}` : ""}.
                </p>
              ) : (
                <p className="mb-5 text-[13px] leading-relaxed text-[#765E6B]">
                  Saisissez le fond de tiroir pour démarrer la journée.
                </p>
              )}

              <label className="mb-5 block text-[12px] font-semibold text-[#765E6B]">
                Fond de caisse (MAD) <span className="text-[#BA1A1A]">*</span>
                <div className="relative mt-1.5">
                  <Coins
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#981C52]/65"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={float}
                    placeholder="Ex. 500"
                    onChange={(e) => onFloatChange?.(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#EEDFE7] bg-white pl-10 pr-3 text-[15px] font-bold text-[#2A1520] outline-none placeholder:font-normal placeholder:text-[#2A1520]/35 focus:border-[#981C52]/40 focus:ring-2 focus:ring-[#981C52]/15"
                  />
                </div>
              </label>

              <button
                type="button"
                disabled={submitting || float.trim() === ""}
                onClick={onOpen}
                className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#831D4A] via-[#981C52] to-[#B83E72] text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(152,28,82,.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Wallet size={17} />
                {submitting ? "Ouverture…" : "Ouvrir la caisse"}
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-white/15 bg-white/10 p-6 text-center text-[13px] text-pink-100/85">
              {isOpen ? "Lecture seule — clôture non disponible." : "Lecture seule — ouverture non disponible."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniKpi({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-[#2A1520] shadow-[0_4px_14px_rgba(20,0,10,.12)]">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#FCE9F4]">
          {icon}
        </span>
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#765E6B]">
          {label}
        </span>
      </div>
      <p className="truncate pl-0.5 text-[15px] font-extrabold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function CloseRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[#765E6B]">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "pos" && "text-emerald-600",
          tone === "neg" && "text-[#BA1A1A]",
          !tone && "text-[#2A1520]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
