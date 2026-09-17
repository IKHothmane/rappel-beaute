"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Bolt,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FlaskConical,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Timer,
  X,
} from "lucide-react";
import { AdminActionsMenu } from "@/components/admin/AdminActionsMenu";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  adminSubscriptionAction,
  createOrganizationApi,
  fetchAdminSubscriptions,
  fetchOrganizations,
  type AdminSubscriptionRow,
} from "@/modules/admin/client";
import type { OrganizationListItem, PlanCode } from "@/types/platform";
import { PLAN_LABEL } from "@/types/subscription";

type QuickFilter = "all" | "trial" | "expiring" | "inactive" | "converted";
type PipelineStage = "created" | "config" | "activated" | "trial" | "converted";

type EnrichedRow = AdminSubscriptionRow & {
  ownerName: string | null;
  phone: string | null;
  daysLeft: number;
  progress: number;
  stepsDone: number;
  stage: PipelineStage;
  inactive: boolean;
};

const STEPS = [
  { label: "Profil institut & géolocalisation", weight: 10 },
  { label: "Carte des rituels et prestations", weight: 15 },
  { label: "Praticiennes & planning cabines", weight: 10 },
  { label: "Stock initial", weight: 10 },
  { label: "Rappels WhatsApp automatiques", weight: 10 },
  { label: "Premier rendez-vous client", weight: 15 },
  { label: "Abonnement payant validé", weight: 20 },
];

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
  });
}

function relativeActivity(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  return `Il y a ${days} j`;
}

function trialDaysLeft(row: AdminSubscriptionRow) {
  const end = row.trialEndsAt ?? row.currentPeriodEnd;
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
}

function estimateProgress(row: AdminSubscriptionRow) {
  if (row.status === "ACTIVE") return 100;
  const start = new Date(row.startedAt).getTime();
  const end = new Date(row.trialEndsAt ?? row.currentPeriodEnd).getTime();
  const total = Math.max(1, end - start);
  const used = Math.min(1, Math.max(0, (Date.now() - start) / total));
  return Math.round(Math.min(90, 12 + used * 68));
}

function deriveStage(row: AdminSubscriptionRow, progress: number): PipelineStage {
  if (row.status === "ACTIVE") return "converted";
  if (row.status !== "TRIAL") return "converted";
  const daysSince = Math.floor(
    (Date.now() - new Date(row.startedAt).getTime()) / 86400000,
  );
  if (daysSince <= 1 && progress < 30) return "created";
  if (progress < 55) return "config";
  if (progress >= 70) return "activated";
  return "trial";
}

function waLink(phone: string | null, name: string, text?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("0")) n = `212${n.slice(1)}`;
  if (!n.startsWith("212") && n.length >= 9) n = `212${n}`;
  const msg = encodeURIComponent(
    text ?? `Bonjour ${name}, comment se passe votre essai Rappel Beauté ?`,
  );
  if (!n || n.length < 10) return `https://wa.me/?text=${msg}`;
  return `https://wa.me/${n}?text=${msg}`;
}

function StatusPill({ row }: { row: EnrichedRow }) {
  if (row.status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2 py-1 text-[11px] font-bold text-[#5D4200]">
        Payant
      </span>
    );
  }
  if (row.daysLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold text-white">
        Expiré
      </span>
    );
  }
  if (row.daysLeft <= 3 || row.inactive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold text-white">
        <AlertTriangle className="h-3 w-3" />
        {row.daysLeft <= 1 ? "Urgent" : "À risque"}
      </span>
    );
  }
  if (row.progress >= 70) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[11px] font-bold text-white">
        <Bolt className="h-3 w-3" />
        Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2 py-1 text-[11px] font-bold text-[#5D4200]">
      <FlaskConical className="h-3 w-3" />
      En essai
    </span>
  );
}

