"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgePercent,
  Bot,
  CalendarDays,
  Copy,
  Gift,
  Lock,
  MapPin,
  MessageCircle,
  Percent,
  Plus,
  Receipt,
  Search,
  Shield,
  Sparkles,
  Store,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  type GanttWeek,
  type PromoSimulation,
  type PromoTab,
  discountLabel,
  fillRatio,
  formatPromoShortDate,
  ganttOffset,
  perimeterLabel,
  promoShortId,
  statusChip,
  validityLabel,
} from "@/components/promo/promo-helpers";
import { cn, formatMad } from "@/lib/utils";
import type { CustomerListItem } from "@/types/customer";
import type { PromotionKpis, PromotionListItem } from "@/types/promo";

type Insight = {
  headline: string;
  recommendation: string;
  conflict: string;
  best: PromotionListItem | null;
};

type Props = {
  orgName: string;
  roleLabel: string;
  kpis: PromotionKpis | null;
  kpiHints: { pos: string; revenue: string; conversion: string };
  effort: number | null;
  conversion: number | null;
  insight: Insight;
  search: string;
  onSearch: (v: string) => void;
  tab: PromoTab;
  onTab: (t: PromoTab) => void;
  counts: Record<PromoTab, number>;
  loading: boolean;
  rows: PromotionListItem[];
  selected: PromotionListItem | null;
  onSelect: (id: string) => void;
  canWrite: boolean;
  onAdd: () => void;
  onCalendar: () => void;
  onRules: () => void;
  onDeploy: () => void;
  canPos: boolean;
  canAgenda: boolean;
  canWhatsapp: boolean;
  canReactivation: boolean;
  weeks: GanttWeek[];
  ganttItems: PromotionListItem[];
  sim: PromoSimulation | null;
  simCustomer: CustomerListItem | null;
  simLines: { name: string; price: number }[];
  waText: string;
  waHref: string | null;
  onCopy: (text: string, label: string) => void;
  onToggleStatus: (p: PromotionListItem) => void;
};

const TABS: { id: PromoTab; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "codes", label: "Codes" },
  { id: "auto", label: "Paliers" },
  { id: "calendar", label: "Calendrier" },
  { id: "audit", label: "Historique" },
];

