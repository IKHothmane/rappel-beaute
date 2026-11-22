"use client";
import { MetricCard } from "@/components/ui/metric-card";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  Activity,
  Check,
  CheckCircle2,
  Gift,
  ExternalLink,
  Percent,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { shortCardCode, visitCycle } from "@/lib/loyalty/card-code";
import { loyaltyJoinUrl, loyaltyPreviewUrl } from "@/lib/loyalty/public-origin";
import { LoyaltyScanPage } from "@/components/loyalty/loyalty-scan-page";
import { LoyaltyManualVisit } from "@/components/loyalty/loyalty-manual-visit";
import type { VisitCardRow } from "@/components/loyalty/visit-cards-list";
import { memberInitials } from "@/components/loyalty/loyalty-helpers";
import { LoyaltyBrandCard } from "@/components/loyalty/loyalty-brand-card";
import { LoyaltyAddPhone, useLoyaltyMergeAvailability } from "@/components/loyalty/loyalty-add-phone";
import {
  LoyaltyMergeDialog,
  type LoyaltyMergeOutcome,
  type MergeDialogSource,
} from "@/components/loyalty/loyalty-merge-dialog";
import { useCurrentUser } from "@/components/auth/session-provider";
import { readRecentScans, rememberRecentScan } from "@/components/loyalty/recent-scans";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { updateProgram } from "@/modules/loyalty/service";
import type { LoyaltyJournalItem, LoyaltyProgramConfig } from "@/types/loyalty";

function rewardSummary(program: LoyaltyProgramConfig | null) {
  if (!program) return "—";
  const label = program.rewardLabel?.trim() || "Récompense";
  if (program.rewardKind === "PERCENTAGE" && program.rewardValue != null) {
    return `${label} · −${program.rewardValue} %`;
  }
  if (program.rewardKind === "DISCOUNT" && program.rewardValue != null) {
    return `${label} · −${program.rewardValue} MAD`;
  }
  return `${label} · soin offert`;
}

/** Carte anonyme (adhésion par QR) : le téléphone est un identifiant technique « WL… ». */
function isAnonymousPhone(phone: string | null | undefined) {
  return typeof phone === "string" && phone.startsWith("WL");
}

function phoneLabel(phone: string | null | undefined) {
  if (!phone || isAnonymousPhone(phone)) return "Sans téléphone";
  return phone;
}

function activityWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

function relativeWhen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 1) return "à l’instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return activityWhen(iso);
}

function clientStatus(card: VisitCardRow) {
  const cycle = visitCycle(card.visits, card.visitsPerReward);
  if (card.promoCode) return { label: "Récompense", className: "bg-amber-50 text-amber-700" };
  if (cycle >= card.visitsPerReward || card.visits >= card.visitsPerReward * 2) {
    return { label: "VIP", className: "bg-[#FCE9F4] text-[#981C52]" };
  }
  if (cycle === 0 && card.visits === 0) return { label: "Nouvelle", className: "bg-sky-50 text-sky-700" };
  return { label: "Active", className: "bg-emerald-50 text-emerald-700" };
}

