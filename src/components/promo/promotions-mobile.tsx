"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BadgePercent,
  Bot,
  CalendarDays,
  Copy,
  Gift,
  Percent,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  type PromoSimulation,
  type PromoTab,
  discountLabel,
  fillRatio,
  perimeterLabel,
  promoShortId,
  statusChip,
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
  onDeploy: () => void;
  canPos: boolean;
  canAgenda: boolean;
  sim: PromoSimulation | null;
  simCustomer: CustomerListItem | null;
  simLines: { name: string; price: number }[];
  onCopy: (text: string, label: string) => void;
  onToggleStatus: (p: PromotionListItem) => void;
};

const TABS: { id: PromoTab; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "codes", label: "Codes" },
  { id: "auto", label: "Paliers" },
  { id: "audit", label: "Historique" },
];

export function PromotionsMobile({
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
  onDeploy,
  canPos,
  canAgenda,
  sim,
  simCustomer,
  simLines,
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
        <section className="space-y-3 rounded-[26px] border border-[#F0E7EB] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#981C52]">
              Inspection
            </span>
            <span className="font-mono text-[11px] text-[#765E6B]">{promoShortId(selected.id)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[#F1E8EC] bg-[#FFF7FB] p-3">
            <div>
              <p className="text-[18px] font-bold text-[#30202C]">{selected.code ?? selected.name}</p>
              <p className="text-[13px] text-[#765E6B]">
                {selected.name} · {discountLabel(selected)}
              </p>
            </div>
            {selected.code ? (
              <button
                type="button"
                onClick={() => onCopy(selected.code!, "Code copié")}
                className="inline-flex h-8 items-center gap-1 rounded-xl bg-white px-2.5 text-[12px] font-semibold text-[#981C52] shadow-sm"
              >
                <Copy size={14} />
                Copier
              </button>
            ) : null}
          </div>
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", chip?.className)}>
            {chip?.label}
          </span>
          <div className="grid grid-cols-2 gap-2 text-[12px] text-ink/70">
            <div className="rounded-lg bg-[#FFF7F9] p-2">
              {selected.maxUsesPerCustomer === 1 ? "Une seule fois" : "Plusieurs fois"}
            </div>
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
          {canWrite ? (
            <button
              type="button"
              onClick={() => onToggleStatus(selected)}
              className="h-11 w-full rounded-xl bg-[#981C52] text-[13px] font-semibold text-white transition hover:bg-[#78133E]"
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
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#54112F] via-[#831D4A] to-[#B83E72] px-5 py-7 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[32px] border-white/5" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
            <BadgePercent size={13} />
            Marketing & fidélisation
          </div>
          <h1 className="text-[28px] font-bold leading-9 tracking-tight">Promotions & offres</h1>
          <p className="text-[13px] leading-relaxed text-pink-100">
            Créez des offres et suivez vos campagnes commerciales.
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <Gift size={22} className="text-pink-100" />
            <div>
              <p className="text-2xl font-extrabold">{kpis?.activeCount ?? "—"}</p>
              <p className="text-[11px] text-pink-100">Promotions actives</p>
            </div>
          </div>
          {canWrite ? (
            <div className="grid gap-2 pt-1">
              <button
                type="button"
                onClick={onAdd}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[14px] font-bold text-[#831D4A] shadow-md"
              >
                <Plus size={17} />
                Nouvelle promotion
              </button>
              <button
                type="button"
                onClick={onDeploy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 text-[14px] font-semibold text-white"
              >
                <Zap size={16} />
                Préparer une offre
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[24px] border border-[#EAD5DF] bg-gradient-to-r from-[#FFF4F8] via-white to-[#FFF8FB] p-4 text-[#382633] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#831D4A]">
            <Bot size={14} />
            Copilote
          </span>
          <Sparkles size={14} className="text-[#B83E72]" />
        </div>
        <p className="mt-2 text-[13px] leading-snug text-[#382633]">{insight.headline}</p>
        <p className="mt-2 text-[12px] text-[#765E6B]">{insight.recommendation}</p>
        <p className="mt-1.5 rounded-lg bg-white/80 px-2 py-1.5 text-[11px] text-[#765E6B]">{insight.conflict}</p>
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
        <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[#F1E8EC] bg-white p-2 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200",
                tab === t.id ? "bg-[#981C52] text-white shadow-sm" : "text-[#765E6B] hover:bg-[#FAF0F5]",
              )}
            >
              {t.label}
              <span className="ml-1 text-[11px] opacity-80">({counts[t.id]})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Promotion, code, soin…"
            className="h-11 w-full rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] pl-10 pr-4 text-[13px] outline-none transition focus:border-[#C95483] focus:ring-2 focus:ring-pink-100"
          />
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <p className="rounded-[22px] border border-[#F1E8EC] bg-white p-6 text-center text-[13px] text-[#765E6B]">
            Chargement…
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-[22px] border border-[#F1E8EC] bg-white p-6 text-center text-[13px] text-[#765E6B]">
            Aucune promotion.
          </p>
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
                className="flex w-full flex-col gap-2.5 rounded-[22px] border border-[#F1E8EC] bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E7B9CD] hover:shadow-md"
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
    <div className="flex flex-col justify-between rounded-[22px] border border-[#F1E8EC] bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E7B9CD] hover:shadow-md">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-[#765E6B]">{label}</span>
        <span className="text-[#981C52]">{icon}</span>
      </div>
      <p className="mt-2 text-[22px] font-bold leading-7 text-[#30202C]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#765E6B]">{hint}</p>
    </div>
  );
}
