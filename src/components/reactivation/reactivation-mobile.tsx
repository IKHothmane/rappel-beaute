"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarPlus,
  ChevronRight,
  Download,
  Flame,
  MessageCircle,
  Pause,
  Rocket,
  Search,
  SlidersHorizontal,
  Target,
  Users,
  Zap,
} from "lucide-react";
import {
  type AbsenceSegment,
  type ReactivationTab,
  crmChip,
  fullName,
  initials,
  reactivationInsight,
  statusLabel,
  waMeLink,
} from "@/components/reactivation/reactivation-helpers";
import { cn } from "@/lib/utils";
import { formatLastVisit, formatMad } from "@/modules/reactivation/service";
import type { ReactivationCustomerItem, ReactivationKpis } from "@/types/reactivation";
import type { CampaignListItem } from "@/types/campaign";

type Props = {
  orgName: string;
  kpis: ReactivationKpis | null;
  segments: { watch: number; relance: number; inactive: number; dormant: number };
  insight: string;
  search: string;
  onSearch: (v: string) => void;
  tab: ReactivationTab;
  onTab: (t: ReactivationTab) => void;
  segment: AbsenceSegment;
  onSegment: (s: AbsenceSegment) => void;
  tabCounts: { all: number; ready: number; vip: number; spend: number; first: number };
  loading: boolean;
  rows: ReactivationCustomerItem[];
  todayReady: ReactivationCustomerItem[];
  todayPotential: number;
  selected: ReactivationCustomerItem | null;
  onSelect: (id: string) => void;
  canSend: boolean;
  canConfigure: boolean;
  canCustomers: boolean;
  canAgenda: boolean;
  canWhatsapp: boolean;
  canMarketing: boolean;
  canPromotions: boolean;
  submitting: boolean;
  preview: { customerId: string; message: string; waLink: string } | null;
  campaigns: CampaignListItem[];
  campaignRevenue: number | null;
  onSettings: () => void;
  onExport: () => void;
  onPrepare: (c: ReactivationCustomerItem) => void;
  onSnooze: (id: string) => void;
  onStartSession: () => void;
};

const TABS: { id: ReactivationTab; label: (n: number) => string }[] = [
  { id: "ready", label: (n) => `À relancer (${n})` },
  { id: "all", label: (n) => `Toutes (${n})` },
  { id: "vip", label: (n) => `VIP (${n})` },
  { id: "spend", label: (n) => `Gros panier (${n})` },
  { id: "first", label: (n) => `1re visite (${n})` },
];

