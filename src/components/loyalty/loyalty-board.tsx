"use client";
import { MetricCard } from "@/components/ui/metric-card";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  Activity,
  Camera,
  Check,
  CheckCircle2,
  Gift,
  ExternalLink,
  Percent,
  Plus,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { shortCardCode, visitCycle } from "@/lib/loyalty/card-code";
import { loyaltyCardUrl, loyaltyJoinUrl, loyaltyPreviewUrl } from "@/lib/loyalty/public-origin";
import type { LoyaltyScanPreview } from "@/components/loyalty/loyalty-scan-page";
import type { VisitCardRow } from "@/components/loyalty/visit-cards-list";
import { memberInitials } from "@/components/loyalty/loyalty-helpers";
import { LoyaltyBrandCard } from "@/components/loyalty/loyalty-brand-card";
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

function phoneLabel(phone: string | null | undefined) {
  if (!phone || phone.startsWith("WL")) return "Sans téléphone";
  return phone;
}

async function createQrDetector() {
  const Native = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
      };
    }
  ).BarcodeDetector;
  if (Native) return new Native({ formats: ["qr_code"] });
  const mod = await import("barcode-detector/ponyfill");
  return new mod.BarcodeDetector({ formats: ["qr_code"] });
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
  program,
  visitCards,
  journal = [],
  membersThisMonth = 0,
  onRefresh,
}: {
  orgName: string;
  canWrite: boolean;
  program: LoyaltyProgramConfig | null;
  visitCards: VisitCardRow[];
  journal?: LoyaltyJournalItem[];
  membersThisMonth?: number;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [joinImage, setJoinImage] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [previewOrigin, setPreviewOrigin] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [passageToken, setPassageToken] = useState("");
  const [passageBusy, setPassageBusy] = useState(false);
  const [passageNote, setPassageNote] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef<(value: string) => void>(() => {});
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [cfgVisits, setCfgVisits] = useState("5");
  const [cfgLabel, setCfgLabel] = useState("Récompense");
  const [cfgKind, setCfgKind] = useState<"FREE_SERVICE" | "DISCOUNT" | "PERCENTAGE">("FREE_SERVICE");
  const [cfgValue, setCfgValue] = useState("");
  const [cfgDays, setCfgDays] = useState("30");
  const [cfgBusy, setCfgBusy] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);

  useEffect(() => { setPreviewOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (!program) return;
    setCfgVisits(String(program.visitsPerReward > 0 ? program.visitsPerReward : 5));
    setCfgLabel(program.rewardLabel?.trim() || "Récompense");
    setCfgKind(
      program.rewardKind === "DISCOUNT"
        ? "DISCOUNT"
        : program.rewardKind === "PERCENTAGE"
          ? "PERCENTAGE"
          : "FREE_SERVICE",
    );
    setCfgValue(program.rewardValue != null ? String(program.rewardValue) : "");
    setCfgDays(String(program.rewardValidityDays > 0 ? program.rewardValidityDays : 30));
  }, [program]);

  const threshold = program?.visitsPerReward && program.visitsPerReward > 0 ? program.visitsPerReward : null;
  const focused = focusId ? visitCards.find((card) => card.customerId === focusId) ?? null : null;
  const cycleVisits = focused && threshold ? visitCycle(focused.visits, threshold) : 0;
  const filled = threshold ? Math.min(threshold, Math.max(0, cycleVisits)) : 0;
  const stampCount = threshold && threshold > 0 ? threshold : 0;

  function rememberScan(customerId: string) {
    setFocusId(customerId);
    setScannedIds((prev) => [customerId, ...prev.filter((id) => id !== customerId)]);
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
    const totalCards = visitCards.length;
    const totalVisits = visitCards.reduce((sum, card) => sum + card.visits, 0);
    const withVisits = visitCards.filter((card) => card.visits > 0).length;
    const rewards = visitCards.filter((card) => Boolean(card.promoCode)).length;
    const engagement = totalCards > 0 ? Math.round((withVisits / totalCards) * 100) : 0;
    const previousMembers = Math.max(0, totalCards - membersThisMonth);
    const monthGrowthPct =
      membersThisMonth > 0 && previousMembers > 0
        ? Math.round((membersThisMonth / previousMembers) * 100)
        : membersThisMonth > 0 && previousMembers === 0
          ? 100
          : null;
    return { totalCards, totalVisits, withVisits, rewards, engagement, monthGrowthPct };
  }, [visitCards, membersThisMonth]);

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
    const timer = setInterval(() => onRefresh(), 12000);
    return () => clearInterval(timer);
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

  async function addPassage() {
    if (!passageToken.trim()) return;
    setPassageBusy(true);
    setPassageNote(null);
    try {
      const res = await fetch("/api/loyalty/credit-code/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", token: passageToken }),
      });
      const body = (await res.json()) as {
        error?: string;
        customerName?: string;
        visits?: number;
        visitsPerReward?: number;
        promoCode?: string | null;
      };
      if (!res.ok) throw new Error(body.error || "Passage impossible.");
      const matched = visitCards.find((card) => card.customerName === body.customerName);
      if (matched) rememberScan(matched.customerId);
      if (body.promoCode) {
        const rewardText = rewardSummary(program);
        setPassageNote(
          `${body.customerName} · code promo ${body.promoCode} activé (${rewardText}). Compteur remis à 0.`,
        );
        toast(`Code promo ${body.promoCode} activé · ${rewardText}`, "success");
      } else {
        const limit = body.visitsPerReward ?? threshold ?? 0;
        const shown = limit > 0 ? visitCycle(body.visits ?? 0, limit) : (body.visits ?? 0);
        setPassageNote(`${body.customerName} · ${shown} / ${limit || "—"}`);
      }
      setPassageToken("");
      onRefresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Passage impossible.", "error");
    } finally {
      setPassageBusy(false);
    }
  }

  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const detector = await createQrDetector();
        const tick = async () => {
          if (stopped) return;
          const codes = await detector.detect(video).catch(() => []);
          const value = codes[0]?.rawValue;
          if (value) {
            stopped = true;
            onScanRef.current(value);
            return;
          }
          window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        if (!stopped) {
          setCameraOn(false);
          toast("Caméra indisponible. Saisissez le code de la carte.", "error");
        }
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOn, toast]);

  function selectCustomer(card: VisitCardRow) {
    rememberScan(card.customerId);
    const code = (card.cardCode || card.promoCode || (card.publicToken ? shortCardCode(card.publicToken) : "")).trim();
    if (code) setPassageToken(code);
  }

  async function resolveScannedCode(raw: string) {
    const upper = raw.toUpperCase();
    const matched = upper.match(/RBLOY_[A-Z2-9]+/);
    const token = matched?.[0] ?? upper.trim();
    setCameraOn(false);
    if (!token) return;
    if (token.startsWith("RBJOIN_")) {
      toast("Ce code est le QR de l'institut. Scannez la carte cliente.", "error");
      return;
    }
    try {
      const res = await fetch(`/api/loyalty/scan/?token=${encodeURIComponent(token)}`);
      const body = (await res.json()) as LoyaltyScanPreview & { error?: string };
      if (!res.ok) throw new Error(body.error || "Code introuvable.");
      rememberScan(body.customerId);
      setPassageToken(shortCardCode(body.token));
      toast(`${body.customerName} sélectionnée.`, "success");
      onRefresh();
    } catch (error) {
      setPassageToken(token);
      toast(error instanceof Error ? error.message : "Code introuvable.", "error");
    }
  }

  onScanRef.current = (value: string) => {
    void resolveScannedCode(value);
  };

  function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      document.getElementById("loyalty-passage-code")?.focus();
      toast("Caméra indisponible. Saisissez le code de la carte.", "error");
      return;
    }
    setCameraOn(true);
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
            hint: "Tous cycles confondus",
            hintTone: "muted",
            icon: Activity,
          },
          {
            label: "Récompenses offertes",
            value: stats.rewards.toLocaleString("fr-FR"),
            hint: "Codes promo actifs",
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
            hint: "Clientes avec passages",
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

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
                <section className="rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm md:p-6">
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

                    {focused?.publicToken || joinUrl ? (
                      <a
                        href={loyaltyPreviewUrl(focused?.publicToken ? loyaltyCardUrl(focused.publicToken) : joinUrl!, previewOrigin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#981C52] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7d1643]"
                      >
                        <ExternalLink size={17} aria-hidden />
                        Voir la page cliente
                      </a>
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
                        description={`À ${cfgVisits || "5"} prestations, le code de la cliente devient un code promo.`}
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
                              Prestations requises
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
                <span className="rounded-full bg-[#FCE9F4] px-2.5 py-0.5 text-[11px] font-bold text-[#981C52]">
                  {scannedList.length}
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
                              {activityWhen(card.lastActivityAt || card.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5 xl:col-span-4">
              <div className="grid gap-4">
                <section className="rounded-[26px] border border-[#F1E8EC] bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1F6] text-[#981C52]">
                      <Camera size={22} aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-[#30202C]">Scanner</h3>
                      <p className="text-sm text-[#765E6B]">QR carte cliente</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#981C52] text-sm font-semibold text-white transition hover:bg-[#7d1643]"
                  >
                    <Camera size={18} aria-hidden />
                    Ouvrir la caméra
                  </button>
                  {cameraOn ? (
                    <video
                      id="loyalty-camera"
                      ref={videoRef}
                      className="mt-3 aspect-video w-full rounded-xl bg-black object-cover"
                      muted
                      playsInline
                      autoPlay
                    />
                  ) : null}
                </section>

                <section className="rounded-[26px] border border-[#D7F0E2] bg-[#F3FBF6] p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1B7F4E]">
                      <Plus size={22} />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-[#30202C]">Ajouter un passage</h3>
                      <p className="text-sm text-[#765E6B]">
                        Au {threshold ?? program?.visitsPerReward ?? 5}e passage → code promo client
                      </p>
                    </div>
                  </div>
                  {canWrite ? (
                    <form
                      className="mt-4 grid gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void addPassage();
                      }}
                    >
                      <input
                        id="loyalty-passage-code"
                        className={cn(field, "h-12 text-base")}
                        value={passageToken}
                        onChange={(event) => setPassageToken(event.target.value)}
                        placeholder="Code de la carte"
                        autoComplete="off"
                      />
                      {passageNote ? (
                        <p className="text-sm font-semibold text-[#1B7F4E]">{passageNote}</p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={passageBusy || !passageToken.trim()}
                        className="h-12 rounded-xl bg-[#1B7F4E] text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Valider le passage
                      </button>
                    </form>
                  ) : (
                    <p className="mt-3 text-sm text-[#765E6B]">Réservé à l&apos;équipe autorisée.</p>
                  )}
                </section>
              </div>

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
    </div>
  );
}
