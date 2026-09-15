"use client";

/** Page fidélité prestige — desktop + mobile. */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Cake,
  Download,
  Gift,
  MessageCircle,
  Rocket,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type LoyaltyFilter,
  BIRTHDAY_BONUS_PTS,
  birthdayWhenLabel,
  birthdaysThisWeek,
  cheapestActiveReward,
  EMPTY_LOYALTY_KPIS,
  exportLoyaltyCsv,
  filterMembers,
  firstNameOf,
  formatJournalStamp,
  formatPts,
  formatRelativeVisit,
  formatShortDate,
  journalKind,
  levelRange,
  loyaltyInsight,
  memberInitials,
  memberRef,
  nextLevelTarget,
  posSimulation,
  readyReward,
  rewardChip,
  waMeHref,
} from "@/components/loyalty/loyalty-helpers";
import { LoyaltyMobile } from "@/components/loyalty/loyalty-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canRedeemLoyalty, canWriteLoyalty } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listCustomers } from "@/modules/customers/service";
import { formatMad } from "@/modules/finance/service";
import {
  adjustPoints,
  createPackage,
  createReward,
  formatPoints,
  getLoyaltyDashboard,
  listPackages,
  redeemReward,
  updateProgram,
} from "@/modules/loyalty/service";
import { listServices } from "@/modules/services/service";
import type {
  LoyaltyAccountSummary,
  LoyaltyBirthdayItem,
  LoyaltyJournalItem,
  LoyaltyKpis,
  LoyaltyLevel,
  LoyaltyProgramConfig,
  LoyaltyRewardItem,
  PackageListItem,
} from "@/types/loyalty";
import { LOYALTY_LEVEL_LABEL } from "@/types/loyalty";

const LEVEL_TABS: { id: LoyaltyFilter; label: (k: LoyaltyKpis) => string }[] = [
  { id: "all", label: (k) => `Tous (${k.membersCount})` },
  { id: "VIP", label: (k) => `VIP (${k.levelCounts.VIP})` },
  { id: "GOLD", label: (k) => `Gold (${k.levelCounts.GOLD})` },
  { id: "SILVER", label: (k) => `Silver (${k.levelCounts.SILVER})` },
  { id: "BRONZE", label: (k) => `Bronze (${k.levelCounts.BRONZE})` },
  { id: "ready", label: (k) => `Prêts (${k.rewardsReady})` },
];