export function LoyaltyBoard({
  orgName,
  canWrite,
  canScan,
  mergeEnabled,
  program,
  visitCards,
  journal = [],
  membersThisMonth = 0,
  visitCardsTotal,
  onShowMore,
  onRefresh,
}: {
  orgName: string;
  canWrite: boolean;
  canScan: boolean;
  mergeEnabled: boolean;
  program: LoyaltyProgramConfig | null;
  visitCards: VisitCardRow[];
  journal?: LoyaltyJournalItem[];
  membersThisMonth?: number;
  /** Nombre total de cartes de l'institut (peut dépasser les cartes chargées). */
  visitCardsTotal?: number;
  /** Charge davantage de cartes ; absent quand la limite maximale est atteinte. */
  onShowMore?: () => Promise<void> | void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const { organizationId } = useCurrentUser();
  const [showMoreBusy, setShowMoreBusy] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [joinImage, setJoinImage] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [previewOrigin, setPreviewOrigin] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [mergeSource, setMergeSource] = useState<MergeDialogSource | null>(null);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [cfgVisits, setCfgVisits] = useState("5");
  const [cfgLabel, setCfgLabel] = useState("Récompense");
  const [cfgKind, setCfgKind] = useState<"FREE_SERVICE" | "DISCOUNT" | "PERCENTAGE">("FREE_SERVICE");
  const [cfgValue, setCfgValue] = useState("");
  const [cfgDays, setCfgDays] = useState("30");
  const [cfgBusy, setCfgBusy] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);

  useEffect(() => { setPreviewOrigin(window.location.origin); }, []);

  // Le sondage (12 s) fournit un nouvel objet `program` à chaque tour : on ne
  // resynchronise le formulaire que si les valeurs changent réellement, et jamais
  // tant que le panneau d'édition est ouvert (la saisie en cours est conservée).
  const hasProgram = program !== null;
  const programVisits = program?.visitsPerReward;
  const programLabel = program?.rewardLabel;
  const programKind = program?.rewardKind;
  const programValue = program?.rewardValue;
  const programDays = program?.rewardValidityDays;
  useEffect(() => {
    if (!hasProgram || cfgOpen) return;
    setCfgVisits(String(programVisits != null && programVisits > 0 ? programVisits : 5));
    setCfgLabel(programLabel?.trim() || "Récompense");
    setCfgKind(
      programKind === "DISCOUNT" ? "DISCOUNT" : programKind === "PERCENTAGE" ? "PERCENTAGE" : "FREE_SERVICE",
    );
    setCfgValue(programValue != null ? String(programValue) : "");
    setCfgDays(String(programDays != null && programDays > 0 ? programDays : 30));
  }, [hasProgram, cfgOpen, programVisits, programLabel, programKind, programValue, programDays]);

  const threshold = program?.visitsPerReward && program.visitsPerReward > 0 ? program.visitsPerReward : null;
  const focused = focusId ? visitCards.find((card) => card.customerId === focusId) ?? null : null;
  const cycleVisits = focused && threshold ? visitCycle(focused.visits, threshold) : 0;
  const filled = threshold ? Math.min(threshold, Math.max(0, cycleVisits)) : 0;
  const stampCount = threshold && threshold > 0 ? threshold : 0;
  const focusedAnonymous = Boolean(focused && isAnonymousPhone(focused.phone));
  const mergeAvailability = useLoyaltyMergeAvailability(mergeEnabled && canWrite && focusedAnonymous);

  function rememberScan(customerId: string) {
    setPendingSelectId(null);
    setFocusId(customerId);
    setScannedIds((prev) => [customerId, ...prev.filter((id) => id !== customerId)]);
    rememberRecentScan(organizationId, customerId);
  }

  // L'ordre des clientes scannées survit au rechargement : lu après le montage (jamais
  // pendant le rendu serveur) puis fusionné derrière les cartes déjà repérées comme fraîches.
  useEffect(() => {
    const stored = readRecentScans(organizationId);
    if (stored.length === 0) return;
    setScannedIds((prev) => {
      const merged = [...prev, ...stored.filter((id) => !prev.includes(id))];
      return merged.length === prev.length ? prev : merged;
    });
  }, [organizationId]);

  async function handleShowMore() {
    if (!onShowMore || showMoreBusy) return;
    setShowMoreBusy(true);
    try {
      await onShowMore();
    } finally {
      setShowMoreBusy(false);
    }
  }

  const scannedList = useMemo(() => {
    const byId = new Map(visitCards.map((card) => [card.customerId, card]));
    const activity = (card: VisitCardRow) => new Date(card.lastActivityAt || card.createdAt).getTime();
    const fromScans = scannedIds
      .map((id) => byId.get(id))
      .filter((card): card is VisitCardRow => Boolean(card));
    const rest = visitCards
      .filter((card) => !scannedIds.includes(card.customerId))
      .sort((a, b) => activity(b) - activity(a) || a.customerName.localeCompare(b.customerName, "fr"));
    return [...fromScans, ...rest];
  }, [visitCards, scannedIds]);

  const stats = useMemo(() => {
    const loadedCards = visitCards.length;
    // Le total serveur peut dépasser les cartes chargées (liste plafonnée).
    const totalCards = Math.max(loadedCards, visitCardsTotal ?? 0);
    const totalVisits = visitCards.reduce((sum, card) => sum + card.visits, 0);
    const withVisits = visitCards.filter((card) => card.visits > 0).length;
    const rewards = visitCards.filter((card) => Boolean(card.promoCode)).length;
    const engagement = loadedCards > 0 ? Math.round((withVisits / loadedCards) * 100) : 0;
    const previousMembers = Math.max(0, totalCards - membersThisMonth);
    const monthGrowthPct =
      membersThisMonth > 0 && previousMembers > 0
        ? Math.round((membersThisMonth / previousMembers) * 100)
        : membersThisMonth > 0 && previousMembers === 0
          ? 100
          : null;
    return { totalCards, totalVisits, withVisits, rewards, engagement, monthGrowthPct };
  }, [visitCards, visitCardsTotal, membersThisMonth]);

  const hasMoreCards = typeof visitCardsTotal === "number" && visitCardsTotal > visitCards.length;
  const recentClients = scannedList.slice(0, 8);
  const recentActivity = useMemo(() => {
    if (journal.length > 0) {
      return journal.slice(0, 6).map((item) => ({
        id: item.id,
        title:
          item.type === "EARN"
            ? "Passage / points"
            : item.type === "REDEEM"
              ? "Récompense accordée"
              : "Mouvement fidélité",
        detail: `${item.customerName}${item.reason ? ` · ${item.reason}` : ""}`,
        when: relativeWhen(item.createdAt),
      }));
    }
    return recentClients.slice(0, 6).map((card) => ({
      id: card.id,
      title: card.promoCode ? "Récompense accordée" : card.visits > 0 ? "Passage enregistré" : "Nouvelle cliente fidélité",
      detail: card.promoCode
        ? `${card.customerName} · ${card.promoCode}`
        : `${card.customerName}${card.visits > 0 ? ` · ${visitCycle(card.visits, card.visitsPerReward)}e passage` : ""}`,
      when: relativeWhen(card.lastActivityAt || card.createdAt),
    }));
  }, [journal, recentClients]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      onRefresh();
    };
    const timer = setInterval(tick, 12000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [onRefresh]);

  useEffect(() => {
    const recentMs = 3 * 60 * 1000;
    const now = Date.now();
    const freshIds = visitCards
      .filter((card) => {
        const at = new Date(card.lastActivityAt || card.createdAt).getTime();
        return now - at < recentMs;
      })
      .sort(
        (a, b) =>
          new Date(b.lastActivityAt || b.createdAt).getTime() -
          new Date(a.lastActivityAt || a.createdAt).getTime(),
      )
      .map((card) => card.customerId);
    if (!freshIds.length) return;
    setScannedIds((prev) => {
      const merged = [...freshIds, ...prev.filter((id) => !freshIds.includes(id))];
      if (merged.length === prev.length && merged.every((id, i) => id === prev[i])) return prev;
      return merged;
    });
  }, [visitCards]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setJoinBusy(true);
      try {
        // GET → ensureJoinQr : crée le QR une seule fois par institut, puis le réutilise.
        const res = await fetch("/api/loyalty/join-qr/", { method: "GET", credentials: "include" });
        const data = (await res.json()) as { qr?: { token: string } | null; error?: string };
        if (!res.ok) throw new Error(data.error || "QR indisponible.");
        const token = data.qr?.token;
        if (!token || cancelled) {
          if (!cancelled) {
            setJoinImage(null);
            setJoinUrl(null);
          }
          return;
        }
        const image = await QRCode.toDataURL(loyaltyJoinUrl(token), {
          margin: 1,
          width: 320,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) {
          setJoinImage(image);
          setJoinUrl(loyaltyJoinUrl(token));
        }
      } catch (error) {
        if (!cancelled) {
          setJoinImage(null);
          setJoinUrl(null);
          toast(error instanceof Error ? error.message : "QR indisponible.", "error");
        }
      } finally {
        if (!cancelled) setJoinBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  function selectCustomer(card: VisitCardRow) {
    rememberScan(card.customerId);
  }

  // Après une fusion, la fiche survivante n'est dans la liste qu'après le rafraîchissement : on la sélectionne alors.
  useEffect(() => {
    if (!pendingSelectId) return;
    const card = visitCards.find((row) => row.customerId === pendingSelectId);
    if (card) selectCustomer(card);
  });

  function handleMergeDone(outcome: LoyaltyMergeOutcome) {
    setMergeSource(null);
    rememberScan(outcome.customerId);
    if (outcome.kind === "assigned") {
      toast("Numéro enregistré sur la fiche.", "success");
    } else {
      setPendingSelectId(outcome.customerId);
      const { result } = outcome;
      const cycle = result.visitsPerReward > 0 ? ` · ${result.cycle} / ${result.visitsPerReward} dans le cycle` : "";
      toast(
        result.replayed
          ? "Cette fusion était déjà enregistrée : fiche existante affichée."
          : `Fiches fusionnées · ${result.totalVisits} passage${result.totalVisits > 1 ? "s" : ""}${cycle}${
              result.cumulativeRewardId ? " · récompense créée" : ""
            }.`,
        "success",
      );
    }
    onRefresh();
    // Le bouton « Ajouter le numéro » a disparu : on ramène le focus sur la carte affichée.
    window.requestAnimationFrame(() => document.getElementById("loyalty-active-card")?.focus());
  }

  async function saveRewardConfig() {
    if (!canWrite) return;
    const visits = Math.max(1, Math.min(20, Number(cfgVisits) || 5));
    const value =
      cfgKind === "FREE_SERVICE" ? null : cfgValue.trim() ? Number(cfgValue) : null;
    if (cfgKind !== "FREE_SERVICE" && !(value != null && value > 0)) {
      toast("Indiquez la valeur de la réduction.", "error");
      return;
    }
    setCfgBusy(true);
    const result = await updateProgram({
      visitsPerReward: visits,
      rewardLabel: cfgLabel.trim() || "Récompense",
      rewardKind: cfgKind,
      rewardValue: value,
      rewardValidityDays: Math.max(1, Number(cfgDays) || 30),
      active: true,
    });
    setCfgBusy(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Récompense du programme enregistrée.", "success");
    setCfgOpen(false);
    onRefresh();
  }

  const field =
    "h-11 w-full min-w-0 rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] px-3 text-sm outline-none transition focus:border-[#C95483] focus:ring-2 focus:ring-pink-100";

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-clip pb-6">
      <header
        className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Programme de fidélité
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Récompensez la fidélité de vos clientes, boostez les passages et augmentez la valeur de votre
            institut.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5 rb-metric-row">
        {[
          {
            label: "Clientes fidélité",
            value: stats.totalCards.toLocaleString("fr-FR"),
            hint:
              stats.monthGrowthPct != null
                ? `+${stats.monthGrowthPct} % ce mois`
                : membersThisMonth > 0
                  ? `+${membersThisMonth} ce mois`
                  : `${stats.withVisits} actives`,
            hintTone: stats.monthGrowthPct != null || membersThisMonth > 0 ? "growth" : "muted",
            icon: Users,
          },
          {
            label: "Passages enregistrés",
            value: stats.totalVisits.toLocaleString("fr-FR"),
            hint: hasMoreCards ? `Sur ${visitCards.length} cartes chargées` : "Tous cycles confondus",
            hintTone: "muted",
            icon: Activity,
          },
          {
            label: "Récompenses offertes",
            value: stats.rewards.toLocaleString("fr-FR"),
            hint: hasMoreCards ? `Sur ${visitCards.length} cartes chargées` : "Codes promo actifs",
            hintTone: "muted",
            icon: Gift,
          },
          {
            label: "Programme",
            value: program?.active ? "Actif" : "Inactif",
            hint: threshold ? `${threshold} passages requis` : "À configurer",
            hintTone: program?.active ? "ok" : "muted",
            icon: CheckCircle2,
          },
          {
            label: "Taux d’engagement",
            value: `${stats.engagement} %`,
            hint: hasMoreCards ? `Sur ${visitCards.length} cartes chargées` : "Clientes avec passages",
            hintTone: "muted",
            icon: TrendingUp,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <MetricCard key={stat.label} title={stat.label} value={stat.value} icon={<Icon />} hint={stat.hint} />
          );
        })}
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12 xl:grid-rows-[auto_1fr]">
          <div className="xl:col-span-4 xl:col-start-9 xl:row-start-1">
            {canScan ? (
              <LoyaltyScanPage
                key={organizationId}
                onIdentified={rememberScan}
                onConfirmed={(customerId) => {
                  rememberScan(customerId);
                  onRefresh();
                }}
              />
            ) : (
              <p className="rounded-[26px] border border-[#F1E8EC] bg-white p-5 text-sm text-[#765E6B] shadow-sm">
                Le scan de carte est r?serv? au personnel autoris?.
              </p>
            )}
            {canScan && (
              <LoyaltyManualVisit
                key={organizationId}
                onIdentified={rememberScan}
                onConfirmed={(customerId) => {
                  rememberScan(customerId);
                  onRefresh();
                }}
                canRevoke={canWrite}
                focusedCustomer={focused ? { id: focused.customerId, name: focused.customerName } : undefined}
              />
            )}
          </div>
          <div className="space-y-5 xl:col-span-8 xl:col-start-1 xl:row-span-2 xl:row-start-1">
                <section
                  id="loyalty-active-card"
                  tabIndex={-1}
                  className="rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm outline-none md:p-6"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-[#30202C]">Carte de fidélité active</h2>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-bold",
                        program?.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {program?.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <LoyaltyBrandCard
                      organizationName={orgName}
                      programName={program?.name}
                      backgroundUrl={program?.cardBackgroundUrl}
                      cycleVisits={focused && threshold ? cycleVisits : threshold ? 0 : null}
                      threshold={threshold}
                      highlightLabel={focused?.promoCode ? "Code promo" : "Prochaine récompense"}
                      highlightValue={
                        focused?.promoCode
                          ? `${focused.promoCode} · ${rewardSummary(program)}`
                          : rewardSummary(program)
                      }
                      qrSrc={joinImage}
                      qrAlt={`QR fidélité ${orgName}`}
                      qrEmpty={joinBusy ? "…" : "Aucun QR"}
                      code={focused?.cardCode || null}
                      footerTitle={focused?.customerName || program?.name || "Programme institut"}
                      footerSubtitle={
                        focused
                          ? phoneLabel(focused.phone)
                          : "QR permanent de l’institut — le même pour toutes les clientes"
                      }
                    />

                    {joinUrl ? (
                      <a
                        href={loyaltyPreviewUrl(joinUrl, previewOrigin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#981C52] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7d1643]"
                      >
                        <ExternalLink size={17} aria-hidden />
                        Ouvrir la page d’inscription
                      </a>
                    ) : null}

                    {focused && mergeAvailability.available ? (
                      <LoyaltyAddPhone
                        name={focused.customerName}
                        onOpen={() =>
                          setMergeSource({
                            customerId: focused.customerId,
                            name: focused.customerName,
                            cardCode: focused.cardCode || (focused.publicToken ? shortCardCode(focused.publicToken) : null),
                          })
                        }
                      />
                    ) : null}

                    {stampCount > 0 ? (
                      <div className="rounded-2xl border border-[#F6EAF0] bg-[#FCF7F9] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#30202C]">Progression du cycle</p>
                          <p className="text-sm font-bold text-[#981C52]">
                            {focused ? filled : 0} / {threshold}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: stampCount }, (_, index) => {
                            const done = focused ? index < filled : false;
                            const compact = stampCount > 10;
                            return (
                              <span
                                key={index}
                                className={cn(
                                  "flex items-center justify-center rounded-full border font-bold",
                                  compact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs",
                                  done
                                    ? "border-[#981C52] bg-[#981C52] text-white"
                                    : "border-[#E7B9CD] bg-white text-[#C88BA6]",
                                )}
                              >
                                {done ? <Check size={compact ? 12 : 16} aria-hidden /> : index + 1}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          icon: Target,
                          label: "Objectif",
                          value: threshold ? `${threshold} passages` : "—",
                        },
                        {
                          icon: Gift,
                          label: "Récompense",
                          value: rewardSummary(program),
                        },
                        {
                          icon: Percent,
                          label: "Validité",
                          value: program?.rewardValidityDays
                            ? `${program.rewardValidityDays} jours`
                            : "—",
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-[#F6EAF0] bg-[#FCF7F9] px-4 py-3"
                          >
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#765E6B]">
                              <Icon size={13} />
                              {item.label}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-[#30202C]">{item.value}</p>
                          </div>
                        );
                      })}
                    </div>

                    {canWrite ? (
                      <>
                      <button
                        type="button"
                        onClick={() => setCfgOpen(true)}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E7B9CD] bg-[#FFF1F7] px-4 py-3 text-sm font-semibold text-[#981C52] transition hover:bg-[#FCE3EE]"
                      >
                        <Gift size={18} aria-hidden />
                        Récompense choisie par l’institut
                      </button>
                      <PremiumSidePanel
                        open={cfgOpen}
                        onClose={() => { if (!cfgBusy) setCfgOpen(false); }}
                        title="Récompense choisie par l’institut"
                        description={`À ${cfgVisits || "5"} passages confirm?s, le code de la cliente devient un code promo.`}
                      >
                      <form
                        className="space-y-4 rounded-2xl border border-[#F0DDE6] bg-[#FFF9FB] p-4 sm:p-5"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveRewardConfig();
                        }}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#765E6B]">
                              Passages requis
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={cfgVisits}
                              onChange={(e) => setCfgVisits(e.target.value)}
                              className={field}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#765E6B]">
                              Type de récompense
                            </span>
                            <select
                              value={cfgKind}
                              onChange={(e) =>
                                setCfgKind(e.target.value as "FREE_SERVICE" | "DISCOUNT" | "PERCENTAGE")
                              }
                              className={field}
                            >
                              <option value="FREE_SERVICE">Soin offert</option>
                              <option value="DISCOUNT">Remise MAD</option>
                              <option value="PERCENTAGE">Remise %</option>
                            </select>
                          </label>
                          <label className="block space-y-1 sm:col-span-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#765E6B]">
                              Libellé
                            </span>
                            <input
                              value={cfgLabel}
                              onChange={(e) => setCfgLabel(e.target.value)}
                              placeholder="Ex : Soin offert"
                              className={field}
                            />
                          </label>
                          {cfgKind !== "FREE_SERVICE" ? (
                            <label className="block space-y-1">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#765E6B]">
                                Valeur {cfgKind === "PERCENTAGE" ? "(%)" : "(MAD)"}
                              </span>
                              <input
                                type="number"
                                min={1}
                                value={cfgValue}
                                onChange={(e) => setCfgValue(e.target.value)}
                                placeholder={cfgKind === "PERCENTAGE" ? "20" : "100"}
                                className={field}
                              />
                            </label>
                          ) : null}
                          <label className="block space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#765E6B]">
                              Validité (jours)
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={cfgDays}
                              onChange={(e) => setCfgDays(e.target.value)}
                              className={field}
                            />
                          </label>
                        </div>
                        <div className="flex flex-col-reverse gap-2 border-t border-[#F0DDE6] pt-4 sm:flex-row sm:justify-end">
                        <button type="button" disabled={cfgBusy} onClick={() => setCfgOpen(false)} className="h-11 rounded-xl border border-[#E7B9CD] bg-white px-5 text-sm font-semibold text-[#765E6B] hover:bg-[#FFF1F7] disabled:opacity-50">Fermer</button>
                        <button
                          type="submit"
                          disabled={cfgBusy}
                          className="h-11 w-full rounded-xl bg-[#981C52] text-sm font-semibold text-white transition hover:bg-[#7d1643] disabled:opacity-50 sm:w-auto sm:px-5"
                        >
                          {cfgBusy ? "Enregistrement…" : "Enregistrer la récompense"}
                        </button>
                        </div>
                      </form>
                      </PremiumSidePanel>
                      </>
                    ) : null}
                  </div>
                </section>

            <section className="overflow-hidden rounded-[26px] border border-[#F0E7EB] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F4EDF0] px-5 py-4">
                <h2 className="text-lg font-bold text-[#30202C]">Clientes fidélité</h2>
                <span
                  className="rounded-full bg-[#FCE9F4] px-2.5 py-0.5 text-[11px] font-bold text-[#981C52]"
                  aria-label={
                    hasMoreCards
                      ? `${scannedList.length} clientes affichées sur ${visitCardsTotal}`
                      : `${scannedList.length} clientes`
                  }
                >
                  {hasMoreCards
                    ? `${scannedList.length.toLocaleString("fr-FR")} / ${(visitCardsTotal ?? 0).toLocaleString("fr-FR")}`
                    : scannedList.length}
                </span>
              </div>
              {scannedList.length === 0 ? (
                <p className="p-6 text-sm text-[#765E6B]">Aucune cliente pour le moment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="text-[11px] font-bold uppercase tracking-wider text-[#765E6B]">
                        <th className="px-5 py-3">Cliente</th>
                        <th className="px-3 py-3">Téléphone</th>
                        <th className="px-3 py-3">Passages</th>
                        <th className="px-3 py-3">Progression</th>
                        <th className="px-3 py-3">Statut</th>
                        <th className="px-5 py-3">Dernier passage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4EDF0]">
                      {scannedList.map((card) => {
                        const cycle = visitCycle(card.visits, card.visitsPerReward);
                        const pct = Math.min(100, Math.round((cycle / Math.max(1, card.visitsPerReward)) * 100));
                        const status = clientStatus(card);
                        return (
                          <tr
                            key={card.id}
                            className={cn(
                              "cursor-pointer transition hover:bg-[#FFF7FB]",
                              focusId === card.customerId && "bg-[#FFF4F8]",
                            )}
                            onClick={() => selectCustomer(card)}
                            onDoubleClick={() => router.push(`/customers/${card.customerId}/`)}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7D9E6] text-[11px] font-bold text-[#8D2452]">
                                  {memberInitials(card.customerName)}
                                </span>
                                <span className="font-semibold text-[#30202C]">{card.customerName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[#765E6B]">{phoneLabel(card.phone)}</td>
                            <td className="px-3 py-3 font-semibold text-[#30202C]">
                              {card.promoCode ? card.promoCode : `${cycle}/${card.visitsPerReward}`}
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-[#F6EAF0]">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#C95483] to-[#981C52]"
                                  style={{ width: `${card.promoCode ? 100 : pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", status.className)}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-[#765E6B]">
                              {card.lastVisitAt ? activityWhen(card.lastVisitAt) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {hasMoreCards && onShowMore ? (
                <div className="flex justify-center border-t border-[#F4EDF0] px-5 py-4">
                  <button
                    type="button"
                    onClick={() => void handleShowMore()}
                    disabled={showMoreBusy}
                    aria-busy={showMoreBusy}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#981C52] bg-white px-5 text-sm font-semibold text-[#981C52] transition hover:bg-[#FFF4F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#981C52] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                  >
                    {showMoreBusy ? "Chargement…" : "Afficher plus"}
                    {!showMoreBusy ? (
                      <span className="text-xs font-medium text-[#765E6B]">
                        ({scannedList.length.toLocaleString("fr-FR")} sur {(visitCardsTotal ?? 0).toLocaleString("fr-FR")})
                      </span>
                    ) : null}
                  </button>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="xl:col-span-4 xl:col-start-9 xl:row-start-2">
            <section className="rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-[#30202C]">Dernières activités</h3>
              <ul className="mt-4 space-y-4">
                {recentActivity.length === 0 ? (
                  <li className="text-sm text-[#765E6B]">Aucune activité récente.</li>
                ) : (
                  recentActivity.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#981C52]" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#30202C]">{item.title}</p>
                        <p className="truncate text-xs text-[#765E6B]">{item.detail}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{item.when}</p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </aside>
        </div>

      {mergeSource ? (
        <LoyaltyMergeDialog
          key={mergeSource.customerId}
          source={mergeSource}
          onClose={() => setMergeSource(null)}
          onDone={handleMergeDone}
          onUnavailable={() => {
            mergeAvailability.markUnavailable();
            setMergeSource(null);
          }}
          onStale={onRefresh}
        />
      ) : null}
    </div>
  );
}