export function ReactivationMobile({
  orgName,
  kpis,
  segments,
  insight,
  search,
  onSearch,
  tab,
  onTab,
  segment,
  onSegment,
  tabCounts,
  loading,
  rows,
  todayReady,
  todayPotential,
  selected,
  onSelect,
  canSend,
  canConfigure,
  canCustomers,
  canAgenda,
  canWhatsapp,
  canMarketing,
  canPromotions,
  submitting,
  preview,
  campaigns,
  campaignRevenue,
  onSettings,
  onExport,
  onPrepare,
  onSnooze,
  onStartSession,
}: Props) {
  const [view, setView] = useState<"list" | "focus">("list");
  const insightText = kpis ? reactivationInsight(kpis) : insight;

  if (view === "focus" && selected) {
    return (
      <FocusCard
        orgName={orgName}
        customer={selected}
        preview={preview?.customerId === selected.id ? preview : null}
        canSend={canSend}
        canCustomers={canCustomers}
        canAgenda={canAgenda}
        canWhatsapp={canWhatsapp}
        canPromotions={canPromotions}
        submitting={submitting}
        onBack={() => setView("list")}
        onPrepare={onPrepare}
        onSnooze={onSnooze}
      />
    );
  }

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4]/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5D4200]">
            Relances
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            {orgName || "Salon"}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[28px] font-bold leading-9 tracking-tight">Réactivation clientes</h1>
            <p className="text-[13px] text-ink/55">Relances selon l’absence réelle — sans inventer de volumes.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canConfigure ? (
              <button
                type="button"
                aria-label="Configurer les seuils"
                onClick={onSettings}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCE9F4]"
              >
                <SlidersHorizontal size={18} />
              </button>
            ) : null}
            {canMarketing ? (
              <Link
                href="/marketing/"
                className="flex h-10 items-center gap-1 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white"
              >
                <Rocket size={16} />
                Campagne
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-xl bg-[#382D36] p-4 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#FFDEA4]">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#FCCA66]" />
            À faire aujourd’hui
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[#FFDEA4]">
            {todayReady.length
              ? `Potentiel ${formatMad(todayPotential)}`
              : "Aucune relance prête"}
          </span>
        </div>
        <h2 className="mt-2 text-[18px] font-semibold leading-6">
          {todayReady.length} cliente{todayReady.length > 1 ? "s" : ""} prête
          {todayReady.length > 1 ? "s" : ""} à relancer
        </h2>
        <p className="mt-1 text-[13px] text-white/75">{insightText}</p>
        {todayReady.length > 0 && canSend ? (
          <button
            type="button"
            onClick={() => {
              onStartSession();
              setView("focus");
            }}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white"
          >
            <Zap size={18} />
            Commencer la session ({Math.min(12, todayReady.length)})
          </button>
        ) : null}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <KpiMini label="Vivier inactif" value={kpis?.inactiveCount ?? "—"} hint="≥ 30 j" />
        <KpiMini
          label="À relancer"
          value={kpis?.toRelance ?? "—"}
          hint="Hors pause"
          accent
        />
        <KpiMini label="Contactées" value={kpis?.contactedCount ?? "—"} hint="Message envoyé" />
        <KpiMini label="Revenues" value={kpis?.returnedCount ?? "—"} hint="Après relance" />
        <KpiMini
          label="Conversion"
          value={kpis?.conversionPct == null ? "—" : `${kpis.conversionPct} %`}
          hint="Revenues / contactées"
        />
        <KpiMini
          label="CA récupéré"
          value={kpis ? formatMad(kpis.recoveredRevenue) : "—"}
          hint="RDV facturés après envoi"
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold">Absence</h2>
          <button type="button" onClick={onExport} className="text-[12px] font-semibold text-primary">
            <Download size={12} className="mr-1 inline" />
            CSV
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <SegChip
            active={segment === "watch"}
            onClick={() => onSegment(segment === "watch" ? "all" : "watch")}
            label="30–60 j"
            count={segments.watch}
          />
          <SegChip
            active={segment === "relance"}
            onClick={() => onSegment(segment === "relance" ? "all" : "relance")}
            label="60–90 j"
            count={segments.relance}
            accent
          />
          <SegChip
            active={segment === "inactive"}
            onClick={() => onSegment(segment === "inactive" ? "all" : "inactive")}
            label="90–180 j"
            count={segments.inactive}
          />
          <SegChip
            active={segment === "dormant"}
            onClick={() => onSegment(segment === "dormant" ? "all" : "dormant")}
            label="+180 j"
            count={segments.dormant}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                tab === t.id ? "bg-primary text-white" : "bg-[#FCE9F4] text-ink/70",
              )}
            >
              {t.label(tabCounts[t.id])}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cliente, téléphone, rituel…"
            className="h-11 w-full rounded-xl bg-[#FFEFF8] pl-9 pr-3 text-[13px] outline-none"
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold">Dossiers</h2>
          <span className="text-[12px] text-ink/45">{rows.length} affichée{rows.length > 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <p className="text-[13px] text-ink/45">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-[13px] text-ink/50 shadow-sm">
            Aucune cliente dans ce filtre. Les compteurs globaux portent sur tout le vivier (≥ 30 j), la liste est limitée à 200 dossiers.
          </p>
        ) : (
          rows.slice(0, 24).map((c) => {
            const chip = crmChip(c);
            const vip = statusLabel(c.status);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c.id);
                  setView("focus");
                }}
                className="flex w-full flex-col gap-2 rounded-xl bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFB2BD] text-[13px] font-bold text-[#400014]">
                      {initials(c)}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[16px] font-semibold">{fullName(c)}</span>
                        {vip ? (
                          <span className="rounded-full bg-[#382D36] px-2 py-0.5 text-[10px] font-bold text-[#FFDEA4]">
                            {vip}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[12px] text-ink/55">
                        {c.daysSinceLastVisit} j · {formatMad(c.totalRevenue)} · {c.visits} visite
                        {c.visits > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
                    {chip.label}
                  </span>
                </div>
                <p className="text-[13px] text-ink/70">
                  {c.lastServiceName ?? "Dernier rituel inconnu"}
                  {c.lastStaffName ? ` · ${c.lastStaffName}` : ""}
                </p>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                  Ouvrir la fiche
                  <ChevronRight size={14} />
                </span>
              </button>
            );
          })
        )}
      </section>

      <section className="space-y-3 rounded-xl bg-[#382D36] p-4 text-white">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-[#FFDEA4]" />
          <div>
            <p className="text-[16px] font-semibold">Entonnoir réel</p>
            <p className="text-[12px] text-white/65">Inactives → contactées → revenues</p>
          </div>
        </div>
        <div className="flex justify-between text-[12px] text-white/80">
          <span>{kpis?.inactiveCount ?? 0} inactives</span>
          <span>{kpis?.contactedCount ?? 0} contactées</span>
          <span className="font-bold text-[#FFB2BD]">{kpis?.returnedCount ?? 0} revenues</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[#FFDEA4]" style={{ width: "50%" }} />
          <div className="h-full bg-[#FFB2BD]" style={{ width: "30%" }} />
          <div className="h-full bg-primary" style={{ width: "20%" }} />
        </div>
        <p className="text-[12px] text-white/65">
          {kpis?.conversionPct == null
            ? "Taux indisponible tant qu’aucune relance n’a été envoyée."
            : `Taux de retour ${kpis.conversionPct} % · ${formatMad(kpis.recoveredRevenue)} attribués`}
        </p>
        {campaigns[0] ? (
          <p className="text-[12px] text-white/70">
            Campagne récente : {campaigns[0].name} · {campaigns[0].sentCount} envoyé
            {campaigns[0].sentCount > 1 ? "s" : ""}
            {campaignRevenue && campaignRevenue > 0 ? ` · CA global attribué ${formatMad(campaignRevenue)}` : ""}
          </p>
        ) : (
          <p className="text-[12px] text-white/55">Aucune campagne marketing enregistrée.</p>
        )}
        {canMarketing ? (
          <Link
            href="/marketing/"
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#FFDEA4] text-[14px] font-bold text-[#261900]"
          >
            Ouvrir les campagnes
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function FocusCard({
  orgName,
  customer,
  preview,
  canSend,
  canCustomers,
  canAgenda,
  canWhatsapp,
  canPromotions,
  submitting,
  onBack,
  onPrepare,
  onSnooze,
}: {
  orgName: string;
  customer: ReactivationCustomerItem;
  preview: { message: string; waLink: string } | null;
  canSend: boolean;
  canCustomers: boolean;
  canAgenda: boolean;
  canWhatsapp: boolean;
  canPromotions: boolean;
  submitting: boolean;
  onBack: () => void;
  onPrepare: (c: ReactivationCustomerItem) => void;
  onSnooze: (id: string) => void;
}) {
  const chip = crmChip(customer);
  const vip = statusLabel(customer.status);
  const wa = waMeLink(customer.phone, customer.marketingWhatsapp);
  const href = preview?.waLink || wa;

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <button type="button" className="text-[13px] font-semibold text-primary" onClick={onBack}>
        ← Liste
      </button>
      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFB2BD] text-[14px] font-bold text-[#400014]">
              {initials(customer)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-[18px] font-bold">{fullName(customer)}</h2>
                {vip ? (
                  <span className="rounded-full bg-[#382D36] px-2 py-0.5 text-[10px] font-bold text-[#FFDEA4]">
                    {vip}
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] text-ink/55">{customer.phone || "Téléphone non renseigné"}</p>
            </div>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
            {chip.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#FFEFF8] p-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Absence</p>
            <p className="text-[18px] font-bold text-primary">{customer.daysSinceLastVisit} j</p>
            <p className="text-[11px] text-ink/50">{formatLastVisit(customer.lastVisitAt)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Valeur</p>
            <p className="text-[18px] font-bold">{formatMad(customer.totalRevenue)}</p>
            <p className="text-[11px] text-ink/50">
              {customer.visits} vis. · panier {formatMad(customer.averageTicket)}
            </p>
          </div>
        </div>
        <p className="rounded-lg bg-[#FCE9F4] px-3 py-2 text-[13px]">
          {customer.lastServiceName ?? "Rituel inconnu"}
          {customer.lastStaffName ? ` · ${customer.lastStaffName}` : ""}
        </p>
        {customer.suggestedPromoCode ? (
          <p className="text-[13px] text-primary">
            Offre réglée : {customer.suggestedPromoDiscount ?? ""} — code {customer.suggestedPromoCode}
          </p>
        ) : null}
        {customer.blockReason ? <p className="text-[12px] text-ink/45">{customer.blockReason}</p> : null}

        {preview ? (
          <p className="rounded-lg bg-[#FFEFF8] p-3 text-[13px] italic text-ink/80">{preview.message}</p>
        ) : (
          <p className="text-[12px] text-ink/45">
            Le texte WhatsApp est généré à partir du modèle réel — préparez-le d’abord.
          </p>
        )}

        <div className="grid grid-cols-1 gap-2">
          {canSend ? (
            <button
              type="button"
              disabled={submitting || (!customer.canPrepareWhatsApp && !customer.pendingWhatsAppTaskId)}
              onClick={() => onPrepare(customer)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#382D36] text-[13px] font-semibold text-[#FFDEA4] disabled:opacity-40"
            >
              <MessageCircle size={16} />
              {customer.pendingWhatsAppTaskId ? "Rouvrir le message" : "Préparer WhatsApp"}
            </button>
          ) : null}
          {href && customer.marketingWhatsapp ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-semibold text-white"
            >
              Ouvrir WhatsApp
            </a>
          ) : null}
          {canAgenda ? (
            <Link
              href="/agenda/"
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#F6E3EF] text-[13px] font-semibold"
            >
              <CalendarPlus size={16} />
              Aller à l’agenda
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canCustomers ? (
            <Link href={`/customers/${customer.id}/`} className="text-[12px] font-semibold text-primary">
              Fiche cliente
            </Link>
          ) : null}
          {canWhatsapp && customer.pendingWhatsAppTaskId ? (
            <Link href="/whatsapp/" className="text-[12px] font-semibold text-primary">
              File WhatsApp
            </Link>
          ) : null}
          {canPromotions && customer.suggestedPromoCode ? (
            <Link
              href={`/promotions/?suggestCode=${encodeURIComponent(customer.suggestedPromoCode)}&customerId=${customer.id}`}
              className="text-[12px] font-semibold text-primary"
            >
              Promotion
            </Link>
          ) : null}
          {canSend ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => onSnooze(customer.id)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink/50"
            >
              <Pause size={12} />
              Ignorer 30 j
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-ink/40">
          {orgName} · opt-in WhatsApp {customer.marketingWhatsapp ? "actif" : "absent"}
        </p>
      </section>
    </div>
  );
}

function KpiMini({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl p-3", accent ? "bg-[#FCE9F4]" : "bg-[#FFEFF8]")}>
      <div className="mb-1 flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-semibold">{label}</span>
        {accent ? <Flame size={14} className="text-primary" /> : <Users size={14} />}
      </div>
      <p className={cn("text-[22px] font-semibold leading-7", accent && "text-primary")}>{value}</p>
      <p className="text-[11px] text-ink/50">{hint}</p>
    </div>
  );
}

function SegChip({
  active,
  onClick,
  label,
  count,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-xl px-3 py-2 text-left",
        active || accent ? "bg-[#F6E3EF]" : "bg-[#FFEFF8]",
      )}
    >
      <p className={cn("text-[11px] font-semibold", (active || accent) && "text-primary")}>{label}</p>
      <p className={cn("text-[18px] font-semibold leading-6", (active || accent) && "text-primary")}>
        {count}
      </p>
    </button>
  );
}
