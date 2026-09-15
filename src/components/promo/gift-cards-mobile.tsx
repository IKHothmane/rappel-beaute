"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  Copy,
  Gift,
  Lock,
  MessageCircle,
  PauseCircle,
  Plus,
  Printer,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  type GiftFilter,
  DISPLAY_STATUS_LABEL,
  avgTicket,
  circulationRate,
  displayPin,
  displayStatus,
  exportGiftJournalCsv,
  filterCards,
  formatJournalStamp,
  formatShortDate,
  giftInsight,
  giftWhatsappText,
  isRitual,
  monthDelta,
  offerKind,
  offerLabel,
  posHref,
  posSimulation,
  remainingPct,
  statusChipClass,
  tabCounts,
  txnLabel,
  usageRate,
  waMeHref,
} from "@/components/promo/gift-cards-helpers";
import { cn, formatMad } from "@/lib/utils";
import type { GiftCardJournalItem, GiftCardKpis, GiftCardListItem } from "@/types/promo";

type Props = {
  orgName: string;
  roleLabel: string;
  kpis: GiftCardKpis | null;
  rows: GiftCardListItem[];
  journal: GiftCardJournalItem[];
  search: string;
  onSearch: (v: string) => void;
  tab: GiftFilter;
  onTab: (t: GiftFilter) => void;
  loading: boolean;
  selected: GiftCardListItem | null;
  onSelect: (id: string) => void;
  canWrite: boolean;
  canPos: boolean;
  canWhatsapp: boolean;
  onCreate: () => void;
  onSettings: () => void;
  onScrollAudit: () => void;
  onReminders: () => void;
  reminderBusy: boolean;
  onCopyWa: (text: string) => void;
  onSuspend: (card: GiftCardListItem) => void;
  onPrint: (card: GiftCardListItem) => void;
};

