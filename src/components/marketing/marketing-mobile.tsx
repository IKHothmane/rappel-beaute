"use client";

import Link from "next/link";
import {
  Calendar,
  MessageCircle,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  type CampaignTab,
  CAMPAIGN_CHANNEL_LABEL,
  CAMPAIGN_STATUS_LABEL,
  attributionShares,
  campaignConvLabel,
  conciergeTasks,
  customerSegments,
  filterCampaigns,
  initials,
  marketingInsight,
  marketingOpportunities,
  statusDot,
} from "@/components/marketing/marketing-helpers";
import { cn } from "@/lib/utils";
import { formatMad } from "@/modules/marketing/service";
import type { CampaignKpis, CampaignListItem } from "@/types/campaign";
import type { CustomerKpis } from "@/types/customer";
import type { ReactivationKpis, ReactivationSettings } from "@/types/reactivation";
import type { WhatsAppTaskItem } from "@/types/whatsapp";

type Props = {
  orgName: string;
  roleLabel: string;
  kpis: CampaignKpis | null;
  items: CampaignListItem[];
  tab: CampaignTab;
  onTab: (t: CampaignTab) => void;
  loading: boolean;
  canWrite: boolean;
  canPrepare: boolean;
  canWhatsapp: boolean;
  canReactivation: boolean;
  submitting: boolean;
  onNew: () => void;
  onPrepare: (c: CampaignListItem) => void;
  onPauseToggle: (c: CampaignListItem) => void;
  reactivation: ReactivationKpis | null;
  settings: ReactivationSettings | null;
  customerKpis: CustomerKpis | null;
  waTasks: WhatsAppTaskItem[];
  promoCode: string | null;
  selectedWaId: string | null;
  onSelectWa: (id: string) => void;
};