export function PromotionsMobile({
  orgName,
  roleLabel,
  kpis,
  kpiHints,
  effort,
  conversion,
  insight,
  search,
  onSearch,
  tab,
  onTab,
  counts,
  loading,
  rows,
  selected,
  onSelect,
  canWrite,
  onAdd,
  onCalendar,
  onRules,
  onDeploy,
  canPos,
  canAgenda,
  canWhatsapp,
  canReactivation,
  weeks,
  ganttItems,
  sim,
  simCustomer,
  simLines,
  waText,
  waHref,
  onCopy,
  onToggleStatus,
}: Props) {
  const [view, setView] = useState<"list" | "focus">("list");
  const chip = selected ? statusChip(selected) : null;

  if (view === "focus" && selected) {
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
          ← Offres
        </button>
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Inspection
            </span>
            <span className="font-mono text-[11px] text-ink/40">{promoShortId(selected.id)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3">
            <div>
              <p className="text-[18px] font-bold">{selected.code ?? selected.name}</p>
              <p className="text-[13px] text-ink/55">
                {selected.name} · {discountLabel(selected)}
              </p>
            </div>
            {selected.code ? (
              <button
                type="button"
                onClick={() => onCopy(selected.code!, "Code copié")}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[12px] font-semibold text-primary shadow-sm"
              >
                <Copy size={14} />
                Copier
              </button>
            ) : null}
          </div>
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", chip?.className)}>
            {chip?.label}
          </span>
          {selected.description ? <p className="text-[13px] text-ink/55">{selected.description}</p> : null}
          <div className="grid grid-cols-2 gap-2 text-[12px] text-ink/70">
            <div className="rounded-lg bg-[#FFF7F9] p-2">
              Panier min. {selected.minAmount != null ? formatMad(selected.minAmount) : "—"}
            </div>
            <div className="rounded-lg bg-[#FFF7F9] p-2">
              {selected.maxUsesPerCustomer != null
                ? `${selected.maxUsesPerCustomer}× / cliente`
                : "Sans plafond / cliente"}
            </div>
            <div className="rounded-lg bg-[#FFF7F9] p-2">{validityLabel(selected).secondary}</div>
            <div className="rounded-lg bg-[#FFF7F9] p-2">Non cumulable au POS</div>
          </div>
          {sim ? (
            <div className="space-y-2 rounded-xl bg-[#FCE9F4] p-3">
              <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                <Receipt size={16} className="text-primary" />
                Simulation ticket
              </p>
              {simCustomer ? (
                <p className="text-[13px]">
                  {simCustomer.firstName} {simCustomer.lastName}
                </p>
              ) : (
                <p className="text-[12px] text-ink/45">Testez le code au POS pour le ticket réel.</p>
              )}
              {simLines.map((l) => (
                <div key={l.name} className="flex justify-between text-[13px]">
                  <span>{l.name}</span>
                  <span className="font-medium">{formatMad(l.price)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[12px] text-ink/45">
                <span>Sous-total</span>
                <span>{formatMad(sim.subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Remise</span>
                <span>-{formatMad(sim.discount)}</span>
              </div>
              <div className="flex justify-between text-[18px] font-bold">
                <span>Net</span>
                <span className="text-primary">{formatMad(sim.net)}</span>
              </div>
              <ul className="space-y-1 text-[11px]">
                {sim.checks.map((c) => (
                  <li key={c.label} className={c.ok ? "text-emerald-800" : "text-amber-800"}>
                    {c.ok ? "✓" : "!"} {c.label}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-2">
                {canPos ? (
                  <Link
                    href="/pos/"
                    className="flex h-10 items-center justify-center gap-1 rounded-lg bg-white text-[12px] font-semibold shadow-sm"
                  >
                    <Store size={15} className="text-primary" />
                    Tester POS
                  </Link>
                ) : (
                  <span className="flex h-10 items-center justify-center rounded-lg bg-white/50 text-[12px] text-ink/35">
                    POS
                  </span>
                )}
                {canAgenda ? (
                  <Link
                    href="/agenda/"
                    className="flex h-10 items-center justify-center gap-1 rounded-lg bg-white text-[12px] font-semibold shadow-sm"
                  >
                    <CalendarDays size={15} className="text-[#7B5900]" />
                    Agenda
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="space-y-2 rounded-xl bg-[#FFEFF8] p-3">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold">
              <MessageCircle size={16} className="text-emerald-700" />
              WhatsApp manuel
            </p>
            <p className="rounded-lg bg-white p-2.5 text-[13px] italic text-ink/70">{waText}</p>
            <div className="grid grid-cols-2 gap-2">
              {canWhatsapp && waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center gap-1 rounded-lg bg-emerald-700 text-[12px] font-bold text-white"
                >
                  WhatsApp
                </a>
              ) : (
                <span className="flex h-10 items-center justify-center rounded-lg bg-white text-[12px] text-ink/35">
                  Téléphone requis
                </span>
              )}
              <button
                type="button"
                onClick={() => onCopy(waText, "Texte copié")}
                className="flex h-10 items-center justify-center gap-1 rounded-lg bg-white text-[12px] font-semibold shadow-sm"
              >
                <Copy size={15} />
                Copier
              </button>
            </div>
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={() => onToggleStatus(selected)}
              className="h-11 w-full rounded-lg bg-[#F6E3EF] text-[13px] font-semibold"
            >
              {selected.status === "ACTIVE" ? "Désactiver" : "Activer"}
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <section className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#382D36] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
            <Shield size={13} />
            {roleLabel}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
            <Lock size={13} className="text-primary" />
            Anti-cumul POS
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F0DDE9] px-2.5 py-1 text-[11px] font-semibold text-ink/55">
            <MapPin size={13} className="text-[#7B5900]" />
            {orgName}
          </span>
        </div>
        <h1 className="text-[28px] font-bold leading-9 tracking-tight">Promotions & offres</h1>
        <p className="text-[13px] text-ink/55">Campagnes, codes et plafonds — liés au POS réel.</p>
        <div className="grid grid-cols-12 gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={onAdd}
              className="col-span-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-bold text-white shadow-sm"
            >
              <Plus size={18} />
              Promotion
            </button>
          ) : (
            <div className="col-span-6" />
          )}
          <button
            type="button"
            onClick={onCalendar}
            className="col-span-3 flex h-12 items-center justify-center rounded-xl bg-[#FCE9F4] shadow-sm"
            aria-label="Calendrier"
          >
            <CalendarDays size={19} className="text-primary" />
          </button>
          <button
            type="button"
            onClick={onRules}
            className="col-span-3 flex h-12 items-center justify-center rounded-xl bg-[#FCE9F4] shadow-sm"
            aria-label="Règles"
          >
            <Shield size={19} className="text-[#7B5900]" />
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-xl bg-[#382D36] p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
            <Bot size={14} />
            Copilote
          </span>
          <Sparkles size={14} className="text-[#F0BF5C]" />
        </div>
        <p className="mt-2 text-[13px] leading-snug">{insight.headline}</p>
        <p className="mt-2 text-[12px] text-[#FEECF7]/80">{insight.recommendation}</p>
        <p className="mt-1.5 rounded bg-white/5 px-2 py-1.5 text-[11px]">{insight.conflict}</p>
        {canWrite ? (
          <button
            type="button"
            onClick={onDeploy}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white"
          >
            <Zap size={16} />
            Préparer une offre
          </button>
        ) : null}
        {canReactivation ? (
          <Link href="/reactivation/" className="mt-2 block text-center text-[12px] font-semibold text-[#FFDEA4]">
            Ouvrir la réactivation →
          </Link>
        ) : null}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Performances du mois</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <KpiMini
            label="Promos actives"
            value={kpis ? String(kpis.activeCount) : "—"}
            hint={`${kpis?.archivedCount ?? 0} archivées`}
            icon={<Gift size={16} className="text-primary" />}
          />
          <KpiMini
            label="Clientes touchées"
            value={kpis ? String(kpis.customersTouchedMonth) : "—"}
            hint="Usages distincts"
            icon={<Users size={16} className="text-[#7B5900]" />}
          />
          <KpiMini
            label="Passages POS"
            value={kpis ? String(kpis.usedThisMonth) : "—"}
            hint={kpiHints.pos}
            icon={<Receipt size={16} className="text-primary" />}
          />
          <KpiMini
            label="CA généré"
            value={kpis ? formatMad(kpis.estimatedRevenueMonth) : "—"}
            hint={kpiHints.revenue}
            icon={<Wallet size={16} className="text-[#7B5900]" />}
          />
          <KpiMini
            label="Effort remise"
            value={kpis ? formatMad(kpis.discountTotalMonth) : "—"}
            hint={effort != null ? `Taux ${String(effort).replace(".", ",")} %` : "Remises accordées"}
            icon={<BadgePercent size={16} />}
          />
          <KpiMini
            label="Utilisation"
            value={conversion != null ? `${String(conversion).replace(".", ",")} %` : "—"}
            hint={kpiHints.conversion}
            icon={<Percent size={16} className="text-primary" />}
          />
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-semibold",
                tab === t.id ? "bg-primary text-white" : "bg-[#F6E3EF] text-ink",
              )}
            >
              {t.label}
              <span className="ml-1 text-[11px] opacity-80">({counts[t.id]})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Promotion, code, soin…"
            className="h-11 w-full rounded-xl bg-white pl-10 pr-4 text-[13px] shadow-sm outline-none"
          />
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/45">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/45">Aucune promotion.</p>
        ) : (
          rows.map((p) => {
            const st = statusChip(p);
            const f = fillRatio(p);
            const peri = perimeterLabel(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p.id);
                  setView("focus");
                }}
                className="flex w-full flex-col gap-2.5 rounded-xl bg-white p-3.5 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-[18px] font-semibold">{p.name}</h2>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", st.className)}>
                        {st.label}
                      </span>
                    </div>
                    {p.code ? (
                      <p className="text-[11px] font-bold tracking-wider text-primary">CODE : {p.code}</p>
                    ) : (
                      <p className="text-[11px] text-ink/45">Sans code · automatique</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[16px] font-bold">{p.monthRevenue > 0 ? formatMad(p.monthRevenue) : "—"}</p>
                    <p className="text-[11px] text-ink/40">CA du mois</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2 text-[13px] text-ink/55">
                  <span className="truncate">{peri.primary}</span>
                  <span className="shrink-0 font-semibold text-primary">{discountLabel(p)}</span>
                </div>
                {f.max != null ? (
                  <div>
                    <div className="flex justify-between text-[11px] text-ink/55">
                      <span>
                        {f.used} / {f.max}
                      </span>
                      <span>{f.pct} %</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#FCE9F4]">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${f.pct}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-ink/45">
                    {p.usageCount} utilisation{p.usageCount > 1 ? "s" : ""} · sans plafond
                  </p>
                )}
              </button>
            );
          })
        )}
      </section>

      {tab === "calendar" || ganttItems.length > 0 ? (
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-[#7B5900]" />
            <h3 className="text-[18px] font-bold">Chevauchement</h3>
          </div>
          <div className="grid grid-cols-6 gap-1 text-center text-[9px] text-ink/40">
            {weeks.map((w) => (
              <span key={w.label} className={w.current ? "font-bold text-primary" : ""}>
                {w.label.replace(" (actuelle)", "")}
              </span>
            ))}
          </div>
          {ganttItems.slice(0, 5).map((p) => {
            const pos = ganttOffset(p, weeks);
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium">{p.code ?? p.name}</span>
                  <span className="text-ink/45">{formatPromoShortDate(p.endsAt)}</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-[#FCE9F4]">
                  <div
                    className="absolute h-full rounded-full bg-primary"
                    style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <footer className="space-y-1 pb-4 text-center text-[11px] text-ink/45">
        <p className="flex items-center justify-center gap-1">
          <Lock size={12} />
          Une remise à la fois au POS
        </p>
        <p>Les totaux viennent des usages et factures, pas d’une maquette.</p>
      </footer>
    </div>
  );
}

function KpiMini({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-[22px] font-bold leading-7">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink/45">{hint}</p>
    </div>
  );
}