export function GiftCardsMobile(props: Props) {
  const {
    orgName,
    roleLabel,
    kpis,
    rows,
    journal,
    search,
    onSearch,
    tab,
    onTab,
    loading,
    selected,
    onSelect,
    canWrite,
    canPos,
    canWhatsapp,
    onCreate,
    onSettings,
    onScrollAudit,
    onReminders,
    reminderBusy,
    onCopyWa,
    onSuspend,
    onPrint,
  } = props;

  const kpiSafe = kpis ?? {
    soldCount: 0,
    soldValue: 0,
    redeemedValue: 0,
    remainingBalance: 0,
    activeCount: 0,
    usedCount: 0,
    ritualCount: 0,
    soldThisMonth: 0,
    soldPrevMonth: 0,
    soldValueThisMonth: 0,
    expiringSoonCount: 0,
    expiringSoonBalance: 0,
  };
  const counts = tabCounts(rows, kpiSafe);
  const filtered = useMemo(() => filterCards(rows, tab, search, "all"), [rows, tab, search]);
  const featured = selected ?? filtered[0] ?? null;
  const rest = featured ? filtered.filter((c) => c.id !== featured.id) : filtered;
  const insight = giftInsight(kpiSafe);
  const sim = featured ? posSimulation(featured) : null;
  const waText = featured ? giftWhatsappText(featured, orgName) : "";
  const waHref = featured ? waMeHref(featured.beneficiaryPhone ?? featured.buyerPhone, waText) : null;

  return (
    <div className="space-y-3 lg:hidden">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFDEA4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#261900]">
            <Lock size={12} />
            {roleLabel}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            Code unique + PIN
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FCE9F4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink/50">
            Cash flow immédiat
          </span>
        </div>
        <h1 className="mt-2 text-[28px] font-extrabold leading-9 tracking-tight">Cartes cadeaux</h1>
        <p className="mt-1 text-[13px] text-ink/55">
          Émission, solde et déduction POS — journal immuable, solde jamais négatif.
        </p>
        <div className="mt-3 flex items-center gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-bold text-white shadow-sm"
            >
              <Plus size={18} />
              Vendre une carte
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Paramètres"
            onClick={onSettings}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F6E3EF] text-ink"
          >
            <Settings size={18} />
          </button>
          <button
            type="button"
            aria-label="Bilan débits"
            onClick={onScrollAudit}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F6E3EF] text-ink"
          >
            <BarChart3 size={18} />
          </button>
        </div>
      </section>

      <section className="rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#FFDEA4]">
            <Sparkles size={14} className="shrink-0" />
            Copilote IA · cash-flow
          </span>
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">En direct</span>
        </div>
        <p className="mt-2 text-[13px] text-white/85">
          <strong className="text-[#FFDEA4]">{insight.sales}</strong> — {formatMad(insight.cash)} encaissés.
        </p>
        <p className="mt-1 text-[13px] text-white/70">
          Taux d’usage {insight.usage} %. {insight.expiringLabel}
        </p>
        {canWhatsapp && insight.expiring > 0 ? (
          <button
            type="button"
            disabled={reminderBusy}
            onClick={onReminders}
            className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[#FFDEA4] text-[14px] font-bold text-[#261900] disabled:opacity-60"
          >
            {reminderBusy ? "Préparation…" : `Rappels WhatsApp (${insight.expiring})`}
          </button>
        ) : (
          <button
            type="button"
            onClick={onScrollAudit}
            className="mt-3 w-full text-center text-[12px] font-semibold text-[#FFB2BD] underline"
          >
            Consulter le journal
          </button>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <KpiCard
          label="Actives en cours"
          value={`${kpiSafe.activeCount}`}
          hint={`${circulationRate(kpiSafe)} % / ${kpiSafe.soldCount} émises`}
        />
        <KpiCard label="Solde engagé" value={compact(kpiSafe.remainingBalance)} hint="Trésorerie encaissée" />
        <KpiCard
          label="Ventes du mois"
          value={String(kpiSafe.soldThisMonth)}
          hint={`${monthDelta(kpiSafe) >= 0 ? "+" : ""}${monthDelta(kpiSafe)} vs M-1`}
        />
        <KpiCard
          label="CA encaissé"
          value={compact(kpiSafe.soldValueThisMonth)}
          hint={kpiSafe.soldThisMonth ? `Panier ${formatMad(avgTicket(kpiSafe))}` : "Ce mois"}
        />
        <KpiCard label="Taux d’usage" value={`${usageRate(kpiSafe)} %`} hint={`${kpiSafe.usedCount} soldées`} />
        <KpiCard
          label="Fin de validité"
          value={String(kpiSafe.expiringSoonCount)}
          hint={`< 30 j · ${compact(kpiSafe.expiringSoonBalance)}`}
          danger={kpiSafe.expiringSoonCount > 0}
        />
      </section>

      <section className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ["all", `Toutes (${counts.all})`],
              ["active", `Actives (${counts.active})`],
              ["used", `Consommées (${counts.used})`],
              ["ritual", `Packs & rituels (${counts.ritual})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold",
                tab === id ? "bg-primary text-white" : "bg-[#FCE9F4] text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="N° carte, cliente, bénéficiaire…"
            className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-[15px] shadow-sm outline-none placeholder:text-ink/35"
          />
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">Aucune carte cadeau.</div>
      ) : (
        <section className="space-y-3">
          {featured ? (
            <article className="space-y-3 rounded-xl bg-white p-4 shadow-md">
              <LuxuryCard card={featured} orgName={orgName} />
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase text-[#7B5900]">{offerLabel(featured)}</span>
                <span className="text-ink/40">
                  {formatShortDate(featured.createdAt)} · {formatShortDate(featured.expiresAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="truncate text-ink/50">
                  De {featured.buyerName ?? "—"} →{" "}
                  <strong className="text-primary">{featured.beneficiaryName ?? "—"}</strong>
                </span>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-ink/45">
                  <span>Solde restant</span>
                  <span>{remainingPct(featured)} %</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F0DDE9]">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${remainingPct(featured)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {canPos ? (
                  <Link
                    href={posHref(featured.beneficiaryCustomerId)}
                    className="flex h-10 flex-col items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-white"
                  >
                    <ShoppingCart size={14} />
                    Déduire
                  </Link>
                ) : (
                  <span className="flex h-10 flex-col items-center justify-center rounded-lg bg-[#FCE9F4] text-[10px] font-bold text-ink/35">
                    Déduire
                  </span>
                )}
                {canWhatsapp && waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 flex-col items-center justify-center rounded-lg bg-[#FCE9F4] text-[10px] font-bold"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCopyWa(waText)}
                    className="flex h-10 flex-col items-center justify-center rounded-lg bg-[#FCE9F4] text-[10px] font-bold"
                  >
                    <Copy size={14} />
                    Copier
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onPrint(featured)}
                  className="flex h-10 flex-col items-center justify-center rounded-lg bg-[#FCE9F4] text-[10px] font-bold"
                >
                  <Printer size={14} />
                  PDF
                </button>
                {canWrite && featured.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => onSuspend(featured)}
                    className="flex h-10 flex-col items-center justify-center rounded-lg bg-[#FCE9F4] text-[10px] font-bold text-ink/50"
                  >
                    <PauseCircle size={14} />
                    Bloquer
                  </button>
                ) : (
                  <span className="flex h-10 items-center justify-center rounded-lg bg-[#FCE9F4] text-[10px] text-ink/35">
                    —
                  </span>
                )}
              </div>
            </article>
          ) : null}

          {rest.slice(0, 12).map((card) => {
            const st = displayStatus(card);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(card.id)}
                className="w-full rounded-xl bg-white p-3 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#F6E3EF] px-2 py-0.5 font-mono text-[13px] font-bold">
                      {card.code}
                    </span>
                    <span className="text-[11px] text-ink/40">PIN {displayPin(card.code)}</span>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", statusChipClass(st))}>
                    {st === "urgent" ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle size={11} />
                        {DISPLAY_STATUS_LABEL[st]}
                      </span>
                    ) : (
                      DISPLAY_STATUS_LABEL[st]
                    )}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <p className="text-[18px] font-bold">
                      {isRitual(card) ? offerLabel(card) : formatMad(card.balance)}
                    </p>
                    <p className="text-[11px] text-ink/45">
                      {offerKind(card)} · {card.beneficiaryName ?? "Sans bénéficiaire"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      )}

      {featured && sim ? (
        <section className="space-y-2 rounded-xl bg-[#FFEFF8] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <div>
              <p className="text-[18px] font-bold leading-tight">Simulation POS</p>
              <p className="text-[11px] text-ink/45">Ticket {sim.ticket}</p>
            </div>
          </div>
          <div className="rounded-lg bg-white p-3 text-[13px]">
            <div className="flex justify-between">
              <span>Soin visage prestige</span>
              <span className="font-bold">{formatMad(sim.line1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Manucure haute précision</span>
              <span className="font-bold">{formatMad(sim.line2)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-[#F0DDE9] pt-1 font-bold text-primary">
              <span>Déduction {featured.code}</span>
              <span>-{formatMad(sim.deduction)}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-[11px] text-ink/45">Reste à régler</span>
              <span className="text-[22px] font-extrabold text-[#7B5900]">{formatMad(sim.remainder)}</span>
            </div>
          </div>
          {canPos ? (
            <Link
              href={posHref(featured.beneficiaryCustomerId)}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold text-white"
            >
              Encaisser dans le POS
            </Link>
          ) : null}
        </section>
      ) : null}

      {featured ? (
        <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold">Message WhatsApp</p>
            <span className="text-[11px] font-bold text-[#7B5900]">1-clic CNDP</span>
          </div>
          <p className="rounded-lg bg-[#FFEFF8] p-3 text-[13px] leading-relaxed">{waText}</p>
          <div className="grid grid-cols-2 gap-2">
            {canWhatsapp && waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-1 rounded-lg bg-[#FFDEA4] text-[14px] font-bold text-[#261900]"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            ) : (
              <span className="flex h-11 items-center justify-center rounded-lg bg-[#FCE9F4] text-[12px] text-ink/40">
                Pas de n°
              </span>
            )}
            <button
              type="button"
              onClick={() => onCopyWa(waText)}
              className="flex h-11 items-center justify-center gap-1 rounded-lg bg-[#F6E3EF] text-[14px] font-semibold"
            >
              <Copy size={16} />
              Copier
            </button>
          </div>
        </section>
      ) : null}

      <section id="gift-audit-mobile" className="space-y-2 rounded-xl bg-[#FFEFF8] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-1 text-[14px] font-bold">
            <Wallet size={16} className="text-primary" />
            Journal d’audit
          </p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink/45">SHA-256</span>
        </div>
        {journal.length === 0 ? (
          <p className="text-[13px] text-ink/45">Aucun mouvement pour l’instant.</p>
        ) : (
          journal.slice(0, 6).map((row) => (
            <div key={row.id} className="rounded-lg bg-white p-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ink/45">{formatJournalStamp(row.createdAt)}</span>
                <span className={cn("font-bold", row.amount >= 0 ? "text-[#7B5900]" : "text-primary")}>
                  {row.amount > 0 ? "+" : ""}
                  {formatMad(row.amount)}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span>{row.code}</span>
                <span className="text-ink/40">{txnLabel(row.type)}</span>
              </div>
              <p className="truncate font-mono text-[10px] text-ink/35">{row.proofHash.slice(0, 18)}…</p>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => exportGiftJournalCsv(journal)}
          className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-white text-[13px] font-semibold shadow-sm"
        >
          Exporter le grand livre (.CSV)
        </button>
      </section>
    </div>
  );
}

function compact(n: number) {
  if (n >= 1000) return `${Math.round(n).toLocaleString("fr-MA")}`;
  return formatMad(n);
}

function KpiCard({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-[#FFEFF8] p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className={cn("mt-1 text-[22px] font-extrabold leading-none", danger && "text-[#BA1A1A]")}>{value}</p>
      <p className={cn("mt-1 text-[12px]", danger ? "font-bold text-[#BA1A1A]" : "text-ink/50")}>{hint}</p>
    </div>
  );
}

function LuxuryCard({ card, orgName }: { card: GiftCardListItem; orgName: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-lg">
      <Gift size={42} className="absolute -right-2 -bottom-2 text-white/5" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#FFDEA4]">
          {orgName || "Rappel Beauté"}
        </p>
        <span className="rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[10px] font-bold text-[#261900]">Privilège</span>
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-wider text-white/50">Code cadeau unique</p>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[22px] font-bold tracking-widest">{card.code}</p>
        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[12px] text-[#FFDEA4]">
          PIN {displayPin(card.code)}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-white/50">Solde disponible</p>
          <p className="text-[22px] font-extrabold text-[#FFDEA4]">{formatMad(card.balance)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-white/50">Valeur initiale</p>
          <p className="text-[15px] font-bold">{formatMad(card.initialValue)}</p>
        </div>
      </div>
    </div>
  );
}
