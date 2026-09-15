"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Cake,
  ChevronRight,
  Gift,
  MessageCircle,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  type LoyaltyFilter,
  BIRTHDAY_BONUS_PTS,
  birthdayWhenLabel,
  birthdaysThisWeek,
  cheapestActiveReward,
  filterMembers,
  firstNameOf,
  formatPts,
  formatRelativeVisit,
  formatShortDate,
  levelRange,
  memberInitials,
  memberRef,
  nextLevelTarget,
  readyReward,
  rewardChip,
  waMeHref,
} from "@/components/loyalty/loyalty-helpers";
import { cn } from "@/lib/utils";
import { formatMad } from "@/modules/finance/service";
import { formatPoints } from "@/modules/loyalty/service";
import type {
  LoyaltyAccountSummary,
  LoyaltyBirthdayItem,
  LoyaltyKpis,
  LoyaltyLevel,
  LoyaltyProgramConfig,
  LoyaltyRewardItem,
  PackageListItem,
} from "@/types/loyalty";
import { LOYALTY_LEVEL_LABEL } from "@/types/loyalty";

type Props = {
  orgName: string;
  roleLabel: string;
  insight: { headline: string; body: string; rec: string };
  kpis: LoyaltyKpis | null;
  program: LoyaltyProgramConfig | null;
  ranking: LoyaltyAccountSummary[];
  rewards: LoyaltyRewardItem[];
  birthdays: LoyaltyBirthdayItem[];
  packages: PackageListItem[];
  search: string;
  onSearch: (v: string) => void;
  tab: LoyaltyFilter;
  onTab: (t: LoyaltyFilter) => void;
  loading: boolean;
  selected: LoyaltyAccountSummary | null;
  onSelect: (id: string) => void;
  canWrite: boolean;
  canRedeem: boolean;
  canPos: boolean;
  canCustomers: boolean;
  canWhatsapp: boolean;
  canMarketing: boolean;
  canReactivation: boolean;
  onSettings: () => void;
  onNewReward: () => void;
  onNewPackage: () => void;
  onRedeem: (member: LoyaltyAccountSummary) => void;
  onBirthdayBonus: () => void;
  birthdayBusy: boolean;
  onExport: () => void;
};

const LEVEL_TABS: { id: LoyaltyFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "VIP", label: "VIP" },
  { id: "GOLD", label: "Gold" },
  { id: "SILVER", label: "Silver" },
  { id: "BRONZE", label: "Bronze" },
  { id: "ready", label: "Prêts" },
];