export function LoyaltyPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const searchParams = useSearchParams();
  const canWrite = canWriteLoyalty(user.role);
  const canRedeem = canRedeemLoyalty(user.role);
  const canPos = canAccessNav(user.role, "pos");
  const canCustomers = canAccessNav(user.role, "customers");
  const canWhatsapp = canAccessNav(user.role, "whatsapp");
  const canMarketing = canAccessNav(user.role, "marketing");
  const canReactivation = canAccessNav(user.role, "reactivation");

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<LoyaltyKpis | null>(null);
  const [ranking, setRanking] = useState<LoyaltyAccountSummary[]>([]);
  const [rewards, setRewards] = useState<LoyaltyRewardItem[]>([]);
  const [program, setProgram] = useState<LoyaltyProgramConfig | null>(null);
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [journal, setJournal] = useState<LoyaltyJournalItem[]>([]);
  const [birthdays, setBirthdays] = useState<LoyaltyBirthdayItem[]>([]);
  const [tab, setTab] = useState<LoyaltyFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [redeemMember, setRedeemMember] = useState<LoyaltyAccountSummary | null>(null);
  const [redeemRewardId, setRedeemRewardId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [birthdayBusy, setBirthdayBusy] = useState(false);

  const [madPerPoint, setMadPerPoint] = useState("1");
  const [bronzeMin, setBronzeMin] = useState("0");
  const [silverMin, setSilverMin] = useState("1000");
  const [goldMin, setGoldMin] = useState("3000");
  const [vipMin, setVipMin] = useState("6000");
  const [programActive, setProgramActive] = useState(true);

  const [rewardName, setRewardName] = useState("");
  const [rewardCost, setRewardCost] = useState("500");
  const [rewardType, setRewardType] = useState("DISCOUNT_FIXED");
  const [rewardValue, setRewardValue] = useState("50");

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [pkgCustomerId, setPkgCustomerId] = useState("");
  const [pkgServiceId, setPkgServiceId] = useState("");
  const [pkgName, setPkgName] = useState("");
  const [pkgSessions, setPkgSessions] = useState("6");
  const [pkgPrice, setPkgPrice] = useState("2400");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const [dash, pkgs] = await Promise.all([getLoyaltyDashboard(), listPackages()]);
      setKpis(dash.kpis);
      setRanking(
        dash.ranking.map((r) => ({
          ...r,
          level: r.level as LoyaltyLevel,
        })),
      );
      setRewards(dash.rewards);
      setProgram(dash.program);
      setJournal(dash.journal ?? []);
      setBirthdays(dash.birthdays ?? []);
      setMadPerPoint(String(dash.program.madPerPoint));
      setBronzeMin(String(dash.program.bronzeMin));
      setSilverMin(String(dash.program.silverMin));
      setGoldMin(String(dash.program.goldMin));
      setVipMin(String(dash.program.vipMin));
      setProgramActive(dash.program.active);
      setPackages(pkgs);
    } catch {
      toast("Impossible de charger la fidélité.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!canWrite) return;
    listCustomers({ limit: 100 })
      .then((r) =>
        setCustomers(r.data.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))),
      )
      .catch(() => undefined);
    listServices({ limit: 100, active: true })
      .then((r) => setServices(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, [canWrite]);

  useEffect(() => {
    setPage(0);
  }, [tab, search]);

  const filtered = useMemo(
    () => filterMembers(ranking, tab, search, rewards),
    [ranking, tab, search, rewards],
  );
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const selected =
    (selectedId ? filtered.find((m) => m.customerId === selectedId) ?? ranking.find((m) => m.customerId === selectedId) : undefined) ??
    filtered[0] ??
    null;

  useEffect(() => {
    const fromUrl = searchParams.get("customerId");
    if (fromUrl) setSelectedId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.customerId);
  }, [selected, selectedId]);

  const insight = useMemo(() => loyaltyInsight(kpis, ranking, program), [kpis, ranking, program]);
  const weekBirthdays = useMemo(() => birthdaysThisWeek(birthdays), [birthdays]);
  const kpiSafe = kpis ?? EMPTY_LOYALTY_KPIS;
  const ratio = program?.madPerPoint ?? 1;
  const engagement =
    kpiSafe.membersCount > 0 ? Math.round((kpiSafe.active30d / kpiSafe.membersCount) * 100) : 0;
  const campaignHref = canMarketing ? "/marketing/" : canReactivation ? "/reactivation/" : "/whatsapp/";

  async function saveProgram() {
    setSubmitting(true);
    const result = await updateProgram({
      madPerPoint: Number(madPerPoint),
      bronzeMin: Number(bronzeMin),
      silverMin: Number(silverMin),
      goldMin: Number(goldMin),
      vipMin: Number(vipMin),
      active: programActive,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setProgram(result.program);
    setSettingsOpen(false);
    toast("Programme enregistré.", "success");
    refresh();
  }

  async function saveReward() {
    setSubmitting(true);
    const result = await createReward({
      name: rewardName,
      pointsCost: Number(rewardCost),
      type: rewardType as "DISCOUNT_FIXED" | "DISCOUNT_PERCENT" | "FREE_SERVICE",
      value: Number(rewardValue) || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setRewardOpen(false);
    setRewardName("");
    toast("Récompense créée.", "success");
    refresh();
  }

  async function savePackage() {
    setSubmitting(true);
    const result = await createPackage({
      customerId: pkgCustomerId,
      serviceId: pkgServiceId,
      name: pkgName || `Forfait ${services.find((s) => s.id === pkgServiceId)?.name ?? ""}`,
      sessionTotal: Number(pkgSessions),
      pricePaid: Number(pkgPrice),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setPkgOpen(false);
    toast("Forfait créé.", "success");
    refresh();
  }

  async function handleRedeem() {
    if (!redeemMember || !redeemRewardId) return;
    setSubmitting(true);
    const result = await redeemReward({
      customerId: redeemMember.customerId,
      rewardId: redeemRewardId,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setRedeemMember(null);
    toast("Récompense utilisée (ledger).", "success");
    refresh();
  }

  async function handleBirthdayBonus() {
    if (!canWrite || weekBirthdays.length === 0) return;
    setBirthdayBusy(true);
    let ok = 0;
    for (const b of weekBirthdays) {
      const result = await adjustPoints(
        b.customerId,
        BIRTHDAY_BONUS_PTS,
        "Bonus anniversaire",
      );
      if (result.ok) ok += 1;
    }
    setBirthdayBusy(false);
    if (ok === 0) {
      toast("Aucun bonus n’a pu être crédité.", "error");
      return;
    }
    toast(`${ok} bonus anniversaire (+${BIRTHDAY_BONUS_PTS} pts) crédité${ok > 1 ? "s" : ""}.`, "success");
    refresh();
  }

  function openRedeem(member: LoyaltyAccountSummary) {
    const ready = readyReward(member, rewards);
    setRedeemMember(member);
    setRedeemRewardId(ready?.id ?? "");
  }

  const mobileProps = {
    orgName: user.orgName,
    roleLabel: ROLE_LABEL[user.role],
    insight,
    kpis,
    program,
    ranking,
    rewards,
    birthdays,
    packages,
    search: searchInput,
    onSearch: setSearchInput,
    tab,
    onTab: setTab,
    loading,
    selected,
    onSelect: setSelectedId,
    canWrite,
    canRedeem,
    canPos,
    canCustomers,
    canWhatsapp,
    canMarketing,
    canReactivation,
    onSettings: () => setSettingsOpen(true),
    onNewReward: () => setRewardOpen(true),
    onNewPackage: () => setPkgOpen(true),
    onRedeem: openRedeem,
    onBirthdayBonus: handleBirthdayBonus,
    birthdayBusy,
    onExport: () => exportLoyaltyCsv(filtered),
  };

  return (
    <>
      <LoyaltyMobile {...mobileProps} />

      <div className="hidden space-y-4 lg:block">
        <section className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm xl:flex-row xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-ink/40">Croissance & CRM</span>
              <span className="text-[#E4BDC2]">/</span>
              <span className="text-primary">Programme fidélité</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-semibold leading-9 tracking-tight">
                Programme fidélité & gamification
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                <Shield size={12} />
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4]/40 px-2.5 py-1 text-[11px] font-bold text-[#5D4200]">
                <Star size={12} />
                {ratio} MAD = 1 pt
              </span>
              <span className="rounded-full bg-[#FCE9F4] px-2.5 py-1 text-[11px] font-bold text-ink/60">
                {user.orgName}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[13px] text-ink/55">
              Soldes réels, paliers calculés sur le cumul, récompenses utilisables au POS.
              {program && !program.active ? " Programme actuellement inactif." : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
            >
              <Settings size={16} />
              Configurer
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={() => setRewardOpen(true)}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-4 text-[14px] font-semibold"
              >
                <Gift size={16} className="text-primary" />
                + Récompense
              </button>
            ) : null}
            {canWrite || canMarketing || canWhatsapp ? (
              <Link
                href={campaignHref}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-[14px] font-bold text-white shadow-sm"
              >
                <Rocket size={16} />
                Campagne
              </Link>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Membres"
            value={String(kpiSafe.membersCount)}
            hint={`+${kpiSafe.membersThisMonth} ce mois`}
            icon={<Star size={18} className="text-primary" />}
          />
          <Kpi
            label="Points actifs"
            value={kpiSafe.pointsActive.toLocaleString("fr-MA")}
            hint={`${kpiSafe.pointsRedeemed.toLocaleString("fr-MA")} utilisés`}
            icon={<Wallet size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Récompenses"
            value={String(kpiSafe.rewardsUsed)}
            hint={`${kpiSafe.rewardsReady} prêtes`}
            icon={<Gift size={18} className="text-primary" />}
          />
          <Kpi
            label="CA membres"
            value={formatMad(kpiSafe.memberRevenue)}
            hint={kpiSafe.memberAvgTicket ? `Panier ${formatMad(kpiSafe.memberAvgTicket)}` : "Ce mois"}
            icon={<Wallet size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Forfaits"
            value={String(kpiSafe.activePackages)}
            hint="Séances actives"
            icon={<Sparkles size={18} className="text-primary" />}
          />
          <Kpi
            label="Actifs 30 j"
            value={String(kpiSafe.active30d)}
            hint={kpiSafe.membersCount ? `${engagement} % d’engagement` : "Mouvements"}
            icon={<Star size={18} className="text-[#7B5900]" />}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl bg-ink p-6 text-[#FEECF7] shadow-sm lg:col-span-2">
            <p className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#261900]">
              {program?.active ? "Programme actif" : "Programme inactif"}
            </p>
            <h2 className="mt-3 text-[22px] font-bold text-white">
              {ratio} MAD dépensé = 1 point au POS
            </h2>
            <p className="mt-1 max-w-xl text-[15px] text-white/70">
              {rewards.filter((r) => r.active).length} récompense
              {rewards.filter((r) => r.active).length > 1 ? "s" : ""} au catalogue.
              Cumul {formatPts(kpiSafe.pointsDistributed)} · utilisé {formatPts(kpiSafe.pointsRedeemed)}.
            </p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div className="flex gap-6">
                <div>
                  <p className="text-[11px] font-bold uppercase text-[#FFDEA4]">CA membres (mois)</p>
                  <p className="text-[18px] font-extrabold text-white">{formatMad(kpiSafe.memberRevenue)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[#FFDEA4]">Coupons prêts</p>
                  <p className="text-[18px] font-extrabold text-white">{kpiSafe.rewardsReady}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-11 items-center gap-1 rounded-lg bg-white px-4 text-[14px] font-bold text-ink"
              >
                Ajuster le ratio
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-white p-5 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cake size={18} className="text-[#7B5900]" />
                  <h2 className="text-[18px] font-bold">Anniversaires</h2>
                </div>
                <span className="rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold text-[#261900]">
                  {weekBirthdays.length} cette semaine
                </span>
              </div>
              {weekBirthdays.length === 0 ? (
                <p className="mt-3 text-[13px] text-ink/50">Aucune date renseignée cette semaine.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {weekBirthdays.slice(0, 3).map((b) => (
                    <button
                      key={b.customerId}
                      type="button"
                      onClick={() => setSelectedId(b.customerId)}
                      className="flex w-full items-center justify-between rounded-lg bg-[#FFEFF8] p-2 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFDEA4] text-[11px] font-bold">
                          {memberInitials(b.customerName)}
                        </span>
                        <div>
                          <p className="text-[14px] font-bold">{b.customerName}</p>
                          <p className="text-[11px] text-ink/45">
                            {birthdayWhenLabel(b.daysUntil)} · {LOYALTY_LEVEL_LABEL[b.level]}
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-primary">+{BIRTHDAY_BONUS_PTS} pts</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {canWrite && weekBirthdays.length > 0 ? (
              <button
                type="button"
                disabled={birthdayBusy}
                onClick={handleBirthdayBonus}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FCE9F4] text-[14px] font-bold text-primary disabled:opacity-60"
              >
                <Gift size={16} />
                Offrir +{BIRTHDAY_BONUS_PTS} pts
              </button>
            ) : null}
          </div>
        </section>

        {program ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[22px] font-bold">Paliers & statuts</h2>
              <span className="text-[12px] text-ink/40">Cumul lifetime, réévalué après encaissement</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(["BRONZE", "SILVER", "GOLD", "VIP"] as LoyaltyLevel[]).map((level) => (
                <TierCard
                  key={level}
                  level={level}
                  program={program}
                  count={kpiSafe.levelCounts[level]}
                  total={kpiSafe.membersCount}
                  rewards={rewards}
                  onClick={() => setTab(level)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <div className="rounded-xl bg-white p-4 shadow-sm xl:col-span-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto">
                {LEVEL_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                      tab === t.id ? "bg-primary text-white shadow-sm" : "text-ink/50 hover:bg-[#FFEFF8]",
                    )}
                  >
                    {t.label(kpiSafe)}
                  </button>
                ))}
              </div>
              <div className="relative min-w-[220px]">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-ink/35" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Nom, mobile, réf. membre…"
                  className="h-8 w-full rounded-lg bg-[#FFEFF8] pl-8 pr-3 text-[13px] outline-none"
                />
              </div>
            </div>

            {loading ? (
              <p className="p-10 text-center text-sm text-ink/50">Chargement…</p>
            ) : pageRows.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink/50">Aucun membre sur ce filtre.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <thead>
                    <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                      <th className="rounded-l-lg px-3 py-2.5">Cliente</th>
                      <th className="px-3 py-2.5">Palier</th>
                      <th className="px-3 py-2.5">Solde</th>
                      <th className="px-3 py-2.5">Dernier soin</th>
                      <th className="px-3 py-2.5">Récompense</th>
                      <th className="px-3 py-2.5">Réf.</th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((m) => {
                      const next = program ? nextLevelTarget(m.lifetimePoints, program) : null;
                      const ready = readyReward(m, rewards);
                      const active = selected?.customerId === m.customerId;
                      const wa = waMeHref(
                        m.phone,
                        firstNameOf(m.customerName),
                        `Bonjour ${firstNameOf(m.customerName)}, solde fidélité : ${m.balance} pts.`,
                      );
                      return (
                        <tr
                          key={m.customerId}
                          onClick={() => setSelectedId(m.customerId)}
                          className={cn(
                            "cursor-pointer border-t border-[#FFEFF8] transition-colors",
                            active ? "bg-[#F6E3EF]/70" : "hover:bg-[#FFEFF8]",
                          )}
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
                                {memberInitials(m.customerName)}
                              </span>
                              <div>
                                <p className="font-extrabold">{m.customerName}</p>
                                <p className="text-[11px] text-ink/40">{m.phone ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                                m.level === "VIP"
                                  ? "bg-ink text-[#FFDEA4]"
                                  : m.level === "GOLD"
                                    ? "bg-[#FFDEA4] text-[#261900]"
                                    : "bg-[#FCE9F4] text-ink/70",
                              )}
                            >
                              {LOYALTY_LEVEL_LABEL[m.level]}
                            </span>
                          </td>
                          <td className="min-w-[140px] px-3 py-3">
                            <div className="mb-1 flex justify-between text-[11px]">
                              <span className="font-extrabold text-primary">{formatPts(m.balance)}</span>
                              {next?.label ? (
                                <span className="text-ink/40">/ {next.min.toLocaleString("fr-MA")}</span>
                              ) : (
                                <span className="text-ink/40">max</span>
                              )}
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
                              <div
                                className="h-1.5 rounded-full bg-primary"
                                style={{ width: `${next?.progress ?? 100}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold">{m.lastServiceName ?? "—"}</p>
                            <p className="text-[11px] text-ink/40">{formatRelativeVisit(m.lastVisitAt)}</p>
                          </td>
                          <td className="px-3 py-3">
                            {ready ? (
                              <span className="inline-flex items-center rounded-md bg-[#FCE9F4] px-2 py-1 text-[11px] font-bold text-primary">
                                {rewardChip(ready)}
                              </span>
                            ) : (
                              <span className="text-[12px] text-ink/40">En cumul</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] font-bold text-ink/50">
                            {memberRef(m.customerName, m.customerId)}
                          </td>
                          <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {canPos ? (
                                <Link
                                  href={`/pos/?customerId=${m.customerId}`}
                                  className="rounded p-1 text-primary hover:bg-[#FFEFF8]"
                                  title="Ouvrir au POS"
                                >
                                  <Wallet size={16} />
                                </Link>
                              ) : null}
                              {canWhatsapp && wa ? (
                                <a
                                  href={wa}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded p-1 text-[#7B5900] hover:bg-[#FFEFF8]"
                                  title="WhatsApp"
                                >
                                  <MessageCircle size={16} />
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink/50">
              <span>
                {filtered.length === 0
                  ? "0 membre"
                  : `Affichage ${page * pageSize + 1}–${Math.min(filtered.length, page * pageSize + pageSize)} sur ${filtered.length}`}
                {ranking.length < kpiSafe.membersCount
                  ? ` · ${ranking.length} chargés sur ${kpiSafe.membersCount}`
                  : ""}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded bg-[#FCE9F4] px-2.5 py-1 disabled:opacity-40"
                >
                  Précédent
                </button>
                <span className="rounded bg-primary px-2.5 py-1 font-bold text-white">
                  {page + 1}/{pageCount}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded bg-[#FCE9F4] px-2.5 py-1 disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            {selected && program ? (
              <FocusPanel
                member={selected}
                program={program}
                rewards={rewards}
                canPos={canPos}
                canCustomers={canCustomers}
                canWhatsapp={canWhatsapp}
                canRedeem={canRedeem}
                onRedeem={() => openRedeem(selected)}
              />
            ) : (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">
                Sélectionnez une cliente.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-ink p-6 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFDEA4] text-[#261900]">
                <Sparkles size={20} />
              </span>
              <div>
                <h3 className="text-[18px] font-extrabold">{insight.headline}</h3>
                <p className="text-[13px] text-white/65">{insight.body}</p>
              </div>
            </div>
            <Link
              href={canReactivation ? "/reactivation/" : "/ai/"}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#FFDEA4] px-4 text-[14px] font-extrabold text-[#261900]"
            >
              {canReactivation ? "Ouvrir réactivation" : "Copilote IA"}
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">Membres & CA</p>
              <p className="mt-2 text-[15px]">
                Gold + VIP : {kpiSafe.levelCounts.GOLD + kpiSafe.levelCounts.VIP} / {kpiSafe.membersCount}. CA du mois{" "}
                {formatMad(kpiSafe.memberRevenue)}.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">Ledger</p>
              <p className="mt-2 text-[15px]">
                {formatPts(kpiSafe.pointsDistributed)} gagnés · {formatPts(kpiSafe.pointsRedeemed)} utilisés ·{" "}
                {formatPts(kpiSafe.pointsActive)} en circulation.
              </p>
            </div>
            <div className="rounded-xl bg-primary/20 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">Piste</p>
              <p className="mt-2 text-[15px]">{insight.rec}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[18px] font-bold">Journal des points</h4>
            <button
              type="button"
              onClick={() => exportLoyaltyCsv(filtered)}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-primary"
            >
              <Download size={14} />
              Exporter le classement (.CSV)
            </button>
          </div>
          {journal.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/50">Aucun mouvement pour l’instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead>
                  <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                    <th className="px-3 py-2">Horodatage</th>
                    <th className="px-3 py-2">Mouvement</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Points</th>
                    <th className="px-3 py-2">Solde</th>
                    <th className="px-3 py-2">Opérateur</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.map((row) => (
                    <tr key={row.id} className="border-t border-[#FFEFF8]">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink/45">
                        {formatJournalStamp(row.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-bold">{journalKind(row)}</td>
                      <td className="px-3 py-2">{row.customerName}</td>
                      <td className={cn("px-3 py-2 font-bold", row.points >= 0 ? "text-[#7B5900]" : "text-primary")}>
                        {row.points > 0 ? "+" : ""}
                        {row.points} pts
                      </td>
                      <td className="px-3 py-2 font-bold">{row.balanceAfter} pts</td>
                      <td className="px-3 py-2 text-ink/45">{row.operatorName ?? "Système"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[18px] font-bold">Forfaits séances</h4>
            {canWrite ? (
              <button type="button" onClick={() => setPkgOpen(true)} className="text-[13px] font-bold text-primary">
                + Nouveau forfait
              </button>
            ) : null}
          </div>
          {packages.length === 0 ? (
            <p className="text-sm text-ink/50">Aucun forfait.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {packages.slice(0, 6).map((p) => {
                const pct = p.sessionTotal ? Math.round((p.sessionUsed / p.sessionTotal) * 100) : 0;
                return (
                  <div key={p.id} className="rounded-lg bg-[#FFEFF8] p-3 text-[13px]">
                    <p className="font-bold">{p.name}</p>
                    {canCustomers ? (
                      <Link href={`/customers/${p.customerId}/`} className="text-primary">
                        {p.customerName}
                      </Link>
                    ) : (
                      <p>{p.customerName}</p>
                    )}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-ink/55">
                      {p.sessionUsed}/{p.sessionTotal} · {p.status}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Configurer le programme">
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1.5 block font-medium">MAD pour 1 point</span>
            <Input type="number" min={0.01} step={0.01} value={madPerPoint} onChange={(e) => setMadPerPoint(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Seuil Bronze</span>
              <Input type="number" value={bronzeMin} onChange={(e) => setBronzeMin(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Seuil Silver</span>
              <Input type="number" value={silverMin} onChange={(e) => setSilverMin(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Seuil Gold</span>
              <Input type="number" value={goldMin} onChange={(e) => setGoldMin(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Seuil VIP</span>
              <Input type="number" value={vipMin} onChange={(e) => setVipMin(e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={programActive} onChange={(e) => setProgramActive(e.target.checked)} />
            Programme actif
          </label>
          <Button type="button" variant="primary" className="w-full" disabled={!canWrite || submitting} onClick={saveProgram}>
            Enregistrer
          </Button>
        </div>
      </Drawer>

      <Drawer open={rewardOpen} onClose={() => setRewardOpen(false)} title="Nouvelle récompense">
        <div className="space-y-3 text-sm">
          <Input placeholder="Nom" value={rewardName} onChange={(e) => setRewardName(e.target.value)} />
          <Input type="number" placeholder="Coût points" value={rewardCost} onChange={(e) => setRewardCost(e.target.value)} />
          <Select value={rewardType} onChange={(e) => setRewardType(e.target.value)}>
            <option value="DISCOUNT_FIXED">Remise MAD</option>
            <option value="DISCOUNT_PERCENT">Remise %</option>
            <option value="FREE_SERVICE">Soin offert</option>
          </Select>
          <Input type="number" placeholder="Valeur (MAD ou %)" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} />
          <Button type="button" variant="primary" className="w-full" disabled={submitting || !rewardName} onClick={saveReward}>
            Créer
          </Button>
        </div>
      </Drawer>

      <Drawer open={pkgOpen} onClose={() => setPkgOpen(false)} title="Nouveau forfait">
        <div className="space-y-3 text-sm">
          <Select value={pkgCustomerId} onChange={(e) => setPkgCustomerId(e.target.value)}>
            <option value="">Cliente…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={pkgServiceId}
            onChange={(e) => {
              setPkgServiceId(e.target.value);
              const s = services.find((x) => x.id === e.target.value);
              if (s && !pkgName) setPkgName(`Forfait ${s.name}`);
            }}
          >
            <option value="">Service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input placeholder="Nom du forfait" value={pkgName} onChange={(e) => setPkgName(e.target.value)} />
          <Input type="number" placeholder="Séances" value={pkgSessions} onChange={(e) => setPkgSessions(e.target.value)} />
          <Input type="number" placeholder="Prix MAD" value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} />
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !pkgCustomerId || !pkgServiceId}
            onClick={savePackage}
          >
            Créer
          </Button>
        </div>
      </Drawer>

      <Drawer
        open={Boolean(redeemMember)}
        onClose={() => setRedeemMember(null)}
        title={redeemMember ? `Utiliser une récompense · ${redeemMember.customerName}` : "Récompense"}
      >
        <div className="space-y-3 text-sm">
          <p className="text-ink/55">
            Solde {redeemMember ? formatPts(redeemMember.balance) : "—"}. Le débit est journalisé, il n’est pas annulable ici.
          </p>
          <Select value={redeemRewardId} onChange={(e) => setRedeemRewardId(e.target.value)}>
            <option value="">Récompense…</option>
            {(redeemMember
              ? rewards.filter((r) => r.active && r.pointsCost <= redeemMember.balance)
              : []
            ).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {formatPoints(r.pointsCost)}
              </option>
            ))}
          </Select>
          <Button type="button" variant="primary" className="w-full" disabled={submitting || !redeemRewardId} onClick={handleRedeem}>
            Confirmer l’utilisation
          </Button>
        </div>
      </Drawer>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-ink/40">
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className="text-[28px] font-extrabold leading-none">{value}</p>
      <p className="mt-2 text-[12px] text-ink/45">{hint}</p>
    </div>
  );
}

function TierCard({
  level,
  program,
  count,
  total,
  rewards,
  onClick,
}: {
  level: LoyaltyLevel;
  program: LoyaltyProgramConfig;
  count: number;
  total: number;
  rewards: LoyaltyRewardItem[];
  onClick: () => void;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const dark = level === "VIP";
  const related = rewards
    .filter((r) => r.active)
    .filter((r) => {
      if (level === "BRONZE") return r.pointsCost < program.silverMin;
      if (level === "SILVER") return r.pointsCost >= program.silverMin && r.pointsCost < program.goldMin;
      if (level === "GOLD") return r.pointsCost >= program.goldMin && r.pointsCost < program.vipMin;
      return r.pointsCost >= program.vipMin;
    })
    .slice(0, 3);
  const next =
    level === "BRONZE"
      ? program.silverMin
      : level === "SILVER"
        ? program.goldMin
        : level === "GOLD"
          ? program.vipMin
          : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between rounded-xl p-4 text-left shadow-sm",
        dark ? "bg-ink text-white" : "bg-white",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-[18px] font-extrabold", dark ? "text-[#FFDEA4]" : "")}>
            {LOYALTY_LEVEL_LABEL[level]}
          </p>
          <p className={cn("text-[12px]", dark ? "text-white/50" : "text-ink/40")}>{levelRange(level, program)}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            dark ? "bg-white text-ink" : "bg-[#FCE9F4] text-ink/70",
          )}
        >
          {count} ({pct} %)
        </span>
      </div>
      <ul className="my-4 space-y-1.5 text-[13px]">
        <li className={dark ? "text-white/90" : ""}>
          Ratio {program.madPerPoint} MAD = 1 pt
        </li>
        {related.length === 0 ? (
          <li className={dark ? "text-white/50" : "text-ink/45"}>Pas de récompense calée sur ce palier</li>
        ) : (
          related.map((r) => (
            <li key={r.id} className={dark ? "text-white/90" : ""}>
              {r.name} · {formatPoints(r.pointsCost)}
            </li>
          ))
        )}
      </ul>
      <div
        className={cn(
          "flex items-center justify-between rounded-lg p-2.5 text-[12px]",
          dark ? "bg-white/10 text-[#FFDEA4]" : "bg-[#FFEFF8] text-ink/60",
        )}
      >
        <span>{next != null ? "Seuil suivant" : "Palier maximal"}</span>
        <span className="font-bold">{next != null ? `${next.toLocaleString("fr-MA")} pts` : "Prestige"}</span>
      </div>
    </button>
  );
}

function FocusPanel({
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
  program: LoyaltyProgramConfig;
  rewards: LoyaltyRewardItem[];
  canPos: boolean;
  canCustomers: boolean;
  canWhatsapp: boolean;
  canRedeem: boolean;
  onRedeem: () => void;
}) {
  const next = nextLevelTarget(member.lifetimePoints, program);
  const ready = readyReward(member, rewards);
  const sim = posSimulation(member, ready);
  const cheapest = cheapestActiveReward(rewards);
  const wa = waMeHref(
    member.phone,
    firstNameOf(member.customerName),
    `Bonjour ${firstNameOf(member.customerName)}, vos points fidélité : ${member.balance} pts (${LOYALTY_LEVEL_LABEL[member.level]}).`,
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-[16px] font-bold text-white">
            {memberInitials(member.customerName)}
          </span>
          <div>
            <h3 className="text-[18px] font-extrabold">{member.customerName}</h3>
            <p className="text-[12px] text-ink/40">
              {member.memberSince ? `Membre depuis ${formatShortDate(member.memberSince)}` : "Compte fidélité"}
            </p>
            <span className="mt-1 inline-block rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold text-[#261900]">
              {LOYALTY_LEVEL_LABEL[member.level]} · {formatPts(member.balance)}
            </span>
          </div>
        </div>
        {canCustomers ? (
          <Link href={`/customers/${member.customerId}/`} className="rounded-lg bg-[#FFEFF8] p-1 text-ink/50">
            Fiche
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl bg-[#FFEFF8] p-3">
        <div className="flex items-center justify-between text-[12px] font-bold">
          <span>{next.label ? `Progression vers ${next.label}` : "Palier maximal"}</span>
          <span className="text-primary">{next.progress} %</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#F0DDE9]">
          <div className="h-full rounded-full bg-primary" style={{ width: `${next.progress}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[12px] text-ink/45">
          <span>{formatPts(member.lifetimePoints)} cumulés</span>
          {next.remaining > 0 ? <span className="font-bold text-primary">Encore {formatPts(next.remaining)}</span> : null}
        </div>
      </div>

      {ready ? (
        <div className="rounded-xl bg-[#F6E3EF]/80 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Récompense accessible</p>
          <p className="mt-1 text-[18px] font-bold">{ready.name}</p>
          <p className="text-[12px] text-ink/50">
            {rewardChip(ready)} · {formatPoints(ready.pointsCost)} · {memberRef(member.customerName, member.customerId)}
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-ink/50">
          {cheapest
            ? `Encore ${formatPts(Math.max(0, cheapest.pointsCost - member.balance))} pour « ${cheapest.name} ».`
            : "Aucune récompense active au catalogue."}
        </p>
      )}

      {sim ? (
        <div className="rounded-xl bg-[#FFEFF8] p-3 text-[13px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Simulation sur le dernier soin</p>
          <div className="mt-2 flex justify-between">
            <span>{sim.serviceName}</span>
            <span className="font-bold">{formatMad(sim.base)}</span>
          </div>
          <div className="flex justify-between font-bold text-primary">
            <span>{ready?.name}</span>
            <span>-{formatMad(sim.discount)}</span>
          </div>
          <div className="mt-2 flex justify-between text-[18px] font-extrabold">
            <span>Net estimé</span>
            <span>{formatMad(sim.net)}</span>
          </div>
          <div className="mt-2 rounded-lg bg-white p-2 text-[12px]">
            <div className="flex justify-between text-primary">
              <span>Débit récompense</span>
              <span>-{sim.debit} pts</span>
            </div>
            <div className="flex justify-between text-[#7B5900]">
              <span>Gain estimé (1 pt / MAD)</span>
              <span>+{sim.earn} pts</span>
            </div>
            <div className="flex justify-between pt-1 font-bold">
              <span>Solde projeté</span>
              <span>{sim.newBalance} pts</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {canPos ? (
          <Link
            href={`/pos/?customerId=${member.customerId}`}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold text-white shadow-sm"
          >
            <Wallet size={18} />
            Ouvrir au POS
          </Link>
        ) : null}
        {canRedeem && ready ? (
          <button
            type="button"
            onClick={onRedeem}
            className="flex h-11 items-center justify-center rounded-lg bg-[#FCE9F4] text-[14px] font-semibold"
          >
            Utiliser la récompense
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
    </div>
  );
}