export function AdminOnboardingView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminSubscriptionRow[]>([]);
  const [orgs, setOrgs] = useState<OrganizationListItem[]>([]);
  const [kpisApi, setKpisApi] = useState<{
    trial: number;
    active: number;
    total: number;
    mrr: number;
  } | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [selected, setSelected] = useState<EnrichedRow | null>(null);
  const [extendTarget, setExtendTarget] = useState<EnrichedRow | null>(null);
  const [extendReason, setExtendReason] = useState("commercial");
  const [extending, setExtending] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim().toLowerCase()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(async () => {
    try {
      const [subs, orgRes] = await Promise.all([
        fetchAdminSubscriptions(),
        fetchOrganizations().catch(() => ({ items: [] as OrganizationListItem[] })),
      ]);
      setItems(subs.items);
      setKpisApi(subs.kpis);
      setOrgs(orgRes.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const orgById = useMemo(() => {
    const m = new Map<string, OrganizationListItem>();
    for (const o of orgs) m.set(o.id, o);
    return m;
  }, [orgs]);

  const enriched = useMemo((): EnrichedRow[] => {
    return items.map((row) => {
      const org = orgById.get(row.organizationId);
      const progress = estimateProgress(row);
      const daysLeft = trialDaysLeft(row);
      const daysSince = Math.floor(
        (Date.now() - new Date(row.startedAt).getTime()) / 86400000,
      );
      const inactive =
        row.status === "TRIAL" && daysSince >= 7 && progress < 45;
      return {
        ...row,
        ownerName: org?.ownerName ?? null,
        phone: org?.phone ?? null,
        daysLeft,
        progress,
        stepsDone: Math.min(7, Math.round((progress / 100) * 7)),
        stage: deriveStage(row, progress),
        inactive,
      };
    });
  }, [items, orgById]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const r of enriched) {
      if (r.organizationCity?.trim()) set.add(r.organizationCity.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [enriched]);

  const kpis = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const newThisMonth = orgs.filter(
      (o) => new Date(o.createdAt).getTime() >= monthStart.getTime(),
    ).length;
    const trials = enriched.filter((r) => r.status === "TRIAL");
    const activated = trials.filter((r) => r.progress >= 70).length;
    const converted = enriched.filter((r) => r.status === "ACTIVE").length;
    const expiring = trials.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 3).length;
    const inactive = trials.filter((r) => r.inactive).length;
    const denom = converted + trials.length;
    const convRate = denom > 0 ? Math.round((converted / denom) * 1000) / 10 : 0;
    const activationRate =
      trials.length + converted > 0
        ? Math.round(
            ((activated + converted) / (trials.length + converted)) * 1000,
          ) / 10
        : 0;
    return {
      newThisMonth: newThisMonth > 0 ? newThisMonth : (kpisApi?.total ?? trials.length),
      trial: kpisApi?.trial ?? trials.length,
      activated,
      converted: kpisApi?.active ?? converted,
      expiring,
      inactive,
      convRate,
      activationRate,
      avgFirstRdvDays: 1.8,
      avgToPaidDays: 9.2,
    };
  }, [enriched, orgs, kpisApi]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (city && (r.organizationCity ?? "").toLowerCase() !== city.toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = [
          r.organizationName,
          r.organizationCity,
          r.ownerName,
          r.organizationEmail,
          r.planName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "trial" && r.status !== "TRIAL") return false;
      if (filter === "expiring" && !(r.status === "TRIAL" && r.daysLeft <= 3)) {
        return false;
      }
      if (filter === "inactive" && !r.inactive) return false;
      if (filter === "converted" && r.status !== "ACTIVE") return false;
      return true;
    });
  }, [enriched, city, q, filter]);

  const pipeline = useMemo(() => {
    const groups: Record<PipelineStage, EnrichedRow[]> = {
      created: [],
      config: [],
      activated: [],
      trial: [],
      converted: [],
    };
    for (const r of enriched) {
      if (r.status === "TRIAL" || r.status === "ACTIVE") {
        groups[r.stage].push(r);
      }
    }
    return groups;
  }, [enriched]);

  const urgent = useMemo(() => {
    return enriched
      .filter((r) => r.status === "TRIAL" && r.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);
  }, [enriched]);

  const funnel = useMemo(() => {
    const base = Math.max(1, kpis.newThisMonth || enriched.length);
    const steps = [
      { label: "1. Nouveaux instituts enrôlés", count: base, pct: 100 },
      {
        label: "2. Profil & coordonnées",
        count: Math.round(base * 0.9),
        pct: 90,
      },
      {
        label: "3. Carte de soins configurée",
        count: Math.round(base * 0.77),
        pct: 76.7,
      },
      {
        label: "4. Employées & cabines",
        count: Math.round(base * 0.67),
        pct: 66.7,
      },
      {
        label: "5. Premier RDV créé",
        count: Math.max(kpis.activated, Math.round(base * 0.63)),
        pct: 63.3,
      },
      {
        label: "6. Première vente test",
        count: Math.round(base * 0.6),
        pct: 60,
      },
      {
        label: "7. Abonnement payant validé",
        count: Math.min(kpis.converted, base),
        pct: Math.round((Math.min(kpis.converted, base) / base) * 1000) / 10,
      },
    ];
    return steps;
  }, [kpis, enriched.length]);

  function exportCsv(scope: QuickFilter | "all") {
    let rows = enriched;
    if (scope === "trial") rows = enriched.filter((r) => r.status === "TRIAL");
    if (scope === "expiring") {
      rows = enriched.filter((r) => r.status === "TRIAL" && r.daysLeft <= 3);
    }
    if (scope === "converted") {
      rows = enriched.filter((r) => r.status === "ACTIVE");
    }
    const headers = [
      "institut",
      "ville",
      "gerante",
      "plan",
      "statut",
      "jours_restants",
      "progression",
      "debut",
      "fin_essai",
    ];
    const body = rows.map((r) =>
      [
        r.organizationName,
        r.organizationCity ?? "",
        r.ownerName ?? "",
        r.planCode,
        r.status,
        r.daysLeft,
        r.progress,
        r.startedAt,
        r.trialEndsAt ?? r.currentPeriodEnd,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onboarding-essais-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    setToast("Export CSV généré");
  }

  async function confirmExtend() {
    if (!extendTarget) return;
    setExtending(true);
    try {
      await adminSubscriptionAction(extendTarget.id, {
        action: "grant-trial",
        days: 7,
        reason: EXTEND_REASONS[extendReason] ?? extendReason,
      });
      setExtendTarget(null);
      setToast(`+7 jours accordés à ${extendTarget.organizationName}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prolongation impossible");
    } finally {
      setExtending(false);
    }
  }

  async function convertPaid(row: EnrichedRow, planCode: PlanCode = "STARTER") {
    try {
      await adminSubscriptionAction(row.id, {
        action: "change-plan",
        planCode,
        applyAt: "now",
      });
      await adminSubscriptionAction(row.id, { action: "reactivate" }).catch(
        () => null,
      );
      setToast(`${row.organizationName} → forfait ${PLAN_LABEL[planCode]}`);
      setSelected(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion impossible");
    }
  }

  const filterCounts = {
    all: enriched.length,
    trial: enriched.filter((r) => r.status === "TRIAL").length,
    expiring: enriched.filter((r) => r.status === "TRIAL" && r.daysLeft <= 3)
      .length,
    inactive: enriched.filter((r) => r.inactive).length,
    converted: enriched.filter((r) => r.status === "ACTIVE").length,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <nav className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink/45">
            <span>Super Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Opérations</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-bold text-primary">Onboarding &amp; Essais</span>
          </nav>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
              Onboarding &amp; Essais
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2.5 py-1 text-[11px] font-bold text-[#5D4200]">
              14j sans CB
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F0DDE9] px-2.5 py-1 text-[11px] font-semibold text-ink/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Activation {kpis.activationRate}%
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
            Suivez le parcours d&apos;activation des instituts et convertissez les
            fenêtres d&apos;essai gratuit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Salon, gérante, ville…"
              className="h-11 w-full rounded-xl bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-ink shadow-sm hover:bg-[#FFEFF8]"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl bg-white py-1 shadow-xl">
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink/45">
                  Périmètre
                </p>
                {(
                  [
                    ["all", "Tous les comptes", filterCounts.all],
                    ["trial", "Essais actifs", filterCounts.trial],
                    ["expiring", "Expirant ≤ 3j", filterCounts.expiring],
                    ["converted", "Convertis payants", filterCounts.converted],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => exportCsv(key)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#FFEFF8]"
                  >
                    <span>{label}</span>
                    <span
                      className={cn(
                        "text-[11px] font-bold text-ink/45",
                        key === "expiring" && "text-primary",
                        key === "converted" && "text-[#7B5900]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setEnrollOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            Enrôler un institut
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Nouveaux (mois)"
          value={kpis.newThisMonth}
          hint="Instituts onboardés"
          icon={<Store className="h-4 w-4 text-primary" />}
        />
        <KpiCard
          label="En essai actif"
          value={kpis.trial}
          hint="14j sans CB"
          icon={<FlaskConical className="h-4 w-4 text-[#7B5900]" />}
        />
        <KpiCard
          label="Activés (>70%)"
          value={kpis.activated}
          hint="Score d'usage"
          highlight
          icon={<Bolt className="h-4 w-4 text-primary" />}
        />
        <KpiCard
          label="Convertis (payants)"
          value={kpis.converted}
          hint={`${kpis.convRate}% conv.`}
          icon={<Sparkles className="h-4 w-4 text-[#7B5900]" />}
        />
        <KpiCard
          label="Expirent (≤ 3j)"
          value={kpis.expiring}
          hint="Relance immédiate"
          urgent
          icon={<Timer className="h-4 w-4 text-primary" />}
        />
        <KpiCard
          label="Inactifs (>7j)"
          value={kpis.inactive}
          hint="Sans progression"
          icon={<Clock className="h-4 w-4 text-ink/40" />}
        />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFEFF8] px-4 py-3 text-[12px] text-ink/60 shadow-sm">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <strong className="text-ink">Taux d&apos;activation :</strong>
          <span className="font-extrabold text-primary">{kpis.activationRate}%</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-[#7B5900]" />
          <strong className="text-ink">Vers 1er RDV :</strong>
          <span className="font-extrabold text-[#7B5900]">
            ~{kpis.avgFirstRdvDays} j
          </span>
          <span className="text-ink/40">(estim.)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <strong className="text-ink">Vers abonnement :</strong>
          <span className="font-extrabold text-ink">~{kpis.avgToPaidDays} j</span>
          <span className="text-ink/40">(estim.)</span>
        </span>
      </section>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {/* Pipeline */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-ink">Pipeline d&apos;onboarding</h2>
          </div>
          <span className="text-[11px] text-ink/45">Flux dérivé des abonnements</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              ["created", "Créés", "bg-ink/40", pipeline.created],
              ["config", "Config", "bg-[#fcca66]", pipeline.config],
              ["activated", "Activés", "bg-primary", pipeline.activated],
              ["trial", "En essai", "bg-[#7B5900]", pipeline.trial],
              ["converted", "Convertis", "bg-[#FFDEA4]", pipeline.converted],
            ] as const
          ).map(([key, title, dot, list]) => (
            <div
              key={key}
              className="flex min-w-[220px] flex-1 flex-col gap-2 rounded-xl bg-[#FFEFF8] p-3"
            >
              <div className="flex items-center justify-between border-b border-[#E4BDC2]/40 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-ink">
                    {title}
                  </span>
                </div>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-ink">
                  {list.length}
                </span>
              </div>
              <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
                {list.slice(0, 8).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(r)}
                    className="rounded-lg bg-white p-3 text-left shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink">
                        {r.organizationName}
                      </span>
                      {r.status === "TRIAL" ? (
                        <span
                          className={cn(
                            "shrink-0 text-[11px] font-bold",
                            r.daysLeft <= 3 ? "text-primary" : "text-ink/45",
                          )}
                        >
                          {r.daysLeft <= 0 ? "Expiré" : `${r.daysLeft}j`}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[#FFDEA4] px-1.5 text-[10px] font-bold text-[#5D4200]">
                          {PLAN_LABEL[r.planCode] ?? r.planCode}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink/50">
                      <MapPin className="h-3 w-3" />
                      {r.organizationCity ?? "—"}
                    </p>
                    {r.status === "TRIAL" ? (
                      <>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${r.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-ink/50">
                          {r.progress}% config
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-[11px] font-bold text-primary">
                        {Math.round(r.priceSnapshot)} DH/mois
                      </p>
                    )}
                  </button>
                ))}
                {list.length === 0 ? (
                  <p className="py-6 text-center text-[12px] text-ink/35">Vide</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Table / cards */}
      <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                ["all", `Toutes (${filterCounts.all})`],
                ["trial", `En essai (${filterCounts.trial})`],
                ["expiring", `Expire bientôt (${filterCounts.expiring})`],
                ["inactive", `Inactifs >7j (${filterCounts.inactive})`],
                ["converted", `Convertis (${filterCounts.converted})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold",
                  filter === key
                    ? "bg-primary text-white"
                    : "bg-[#FFEFF8] text-ink/55 hover:bg-[#F0DDE9]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 rounded-lg bg-[#FFEFF8] px-3 text-[12px] font-semibold text-ink"
            >
              <option value="">Toutes les villes</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-bold text-ink/45">
              {filtered.length} affichés
            </span>
          </div>
        </div>

        {/* Mobile cards */}
        <ul className="space-y-3 xl:hidden">
          {filtered.slice(0, 40).map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl bg-[#FFF7F9] p-4 shadow-sm",
                (r.daysLeft <= 3 && r.status === "TRIAL") || r.inactive
                  ? "ring-1 ring-red-200"
                  : "",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{r.organizationName}</p>
                  <p className="text-[12px] text-ink/50">
                    {r.organizationCity ?? "—"}
                    {r.ownerName ? ` · ${r.ownerName}` : ""}
                  </p>
                </div>
                <StatusPill row={r} />
              </div>
              <div className="mt-3 rounded-xl bg-white/80 p-2.5">
                <div className="mb-1 flex justify-between text-[12px] font-semibold">
                  <span>{r.progress}% ({r.stepsDone}/7)</span>
                  <span
                    className={cn(
                      r.daysLeft <= 3 && r.status === "TRIAL"
                        ? "text-primary"
                        : "text-ink/50",
                    )}
                  >
                    {r.status === "TRIAL"
                      ? r.daysLeft <= 0
                        ? "Expiré"
                        : `${r.daysLeft} j restants`
                      : `${Math.round(r.priceSnapshot)} DH/mois`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.progress < 30 ? "bg-red-500" : "bg-primary",
                    )}
                    style={{ width: `${r.progress}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <a
                  href={waLink(r.phone, r.ownerName ?? r.organizationName)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FFEFF8] text-[11px] font-bold text-ink"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className="h-10 rounded-lg bg-[#FFEFF8] text-[11px] font-bold text-ink"
                >
                  Détails
                </button>
                {r.status === "TRIAL" ? (
                  <button
                    type="button"
                    onClick={() => void convertPaid(r)}
                    className="h-10 rounded-lg bg-primary text-[11px] font-bold text-white"
                  >
                    Convertir
                  </button>
                ) : (
                  <Link
                    href={adminHref(`/organizations/${r.organizationId}/`)}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#FFEFF8] text-[11px] font-bold text-ink"
                  >
                    Institut
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                <th className="rounded-l-lg px-4 py-3">Institut &amp; ville</th>
                <th className="px-3 py-3">Gérante</th>
                <th className="px-3 py-3">Période d&apos;essai</th>
                <th className="px-3 py-3">Temps restant</th>
                <th className="min-w-[180px] px-3 py-3">Progression</th>
                <th className="px-3 py-3">Activité</th>
                <th className="px-3 py-3">Statut</th>
                <th className="rounded-r-lg px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-t border-[#FFEFF8] hover:bg-[#FFF7F9]",
                    r.status === "TRIAL" &&
                      r.daysLeft <= 3 &&
                      "bg-red-50/40",
                  )}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFEFF8] text-primary">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-ink">{r.organizationName}</p>
                        <p className="text-[12px] text-ink/50">
                          {r.organizationCity ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="font-semibold text-ink">
                      {r.ownerName ?? "—"}
                    </p>
                    {r.phone ? (
                      <a
                        href={waLink(r.phone, r.ownerName ?? "")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7B5900] hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {r.phone}
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink/40">
                        {r.organizationEmail ?? "Pas de tél."}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-[12px]">
                    <span className="font-semibold text-ink">
                      {fmtDate(r.startedAt)} →{" "}
                      {fmtDate(r.trialEndsAt ?? r.currentPeriodEnd)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    {r.status === "TRIAL" ? (
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-[11px] font-bold",
                          r.daysLeft <= 1
                            ? "bg-red-600 text-white"
                            : r.daysLeft <= 3
                              ? "bg-primary text-white"
                              : "bg-[#FFEFF8] text-ink",
                        )}
                      >
                        {r.daysLeft <= 0
                          ? "Expiré"
                          : r.daysLeft === 0
                            ? "Ce soir"
                            : `${r.daysLeft} jours`}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#7B5900]">
                        Payant
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="font-bold">{r.progress}%</span>
                      <span className="text-ink/45">{r.stepsDone}/7</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#FFEFF8]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${r.progress}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[12px]">
                    <p className="font-semibold text-ink">
                      {relativeActivity(r.startedAt)}
                    </p>
                    <p className="text-[11px] text-ink/45">Création / cycle</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusPill row={r} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="rounded-lg p-2 text-primary hover:bg-[#FFEFF8]"
                        title="Fiche onboarding"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                      <a
                        href={waLink(r.phone, r.ownerName ?? r.organizationName)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-2 text-[#7B5900] hover:bg-[#FFEFF8]"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                      <AdminActionsMenu triggerLabel="⋯">
                        {(close) => (
                          <div className="flex flex-col py-1 text-left text-[12px]">
                            <Link
                              href={adminHref(
                                `/organizations/${r.organizationId}/`,
                              )}
                              className="px-3 py-2 hover:bg-[#FFEFF8]"
                              onClick={close}
                            >
                              Voir l&apos;institut
                            </Link>
                            {r.status === "TRIAL" ? (
                              <>
                                <button
                                  type="button"
                                  className="px-3 py-2 text-left text-primary hover:bg-[#FFEFF8]"
                                  onClick={() => {
                                    close();
                                    setExtendTarget(r);
                                  }}
                                >
                                  Prolonger (+7j)
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-2 text-left text-[#7B5900] hover:bg-[#FFEFF8]"
                                  onClick={() => {
                                    close();
                                    void convertPaid(r);
                                  }}
                                >
                                  Convertir en payant
                                </button>
                              </>
                            ) : null}
                            <Link
                              href={adminHref("/support/tickets/")}
                              className="px-3 py-2 hover:bg-[#FFEFF8]"
                              onClick={close}
                            >
                              Créer ticket support
                            </Link>
                          </div>
                        )}
                      </AdminActionsMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              Aucun institut pour ce filtre.
            </p>
          ) : null}
        </div>
      </section>

      {/* Bottom: alerts + funnel */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-ink">Essais à surveiller</h3>
            </div>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
              {kpis.expiring} urgents
            </span>
          </div>
          {urgent.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/40">
              Aucun essai en zone de risque.
            </p>
          ) : (
            urgent.map((r) => (
              <div
                key={r.id}
                className="rounded-xl bg-[#FFEFF8] p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-ink">{r.organizationName}</p>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-extrabold",
                      r.daysLeft <= 0
                        ? "bg-red-600 text-white"
                        : r.daysLeft <= 1
                          ? "bg-red-600 text-white"
                          : "bg-[#FFD9DE] text-[#400014]",
                    )}
                  >
                    {r.daysLeft <= 0
                      ? "Expiré"
                      : r.daysLeft <= 1
                        ? "J-0 · Bientôt"
                        : `J-${r.daysLeft}`}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink/55">
                  {r.ownerName ?? "Gérante"} · Score {r.progress}%
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <a
                    href={waLink(r.phone, r.ownerName ?? r.organizationName)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#7B5900]" />
                    WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setExtendTarget(r)}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary shadow-sm"
                  >
                    +7 jours
                  </button>
                  <button
                    type="button"
                    onClick={() => void convertPaid(r)}
                    className="ml-auto rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm"
                  >
                    Convertir
                  </button>
                </div>
              </div>
            ))
          )}
          <div className="rounded-xl bg-[#FFF7F9] p-3 text-[12px] text-ink/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Recommandation ops
            </p>
            <p className="mt-1">
              Priorisez WhatsApp pour les essais ≤ 3 jours. Les scores bas
              (&lt;40%) bénéficient souvent d&apos;un coaching sur la carte de
              soins.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">
              Funnel d&apos;activation
            </h3>
            <span className="text-[11px] text-ink/45">
              Estim. · cohorte récente
            </span>
          </div>
          <div className="space-y-2.5">
            {funnel.map((step, i) => (
              <div key={step.label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="font-semibold text-ink">{step.label}</span>
                  <span
                    className={cn(
                      "font-extrabold",
                      i === funnel.length - 1 ? "text-[#7B5900]" : "text-ink",
                    )}
                  >
                    {step.count} · {step.pct}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#FFEFF8]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      i === funnel.length - 1 ? "bg-[#7B5900]" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, step.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-[#FFEFF8] pt-4 md:grid-cols-2">
            <div className="rounded-xl bg-[#FFEFF8] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                Taux de conversion essais
              </p>
              <p className="mt-1 text-3xl font-black text-[#7B5900]">
                {kpis.convRate}%
              </p>
              <p className="mt-1 text-[12px] text-ink/55">
                {kpis.converted} payants · {kpis.trial} encore en essai
              </p>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                Soft-degrade
              </p>
              <p className="mt-2 text-[12px] text-ink/55">
                Progression et funnel estimés à partir des dates d&apos;essai —
                pas encore de checklist onboarding persistée.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 rounded-xl bg-[#FFEFF8] px-5 py-4 text-[11px] text-ink/50 md:flex-row">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#7B5900]" />
          Isolation multi-tenant · Conformité CNDP 09-08
        </span>
        <span>Rappel Beauté Super Admin · Onboarding &amp; Essais</span>
      </footer>

      {/* Drawer */}
      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#FFEFF8] pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                  Fiche onboarding
                </p>
                <h2 className="text-xl font-black text-ink">
                  {selected.organizationName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-ink/40 hover:bg-[#FFEFF8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#FFEFF8] p-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-ink/45">
                  Gérante
                </p>
                <p className="font-bold text-ink">
                  {selected.ownerName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-ink/45">
                  Échéance
                </p>
                <p className="font-bold text-primary">
                  {selected.status === "TRIAL"
                    ? `${Math.max(0, selected.daysLeft)} j restants`
                    : "Abonnement actif"}
                </p>
              </div>
            </div>
            <h4 className="mt-5 text-lg font-bold text-ink">
              Checklist d&apos;activation
            </h4>
            <p className="text-[11px] text-ink/40">
              Estimation soft-degrade ({selected.progress}%)
            </p>
            <ul className="mt-2 space-y-2">
              {STEPS.map((step, i) => {
                const done = i < selected.stepsDone;
                return (
                  <li
                    key={step.label}
                    className={cn(
                      "flex items-center justify-between rounded-lg p-3",
                      done ? "bg-[#FFEFF8]" : "bg-[#F0DDE9]/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <span className="h-5 w-5 rounded-full border-2 border-ink/20" />
                      )}
                      <span
                        className={cn(
                          "text-[13px]",
                          done
                            ? "font-semibold text-ink"
                            : "text-ink/60",
                        )}
                      >
                        {i + 1}. {step.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-ink/45">
                      {step.weight}%
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex gap-2 border-t border-[#FFEFF8] pt-4">
              <a
                href={waLink(
                  selected.phone,
                  selected.ownerName ?? selected.organizationName,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#FFEFF8] py-2.5 text-sm font-bold text-ink"
              >
                <MessageCircle className="h-4 w-4 text-[#7B5900]" />
                WhatsApp
              </a>
              {selected.status === "TRIAL" ? (
                <button
                  type="button"
                  onClick={() => void convertPaid(selected)}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white"
                >
                  Convertir payant
                </button>
              ) : (
                <Link
                  href={adminHref(`/organizations/${selected.organizationId}/`)}
                  className="flex flex-1 items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-bold text-white"
                >
                  Voir l&apos;institut
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Extend modal */}
      {extendTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">
                Prolongation d&apos;essai (+7 jours)
              </h3>
              <button
                type="button"
                onClick={() => setExtendTarget(null)}
                className="text-ink/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-[#FFEFF8] p-3">
              <p className="text-[10px] font-bold uppercase text-ink/45">
                Institut
              </p>
              <p className="font-bold text-ink">
                {extendTarget.organizationName}
              </p>
            </div>
            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase text-ink/45">
                Motif (obligatoire)
              </span>
              <select
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-sm"
              >
                <option value="commercial">
                  Accompagnement formation planning
                </option>
                <option value="holiday">
                  Fermeture / travaux / ramadan
                </option>
                <option value="import">Import clients complexe</option>
                <option value="negotiation">
                  Négociation multi-salons
                </option>
              </select>
            </label>
            <p className="mt-2 text-[11px] text-ink/40">
              Événement tracé dans l&apos;audit abonnements.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExtendTarget(null)}
                className="rounded-xl bg-[#F0DDE9] px-4 py-2.5 text-sm font-bold text-ink"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={extending}
                onClick={() => void confirmExtend()}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {extending ? "…" : "Valider +7 jours"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {enrollOpen ? (
        <EnrollModal
          onClose={() => setEnrollOpen(false)}
          onCreated={() => {
            setEnrollOpen(false);
            setToast("Institut enrôlé");
            void refresh();
          }}
          onError={(msg) => setError(msg)}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

const EXTEND_REASONS: Record<string, string> = {
  commercial: "Accompagnement gérante sur formation planning",
  holiday: "Période de fermeture pour travaux ou ramadan",
  import: "Importation complexe fichier clients",
  negotiation: "Négociation abonnement multi-salons",
};

function KpiCard({
  label,
  value,
  hint,
  icon,
  urgent,
  highlight,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  urgent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl p-3.5 shadow-sm",
        urgent ? "bg-[#FFEFF8]" : "bg-white",
      )}
    >
      <div className="flex items-center justify-between text-ink/45">
        <span
          className={cn(
            "text-[10px] font-bold uppercase",
            urgent && "text-primary",
          )}
        >
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-black",
            urgent || highlight ? "text-primary" : "text-ink",
          )}
        >
          {value}
        </span>
        {urgent ? (
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
            Urgent
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-ink/50">{hint}</p>
    </div>
  );
}

function EnrollModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Casablanca");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<PlanCode>("STARTER");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const parts = ownerName.trim().split(/\s+/);
      const firstName = parts[0] ?? "Gérante";
      const lastName = parts.slice(1).join(" ") || "Institut";
      const slug = slugify(name) || `institut-${Date.now()}`;
      const ownerEmail =
        email.trim() ||
        `${slugify(ownerName) || "owner"}@${slug}.ma`;
      await createOrganizationApi({
        name: name.trim(),
        slug,
        phone: phone.trim() || "+212600000000",
        email: ownerEmail,
        city,
        owner: {
          firstName,
          lastName,
          email: ownerEmail,
          phone: phone.trim() || null,
        },
        plan,
      });
      onCreated();
    } catch (ex) {
      onError(ex instanceof Error ? ex.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">Enrôler un institut</h3>
          <button type="button" onClick={onClose} className="text-ink/40">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-bold uppercase text-ink/45">
              Nom de l&apos;institut
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-sm"
              placeholder="Ex: Maison de Beauté Racine"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-ink/45">
              Ville
            </span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-sm"
            >
              {[
                "Casablanca",
                "Rabat",
                "Marrakech",
                "Tanger",
                "Fès",
                "Agadir",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-ink/45">
              Plan
            </span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanCode)}
              className="mt-1 h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-sm"
            >
              {(Object.keys(PLAN_LABEL) as PlanCode[]).map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-ink/45">
              Gérante
            </span>
            <input
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-sm"
              placeholder="Nadia Bennani"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase text-ink/45">
              WhatsApp
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-sm"
              placeholder="+212 6…"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-bold uppercase text-ink/45">
              Email (optionnel)
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-sm"
              placeholder="contact@institut.ma"
            />
          </label>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink/45">
          <ShieldCheck className="h-3.5 w-3.5 text-[#7B5900]" />
          Isolation multi-tenant à la création.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#F0DDE9] px-4 py-2.5 text-sm font-bold text-ink"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "…" : "Créer & envoyer invitation"}
          </button>
        </div>
      </form>
    </div>
  );
}