export function LoyaltyMobile(props: Props) {
  const {
    orgName,
    roleLabel,
    insight,
    kpis,
    program,
    ranking,
    rewards,
    birthdays,
    packages,
    search,
    onSearch,
    tab,
    onTab,
    loading,
    selected,
    onSelect,
    canWrite,
    canRedeem,
    canPos,
    canCustomers,
    canWhatsapp,
    canMarketing,
    canReactivation,
    onSettings,
    onNewReward,
    onNewPackage,
    onRedeem,
    onBirthdayBonus,
    birthdayBusy,
    onExport,
  } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const weekBirthdays = birthdaysThisWeek(birthdays);
  const filtered = filterMembers(ranking, tab, search, rewards);
  const ratio = program?.madPerPoint ?? 1;
  const members = kpis?.membersCount ?? 0;
  const engagement = members > 0 ? Math.round(((kpis?.active30d ?? 0) / members) * 100) : 0;
  const activeRewards = rewards.filter((r) => r.active).length;
  const campaignHref = canMarketing ? "/marketing/" : canReactivation ? "/reactivation/" : "/whatsapp/";

  function openMember(id: string) {
    onSelect(id);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-3 lg:hidden">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
            {roleLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4]/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5D4200]">
            {ratio} MAD = 1 pt
          </span>
          <span className="rounded-full bg-[#FCE9F4] px-2.5 py-1 text-[11px] font-bold text-primary">
            {orgName}
          </span>
        </div>
        <h1 className="mt-2 text-[28px] font-extrabold leading-9 tracking-tight">
          Fidélité & gamification
        </h1>
        <p className="mt-1 text-[13px] text-ink/55">
          Points automatiques à l’encaissement, paliers et récompenses du salon.
        </p>
        {canWrite ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onNewReward}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-white text-[14px] font-semibold shadow-sm"
            >
              <Gift size={18} className="text-primary" />
              + Récompense
            </button>
            <Link
              href={campaignHref}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-bold text-white shadow-sm"
            >
              <Rocket size={18} />
              Campagne
            </Link>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <KpiCard label="Membres" value={String(members)} hint={`+${kpis?.membersThisMonth ?? 0} ce mois`} />
        <KpiCard
          label="Points actifs"
          value={(kpis?.pointsActive ?? 0).toLocaleString("fr-MA")}
          hint={`${(kpis?.pointsRedeemed ?? 0).toLocaleString("fr-MA")} utilisés`}
        />
        <KpiCard label="Récompenses" value={String(kpis?.rewardsUsed ?? 0)} hint={`${kpis?.rewardsReady ?? 0} prêtes`} />
        <KpiCard
          label="CA membres"
          value={kpis ? compactMad(kpis.memberRevenue) : "0"}
          hint={kpis?.memberAvgTicket ? `Panier ${formatMad(kpis.memberAvgTicket)}` : "Ce mois"}
        />
        <KpiCard
          label="Forfaits"
          value={String(kpis?.activePackages ?? packages.filter((p) => p.status === "ACTIVE").length)}
          hint="Actifs"
        />
        <KpiCard
          label="Actifs 30 j"
          value={String(kpis?.active30d ?? 0)}
          hint={members ? `${engagement} % d’engagement` : "Mouvements points"}
        />
      </section>

      <section className="rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4]/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#FFDEA4]">
            {program?.active ? "Programme actif" : "Programme inactif"}
          </span>
          <button type="button" onClick={onSettings} className="text-[12px] font-bold text-[#FFB2BD]">
            Configurer
          </button>
        </div>
        <h2 className="mt-2 text-[18px] font-bold text-white">{ratio} MAD dépensé = 1 point</h2>
        <p className="mt-1 text-[13px] text-white/70">
          Crédit automatique au POS. {activeRewards} récompense{activeRewards > 1 ? "s" : ""} active
          {activeRewards > 1 ? "s" : ""}.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-2">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#FFDEA4]">Cumul distribué</p>
            <p className="text-[15px] font-extrabold text-white">{formatPts(kpis?.pointsDistributed ?? 0)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-[#FFDEA4]">Utilisés</p>
            <p className="text-[15px] font-extrabold text-white">{formatPts(kpis?.pointsRedeemed ?? 0)}</p>
          </div>
        </div>
      </section>

      {weekBirthdays.length > 0 ? (
        <section className="rounded-xl bg-[#FCE9F4] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Cake size={18} className="text-primary" />
            <h2 className="text-[18px] font-bold">
              {weekBirthdays.length} anniversaire{weekBirthdays.length > 1 ? "s" : ""}
            </h2>
          </div>
          <div className="mt-2 space-y-2">
            {weekBirthdays.slice(0, 4).map((b) => (
              <button
                key={b.customerId}
                type="button"
                onClick={() => openMember(b.customerId)}
                className="flex w-full items-center justify-between rounded-lg bg-white/80 p-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFDEA4] text-[11px] font-bold text-[#261900]">
                    {memberInitials(b.customerName)}
                  </span>
                  <div>
                    <p className="text-[15px] font-bold leading-tight">{b.customerName}</p>
                    <p className="text-[11px] text-ink/50">
                      {birthdayWhenLabel(b.daysUntil)} · {LOYALTY_LEVEL_LABEL[b.level]} · {formatPts(b.balance)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {canWrite ? (
            <button
              type="button"
              disabled={birthdayBusy}
              onClick={onBirthdayBonus}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-[14px] font-bold text-primary shadow-sm disabled:opacity-60"
            >
              <Gift size={16} />
              Offrir +{BIRTHDAY_BONUS_PTS} pts
            </button>
          ) : null}
        </section>
      ) : null}

      {program ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[18px] font-bold">Paliers</h2>
            <span className="text-[11px] font-bold text-primary">4 niveaux</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(["BRONZE", "SILVER", "GOLD", "VIP"] as LoyaltyLevel[]).map((level) => {
              const n = kpis?.levelCounts[level] ?? 0;
              const pct = members ? Math.round((n / members) * 100) : 0;
              const dark = level === "VIP";
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onTab(level)}
                  className={cn(
                    "min-w-[220px] shrink-0 rounded-xl p-3 text-left shadow-sm",
                    dark ? "bg-ink text-white" : "bg-white",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                        dark ? "bg-[#FFDEA4] text-[#261900]" : "bg-[#FCE9F4] text-ink",
                      )}
                    >
                      {LOYALTY_LEVEL_LABEL[level]}
                    </span>
                    <span className={cn("text-[11px]", dark ? "text-[#FFDEA4]" : "text-ink/45")}>
                      {levelRange(level, program)}
                    </span>
                  </div>
                  <p className="mt-2 text-[22px] font-bold">
                    {n}{" "}
                    <span className={cn("text-[13px] font-normal", dark ? "text-white/60" : "text-ink/45")}>
                      ({pct} %)
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {selected ? (
        <FocusCard
          member={selected}
          program={program}
          rewards={rewards}
          canPos={canPos}
          canCustomers={canCustomers}
          canWhatsapp={canWhatsapp}
          canRedeem={canRedeem}
          onRedeem={() => onRedeem(selected)}
        />
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-bold">Membres</h3>
          {canCustomers ? (
            <Link href="/customers/" className="text-[12px] font-bold text-primary">
              Annuaires →
            </Link>
          ) : null}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Nom, mobile, réf…"
            className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[13px] shadow-sm outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {LEVEL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                tab === t.id ? "bg-primary text-white" : "bg-white text-ink/60",
              )}
            >
              {t.label}
              {t.id === "all" ? ` (${members})` : t.id === "ready" ? ` (${kpis?.rewardsReady ?? 0})` : ""}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">
            Aucun membre sur ce filtre.
          </div>
        ) : (
          filtered.slice(0, 20).map((m) => {
            const ready = readyReward(m, rewards);
            return (
              <button
                key={m.customerId}
                type="button"
                onClick={() => openMember(m.customerId)}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-white p-3 text-left shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FCE9F4] text-[13px] font-bold">
                    {memberInitials(m.customerName)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-bold">{m.customerName}</span>
                      <span className="shrink-0 rounded bg-[#FFEFF8] px-1.5 py-0.5 text-[10px] font-bold text-ink/60">
                        {LOYALTY_LEVEL_LABEL[m.level]}
                      </span>
                    </div>
                    <p className="truncate text-[13px] text-ink/50">
                      {ready ? ready.name : (m.lastServiceName ?? "En cours de cumul")}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[22px] font-extrabold leading-none">{m.balance.toLocaleString("fr-MA")}</p>
                  <p className="text-[11px] font-semibold text-[#7B5900]">pts</p>
                </div>
              </button>
            );
          })
        )}
      </section>

      <section className="rounded-xl bg-ink p-4 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFDEA4] text-[#261900]">
            <Sparkles size={14} />
          </span>
          <h3 className="text-[18px] font-bold">{insight.headline}</h3>
        </div>
        <p className="mt-2 text-[13px] text-white/80">{insight.body}</p>
        <p className="mt-2 rounded-lg bg-white/10 p-3 text-[13px]">{insight.rec}</p>
        <Link
          href={canReactivation ? "/reactivation/" : canWhatsapp ? "/whatsapp/" : "/ai/"}
          className="mt-3 flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold"
        >
          {canReactivation || canWhatsapp ? "Relancer les clientes" : "Copilote IA"}
        </Link>
      </section>

      {packages.length > 0 ? (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-[18px] font-bold">Forfaits séances</h3>
          <div className="mt-2 space-y-2">
            {packages.slice(0, 4).map((p) => (
              <div key={p.id} className="rounded-lg bg-[#FFEFF8] p-2 text-[13px]">
                <p className="font-bold">{p.name}</p>
                <p className="text-ink/50">
                  {p.customerName} · {p.sessionUsed}/{p.sessionTotal}
                </p>
              </div>
            ))}
          </div>
          {canWrite ? (
            <button type="button" onClick={onNewPackage} className="mt-2 text-[13px] font-bold text-primary">
              + Nouveau forfait
            </button>
          ) : null}
        </section>
      ) : canWrite ? (
        <button
          type="button"
          onClick={onNewPackage}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-white text-[13px] font-semibold shadow-sm"
        >
          + Créer un forfait séances
        </button>
      ) : null}

      <div className="flex gap-2 pb-4">
        <button
          type="button"
          onClick={onSettings}
          className="flex h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-white text-[13px] font-semibold shadow-sm"
        >
          <Settings size={16} />
          Règles
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-white text-[13px] font-semibold shadow-sm"
        >
          Exporter CSV
        </button>
      </div>

      {sheetOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40 lg:hidden" onClick={() => setSheetOpen(false)}>
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[18px] font-bold">{selected.customerName}</h3>
              <button type="button" onClick={() => setSheetOpen(false)} className="text-[13px] font-bold text-ink/50">
                Fermer
              </button>
            </div>
            <FocusCard
              member={selected}
              program={program}
              rewards={rewards}
              canPos={canPos}
              canCustomers={canCustomers}
              canWhatsapp={canWhatsapp}
              canRedeem={canRedeem}
              onRedeem={() => onRedeem(selected)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function compactMad(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(".", ",")}k DH`;
  return formatMad(n);
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[13px] text-ink/50">{hint}</p>
    </div>
  );
}

function FocusCard({
  member,
  program,
  rewards,
  canPos,
  canCustomers,
  canWhatsapp,
  canRedeem,
  onRedeem,
}: {
  member: LoyaltyAccountSummary;
  program: LoyaltyProgramConfig | null;
  rewards: LoyaltyRewardItem[];
  canPos: boolean;
  canCustomers: boolean;
  canWhatsapp: boolean;
  canRedeem: boolean;
  onRedeem: () => void;
}) {
  const next = program ? nextLevelTarget(member.lifetimePoints, program) : null;
  const ready = readyReward(member, rewards);
  const cheapest = cheapestActiveReward(rewards);
  const wa = waMeHref(
    member.phone,
    firstNameOf(member.customerName),
    `Bonjour ${firstNameOf(member.customerName)}, vos points fidélité : ${member.balance} pts (${LOYALTY_LEVEL_LABEL[member.level]}).`,
  );

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Fiche membre</p>
          <h3 className="text-[18px] font-bold">{member.customerName}</h3>
          <p className="text-[13px] text-ink/50">
            {LOYALTY_LEVEL_LABEL[member.level]} · {formatPts(member.balance)}
          </p>
        </div>
        {canCustomers ? (
          <Link href={`/customers/${member.customerId}/`} className="text-ink/40">
            <ChevronRight size={18} />
          </Link>
        ) : null}
      </div>
      {next ? (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-ink/50">{next.label ? `Vers ${next.label}` : "Palier maximal"}</span>
            <span className="text-primary">{next.progress} %</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#FCE9F4]">
            <div className="h-full rounded-full bg-primary" style={{ width: `${next.progress}%` }} />
          </div>
        </div>
      ) : null}
      {ready ? (
        <div className="mt-3 rounded-lg bg-[#FFEFF8] p-3">
          <p className="text-[13px] font-bold">{ready.name}</p>
          <p className="text-[12px] text-ink/50">
            {rewardChip(ready)} · {formatPoints(ready.pointsCost)} · {memberRef(member.customerName, member.customerId)}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-ink/50">
          {cheapest
            ? `Encore ${Math.max(0, cheapest.pointsCost - member.balance)} pts pour « ${cheapest.name} ».`
            : "Aucune récompense active."}
        </p>
      )}
      <p className="mt-2 text-[12px] text-ink/45">
        {member.lastServiceName
          ? `${member.lastServiceName} · ${formatRelativeVisit(member.lastVisitAt)}`
          : formatRelativeVisit(member.lastVisitAt)}
        {member.memberSince ? ` · depuis ${formatShortDate(member.memberSince)}` : ""}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {canPos ? (
          <Link
            href={`/pos/?customerId=${member.customerId}`}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold text-white"
          >
            <Wallet size={18} />
            Ouvrir au POS
          </Link>
        ) : null}
        {canRedeem && ready ? (
          <button
            type="button"
            onClick={onRedeem}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FCE9F4] text-[14px] font-semibold"
          >
            Utiliser {ready.name}
          </button>
        ) : null}
        {canWhatsapp && wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FFEFF8] text-[14px] font-semibold"
          >
            <MessageCircle size={16} className="text-[#7B5900]" />
            WhatsApp
          </a>
        ) : null}
      </div>
    </section>
  );
}