export function MarketingMobile(props: Props) {
  const {
    orgName,
    roleLabel,
    kpis,
    items,
    tab,
    onTab,
    loading,
    canWrite,
    canPrepare,
    canWhatsapp,
    canReactivation,
    submitting,
    onNew,
    onPrepare,
    onPauseToggle,
    reactivation,
    settings,
    customerKpis,
    waTasks,
    promoCode,
    selectedWaId,
    onSelectWa,
  } = props;
  const filtered = filterCampaigns(items, tab, "all", "");
  const insight = marketingInsight({ kpis, reactivation, promoCode });
  const opps = marketingOpportunities({
    reactivation,
    pendingWa: kpis?.pendingMessages ?? 0,
    draftCount: kpis?.draftCampaigns ?? 0,
    vipInactive: reactivation?.vipInactiveCount ?? 0,
  });
  const concierge = conciergeTasks(waTasks);
  const selected = concierge.find((t) => t.id === selectedWaId) ?? concierge[0] ?? null;
  const segs = customerSegments(customerKpis, reactivation);
  const attr = attributionShares(items);
  const conv =
    (kpis?.targetedCustomers ?? 0) > 0
      ? Math.round(((kpis?.sentMessages ?? 0) / kpis!.targetedCustomers) * 1000) / 10
      : null;

  return (
    <div className="space-y-4 lg:hidden">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Croissance & fidélisation</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
            {roleLabel}
          </span>
          <span className="rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[10px] font-bold text-ink/60">{orgName}</span>
        </div>
        <h1 className="mt-2 text-[22px] font-bold tracking-tight">Marketing & campagnes</h1>
        <p className="mt-1 text-[13px] text-ink/55">
          Audience opt-in, préparation WhatsApp, CA rattaché aux promos en caisse.
        </p>
        <div className="mt-3 flex gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={onNew}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-bold text-white shadow-sm"
            >
              <Plus size={18} />
              Nouvelle campagne
            </button>
          ) : null}
          <Link href="/agenda/" className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm" aria-label="Agenda">
            <Calendar size={18} className="text-ink/50" />
          </Link>
          {canReactivation ? (
            <Link href="/reactivation/" className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm" aria-label="Réactivation">
              <Settings size={18} className="text-ink/50" />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-white shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">Lecture des files</p>
        <div className="mt-2 flex items-baseline gap-2">
          {insight.amount != null && insight.amount > 0 ? (
            <span className="text-[22px] font-bold text-[#FFDEA4]">{formatMad(insight.amount)}</span>
          ) : null}
          <span className="text-[12px] text-white/60">{insight.title}</span>
        </div>
        <p className="mt-2 text-[13px] text-white/85">{insight.body}</p>
        {canWrite ? (
          <button
            type="button"
            onClick={onNew}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FFDEA4] text-[14px] font-bold text-[#261900]"
          >
            <Sparkles size={16} />
            {insight.cta}
          </button>
        ) : canWhatsapp ? (
          <Link
            href="/whatsapp/"
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FFDEA4] text-[14px] font-bold text-[#261900]"
          >
            {insight.cta}
          </Link>
        ) : null}
        {opps.length > 0 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {opps.map((o) => (
              <Link key={o.label} href={o.href} className="min-w-[210px] shrink-0 rounded-lg bg-white/10 p-2">
                <p className="text-[11px] font-bold text-[#FFDEA4]">{o.label}</p>
                <p className="mt-1 text-[12px] text-white/75">{o.body}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-[18px] font-bold">Performance</h2>
        <div className="grid grid-cols-2 gap-2">
          <KpiCard
            label="Campagnes"
            value={`${kpis?.activeCampaigns ?? 0} / ${kpis?.totalCampaigns ?? 0}`}
            hint={`${kpis?.draftCampaigns ?? 0} brouillon${(kpis?.draftCampaigns ?? 0) > 1 ? "s" : ""}`}
          />
          <KpiCard label="Audience" value={String(kpis?.targetedCustomers ?? 0)} hint="Actives + terminées" />
          <KpiCard label="Envoyés" value={String(kpis?.sentMessages ?? 0)} hint={`${kpis?.pendingMessages ?? 0} à valider`} />
          <KpiCard label="CA attribué" value={formatMad(kpis?.attributedRevenue ?? 0)} hint="Factures promo liées" />
          <KpiCard label="À relancer" value={String(reactivation?.toRelance ?? "—")} hint="File réactivation" />
          <KpiCard label="Conv. envoi" value={conv == null ? "—" : `${conv} %`} hint="Envoyés / audience" />
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(
          [
            ["all", `Toutes (${kpis?.totalCampaigns ?? 0})`],
            ["ACTIVE", `Actives (${kpis?.activeCampaigns ?? 0})`],
            ["DRAFT", `Brouillons (${kpis?.draftCampaigns ?? 0})`],
            ["whatsapp", `WhatsApp (${kpis?.pendingMessages ?? 0})`],
          ] as [CampaignTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold",
              tab === id ? "bg-primary text-white" : "bg-white text-ink/50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="space-y-2">
        <h3 className="text-[18px] font-bold">Campagnes</h3>
        {loading ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-ink/50">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-ink/50">Aucune campagne sur ce filtre.</p>
        ) : (
          filtered.map((c) => (
            <article key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/marketing/${c.id}`} className="text-[16px] font-bold hover:text-primary">
                    {c.name}
                  </Link>
                  <p className="text-[12px] text-ink/45">
                    {CAMPAIGN_CHANNEL_LABEL[c.channel]} · {c.audienceCount} cibles
                    {c.promotionCode ? ` · ${c.promotionCode}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEFF8] px-2 py-0.5 text-[10px] font-bold">
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(c.status))} />
                  {CAMPAIGN_STATUS_LABEL[c.status]}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-[#FFEFF8]/80 p-2 text-[12px]">
                <div>
                  <p className="text-[10px] uppercase text-ink/40">Envoyés</p>
                  <p className="font-bold">{c.sentCount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-ink/40">CA</p>
                  <p className="font-bold text-primary">{formatMad(c.attributedRevenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-ink/40">Conv.</p>
                  <p className="font-bold">{campaignConvLabel(c)}</p>
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                {canPrepare && c.status === "DRAFT" ? (
                  <button type="button" disabled={submitting} onClick={() => onPrepare(c)} className="h-8 rounded bg-[#FCE9F4] px-3 text-[11px] font-bold">
                    Préparer
                  </button>
                ) : null}
                {canWrite && (c.status === "ACTIVE" || c.status === "PAUSED") ? (
                  <button type="button" disabled={submitting} onClick={() => onPauseToggle(c)} className="h-8 rounded bg-[#FFEFF8] px-3 text-[11px] font-bold">
                    {c.status === "ACTIVE" ? "Pause" : "Reprendre"}
                  </button>
                ) : null}
                <Link href={`/marketing/${c.id}`} className="h-8 rounded bg-primary px-3 text-[11px] font-bold leading-8 text-white">
                  Détails
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      {concierge.length > 0 && canWhatsapp ? (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-bold">Conciergerie WhatsApp</h3>
            <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[10px] font-bold">{concierge.length} en attente</span>
          </div>
          <p className="mt-1 text-[12px] text-ink/50">Envoi manuel, un message à la fois. Opt-in requis.</p>
          <div className="mt-3 space-y-2">
            {concierge.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2">
                <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={() => onSelectWa(t.id)}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold">
                    {initials(t.customerName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold">{t.customerName}</p>
                    <p className="truncate text-[11px] text-ink/45">{t.phoneSnapshot}</p>
                  </div>
                </button>
                <a href={t.waLink} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded bg-ink px-3 text-[11px] font-bold text-[#FFDEA4]">
                  <MessageCircle size={12} />
                  WhatsApp
                </a>
              </div>
            ))}
          </div>
          {selected ? (
            <div className="mt-3 rounded-lg bg-[#FCE9F4] p-3">
              <p className="text-[10px] font-bold uppercase text-ink/40">Aperçu · {selected.customerName}</p>
              <p className="mt-1 whitespace-pre-wrap text-[12px] italic">{selected.messageSnapshot}</p>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" className="h-8 rounded bg-white px-3 text-[11px] font-bold" onClick={() => navigator.clipboard.writeText(selected.messageSnapshot)}>
                  Copier
                </button>
                <a href={selected.waLink} target="_blank" rel="noreferrer" className="h-8 rounded bg-primary px-3 text-[11px] font-bold leading-8 text-white">
                  Ouvrir
                </a>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-[18px] font-bold">Attribution & segments</h3>
        <p className="text-[13px] text-ink/50">CA des factures liées à une promo de campagne, après préparation.</p>
        {attr.total > 0 ? (
          <div className="mt-3 space-y-1 text-[12px]">
            {attr.rows.slice(0, 4).map((r) => (
              <div key={r.id} className="flex justify-between">
                <span className="truncate pr-2">{r.name}</span>
                <span className="font-bold">{formatMad(r.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink/45">Pas encore de CA rattaché.</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {segs.map((s) => (
            <div key={s.label} className="rounded-lg bg-[#FFEFF8] p-2">
              <p className="text-[10px] uppercase text-ink/40">{s.label}</p>
              <p className="text-[18px] font-bold">{s.count}</p>
              <p className="text-[10px] text-ink/45">{s.hint}</p>
            </div>
          ))}
        </div>
        {settings ? (
          <p className="mt-3 rounded-lg bg-[#FFEFF8] p-2 text-[11px] text-ink/55">
            Délai mini entre messages marketing : <strong>{settings.minimumDaysBetweenMarketingMessages} j</strong>. Mot-clé STOP côté WhatsApp.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-ink/50">{hint}</p>
    </div>
  );
}
