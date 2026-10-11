"use client";

/** Page fidélité prestige — desktop + mobile. */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Cake,
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
import { LoyaltyBoard } from "@/components/loyalty/loyalty-board";
import { type VisitCardRow } from "@/components/loyalty/visit-cards-list";
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
  formatPts,
  formatRelativeVisit,
  formatShortDate,
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
  const [visitsPerReward, setVisitsPerReward] = useState("10");
  const [rewardLabelConfig, setRewardLabelConfig] = useState("Récompense");
  const [programName, setProgramName] = useState("");
  const [rewardKind, setRewardKind] = useState<"FREE_SERVICE" | "DISCOUNT">("FREE_SERVICE");
  const [visitRewardValue, setVisitRewardValue] = useState("");
  const [rewardValidityDays, setRewardValidityDays] = useState("30");
  const [productsEligible, setProductsEligible] = useState(false);
  const [stackRewards, setStackRewards] = useState(true);
  const [eligibleServiceIds, setEligibleServiceIds] = useState<string[]>([]);

  const [rewardName, setRewardName] = useState("");
  const [rewardCost, setRewardCost] = useState("500");
  const [rewardType, setRewardType] = useState("DISCOUNT_FIXED");
  const [rewardValue, setRewardValue] = useState("50");

  const [visitCards, setVisitCards] = useState<VisitCardRow[]>([]);
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
      setVisitCards(dash.visitCards ?? []);
      setMadPerPoint(String(dash.program.madPerPoint));
      setBronzeMin(String(dash.program.bronzeMin));
      setSilverMin(String(dash.program.silverMin));
      setGoldMin(String(dash.program.goldMin));
      setVipMin(String(dash.program.vipMin));
      setProgramActive(dash.program.active);
      setVisitsPerReward(String(dash.program.visitsPerReward ?? 10));
      setRewardLabelConfig(dash.program.rewardLabel ?? "Récompense");
      setProgramName(dash.program.name ?? "");
      setRewardKind(dash.program.rewardKind === "DISCOUNT" ? "DISCOUNT" : "FREE_SERVICE");
      setVisitRewardValue(dash.program.rewardValue != null ? String(dash.program.rewardValue) : "");
      setRewardValidityDays(String(dash.program.rewardValidityDays ?? 30));
      setProductsEligible(Boolean(dash.program.productsEligible));
      setStackRewards(dash.program.stackRewards !== false);
      setEligibleServiceIds(dash.program.eligibleServiceIds ?? []);
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
      visitsPerReward: Number(visitsPerReward) || 10,
      rewardLabel: rewardLabelConfig || "Récompense",
      name: programName,
      rewardKind,
      rewardValue: visitRewardValue.trim() ? Number(visitRewardValue) : null,
      rewardValidityDays: Number(rewardValidityDays) || 30,
      productsEligible,
      stackRewards,
      eligibleServiceIds,
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

  return (
    <>
      <LoyaltyBoard
        orgName={user.orgName}
        canWrite={canWrite}
        canRedeem={canRedeem}
        program={program}
        visitCards={visitCards}
        ranking={ranking}
        rewards={rewards}
        journal={journal}
        services={services}
        onRefresh={() => void refresh()}
        onOpenSettings={() => setSettingsOpen(true)}
        onCreateReward={async (input) => {
          const result = await createReward(input);
          if (!result.ok) {
            toast(result.error, "error");
            return result.error;
          }
          toast("Récompense créée.", "success");
          return null;
        }}
        onRedeem={async (customerId, rewardId) => {
          const result = await redeemReward({ customerId, rewardId });
          if (!result.ok) {
            toast(result.error, "error");
            return result.error;
          }
          toast("Récompense utilisée.", "success");
          return null;
        }}
      />

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Configurer le programme">
        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-[#FFEFF8] p-3 space-y-2">
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Carte fidélité (Passages)</p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink/70">Nombre de passages requis</span>
              <Input type="number" min={1} max={50} value={visitsPerReward} onChange={(e) => setVisitsPerReward(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink/70">Nom du programme</span>
              <Input placeholder="Fidélité de l'institut" value={programName} onChange={(e) => setProgramName(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink/70">Nom de la récompense</span>
              <Input placeholder="Soin visage offert" value={rewardLabelConfig} onChange={(e) => setRewardLabelConfig(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink/70">Type de récompense</span>
              <Select value={rewardKind} onChange={(e) => setRewardKind(e.target.value === "DISCOUNT" ? "DISCOUNT" : "FREE_SERVICE")}>
                <option value="FREE_SERVICE">Service offert</option>
                <option value="DISCOUNT">Réduction</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink/70">Valeur (DH, facultatif)</span>
              <Input type="number" min={0} value={visitRewardValue} onChange={(e) => setVisitRewardValue(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink/70">Validité de la récompense (jours)</span>
              <Input type="number" min={1} max={365} value={rewardValidityDays} onChange={(e) => setRewardValidityDays(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink/70">Services éligibles</span>
              <Select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id || eligibleServiceIds.includes(id)) return;
                  setEligibleServiceIds((current) => [...current, id]);
                }}
              >
                <option value="">Tous les services</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </Select>
              {eligibleServiceIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {eligibleServiceIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEligibleServiceIds((current) => current.filter((item) => item !== id))}
                      className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold"
                    >
                      {services.find((service) => service.id === id)?.name ?? "Service"} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-ink/45">Aucun filtre : toutes les prestations comptent.</p>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={productsEligible} onChange={(e) => setProductsEligible(e.target.checked)} />
              Produits éligibles
            </label>
            <p className="text-[11px] text-ink/45">
              Un passage est validé sur une prestation terminée. Une vente produit seule n&apos;ajoute pas de passage.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={stackRewards} onChange={(e) => setStackRewards(e.target.checked)} />
              Cumuler plusieurs récompenses
            </label>
          </div>
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
            Statut : {programActive ? "Activé" : "Désactivé"}
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
