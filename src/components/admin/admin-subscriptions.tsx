"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FlaskConical,
  Hourglass,
  Mail,
  PauseCircle,
  Pencil,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  AdminActionsMenu,
  adminMenuItemClass,
} from "@/components/admin/AdminActionsMenu";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  adminSubscriptionAction,
  createAdminSubscriptionApi,
  fetchAdminAudit,
  fetchAdminBilling,
  fetchAdminSubscriptions,
  type AdminSubscriptionRow,
} from "@/modules/admin/client";
import { PLAN_LABEL, platformAuditActionLabel } from "@/types/platform";
import type { SubscriptionPlan } from "@/types/platform";

type ModalKind = "change-plan" | "extend" | "suspend" | "trial" | "create" | "reminder" | null;
type ViewTab = "overview" | "subscriptions" | "payments" | "invoices" | "audit";

const PAGE_SIZE = 20;

function mad(n: number) {
  return `${Math.round(n).toLocaleString("fr-MA")} DH`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateLong(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return `Il y a ${Math.floor(hours / 24)} j`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function shortRef(id: string) {
  return `#SUB-${id.slice(-5).toUpperCase()}`;
}

function statusMeta(row: AdminSubscriptionRow) {
  if (row.status === "PAUSED") {
    return { label: "Suspendu", tone: "suspended" as const };
  }
  if (row.status === "CANCELLED") {
    return { label: "Résilié", tone: "archived" as const };
  }
  if (row.status === "PAST_DUE") {
    return { label: "Impayé", tone: "due" as const };
  }
  if (row.status === "TRIAL") {
    const d = Math.max(0, row.daysUntilExpiry);
    return {
      label: row.urgency === "soon" ? `Essai (J-${d})` : "Essai",
      tone: "trial" as const,
    };
  }
  if (row.urgency === "expired") {
    return { label: "Expiré", tone: "due" as const };
  }
  if (row.urgency === "soon") {
    return {
      label: row.daysUntilExpiry <= 2 ? "Expire <48h" : "Renouvellement",
      tone: "soon" as const,
    };
  }
  return { label: "Actif", tone: "active" as const };
}

function StatusPill({ row }: { row: AdminSubscriptionRow }) {
  const s = statusMeta(row);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
        s.tone === "active" && "bg-[#FFDEA4]/70 text-[#5D4200]",
        s.tone === "trial" && "bg-[#FFEFF8] text-ink",
        s.tone === "soon" && "bg-[#FCCA66]/50 text-[#755400]",
        s.tone === "due" && "bg-red-100 text-red-800",
        s.tone === "suspended" && "bg-ink text-white",
        s.tone === "archived" && "bg-stone-200 text-stone-600",
      )}
    >
      {s.tone === "trial" ? <FlaskConical className="h-3 w-3 text-[#7B5900]" /> : null}
      {s.tone === "due" ? <AlertTriangle className="h-3 w-3" /> : null}
      {s.tone === "active" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-[#7B5900]" />
      ) : null}
      {s.label}
    </span>
  );
}

export function AdminSubscriptionsView() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [tab, setTab] = useState<ViewTab>("overview");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminSubscriptionRow[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    active: 0,
    trial: 0,
    pastDue: 0,
    suspended: 0,
    expiringSoon: 0,
    expired: 0,
    mrr: 0,
  });
  const [plans, setPlans] = useState<{ id: string; code: string; name: string; price: number }[]>(
    [],
  );
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [mrrSeries, setMrrSeries] = useState<{ label: string; value: number }[]>([]);
  const [mrrGrowth, setMrrGrowth] = useState(0);
  const [audit, setAudit] = useState<
    {
      id: string;
      platformUserName: string | null;
      organizationName: string | null;
      action: string;
      createdAt: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<AdminSubscriptionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPlanId, setNewPlanId] = useState("");
  const [applyAt, setApplyAt] = useState<"now" | "next_period">("now");
  const [months, setMonths] = useState(1);
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const [createOrgId, setCreateOrgId] = useState("");
  const [createPlan, setCreatePlan] = useState<SubscriptionPlan>("INSTITUT");
  const [reminderText, setReminderText] = useState("");
  const [chartRange, setChartRange] = useState<"30" | "90" | "365">("365");

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("subs-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAdminSubscriptions({
        search: q || undefined,
        status: status !== "ALL" ? status : undefined,
      }),
      fetchAdminBilling().catch(() => null),
      fetchAdminAudit(40).catch(() => null),
    ])
      .then(([subs, billing, auditRes]) => {
        setItems(subs.items);
        setKpis({
          total: subs.kpis.total,
          active: subs.kpis.active,
          trial: subs.kpis.trial ?? 0,
          pastDue: subs.kpis.pastDue ?? 0,
          suspended: subs.kpis.suspended ?? 0,
          expiringSoon: subs.kpis.expiringSoon,
          expired: subs.kpis.expired,
          mrr: subs.kpis.mrr,
        });
        setPlans(subs.plans);
        setOrgs(subs.organizations);
        if (billing) {
          setMrrSeries(billing.mrrSeries ?? []);
          setMrrGrowth(billing.mrrGrowthPercent ?? 0);
        }
        if (auditRes) {
          setAudit(
            auditRes.items.filter(
              (a) =>
                a.entityType === "Subscription" ||
                a.action.includes("SUBSCRIPTION") ||
                a.action.includes("PAYMENT"),
            ),
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, city, dueFilter, tab]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const o of items) {
      if (o.organizationCity?.trim()) set.add(o.organizationCity.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (city !== "ALL" && (row.organizationCity ?? "") !== city) return false;
      if (dueFilter === "48h" && !(row.daysUntilExpiry >= 0 && row.daysUntilExpiry <= 2)) {
        return false;
      }
      if (dueFilter === "7d" && !(row.daysUntilExpiry >= 0 && row.daysUntilExpiry <= 7)) {
        return false;
      }
      return true;
    });
  }, [items, city, dueFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, filtered.length);

  const selectedRow =
    filtered.find((r) => r.id === selectedId) ??
    items.find((r) => r.id === selectedId) ??
    null;

  const offerPlan =
    plans.find((p) => p.code === "INSTITUT") ??
    plans.find((p) => p.code === "PREMIUM") ??
    plans[0] ??
    null;

  const activePct =
    kpis.total > 0 ? Math.round((kpis.active / kpis.total) * 1000) / 10 : 0;
  const trialPct =
    kpis.total > 0 ? Math.round((kpis.trial / kpis.total) * 1000) / 10 : 0;
  const duePct =
    kpis.total > 0
      ? Math.round(((kpis.pastDue + kpis.suspended) / kpis.total) * 1000) / 10
      : 0;

  const pastDueItems = useMemo(
    () => items.filter((r) => r.status === "PAST_DUE").slice(0, 4),
    [items],
  );
  const trialSoonItems = useMemo(
    () =>
      items
        .filter((r) => r.status === "TRIAL" && r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 7)
        .slice(0, 5),
    [items],
  );

  const chartData = useMemo(() => {
    if (chartRange === "30") return mrrSeries.slice(-1);
    if (chartRange === "90") return mrrSeries.slice(-3);
    return mrrSeries;
  }, [mrrSeries, chartRange]);

  function openModal(kind: ModalKind, row: AdminSubscriptionRow | null = null) {
    setSelected(row);
    setReason("");
    setMonths(1);
    setDays(30);
    setApplyAt("now");
    setNewPlanId(row ? plans.find((p) => p.code !== row.planCode)?.id ?? plans[0]?.id ?? "" : "");
    setReminderText("");
    setModal(kind);
    if (kind === "reminder" && row) {
      void adminSubscriptionAction(row.id, { action: "reminder" }).then((r) =>
        setReminderText(r.messageTemplate ?? ""),
      );
    }
  }

  async function runAction(body: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await adminSubscriptionAction(selected.id, body);
      if (body.action === "reminder" && res.messageTemplate) {
        setReminderText(res.messageTemplate);
        return;
      }
      setModal(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = [
      "id",
      "institut",
      "ville",
      "plan",
      "statut",
      "tarif",
      "debut",
      "echeance",
      "paiement",
    ];
    const lines = filtered.map((r) =>
      [
        r.id,
        r.organizationName,
        r.organizationCity ?? "",
        r.planCode,
        r.status,
        r.priceSnapshot,
        r.currentPeriodStart.slice(0, 10),
        r.currentPeriodEnd.slice(0, 10),
        r.paymentLabel,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abonnements-rappel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: ViewTab; label: string; count?: number }[] = [
    { id: "overview", label: "Vue générale" },
    { id: "subscriptions", label: "Abonnements", count: kpis.total },
    { id: "payments", label: "Paiements", count: kpis.active },
    { id: "invoices", label: "Factures" },
    { id: "audit", label: "Piste d'audit" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Contrats & Flux SaaS Maroc
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
            Abonnements & Facturation
          </h1>
          <p className="text-[15px] text-ink/55">
            Cycle de vie contractuel des {kpis.total} instituts — activation, essais,
            renouvellements et impayés.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex min-w-[200px] flex-1 items-center sm:max-w-xs">
            <Search className="absolute left-3 h-4 w-4 text-ink/35" />
            <input
              id="subs-search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Institut, e-mail, #SUB…"
              className="h-11 w-full rounded-xl bg-white pl-9 pr-12 text-sm shadow-sm placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <kbd className="absolute right-2 hidden rounded bg-[#FFEFF8] px-1.5 py-0.5 text-[10px] font-bold text-ink/45 sm:inline">
              ⌘K
            </kbd>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-ink shadow-sm"
          >
            <Download className="h-4 w-4 text-[#7B5900]" />
            Exporter CSV
          </button>
          <Link
            href={adminHref("/plans/")}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm"
          >
            <Pencil className="h-4 w-4" />
            Gérer l&apos;offre
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[#F0DDE9]/80 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative shrink-0 px-3 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "text-primary" : "text-ink/45 hover:text-ink",
            )}
          >
            {t.label}
            {t.count != null ? (
              <span className="ml-1.5 rounded-full bg-[#FFEFF8] px-1.5 text-[11px] font-bold text-ink/50">
                {t.count}
              </span>
            ) : null}
            {tab === t.id ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        ))}
      </nav>

      {/* KPIs */}
      {(tab === "overview" || tab === "subscriptions") && (
        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {/* Mobile MRR hero */}
          <div className="col-span-2 rounded-2xl bg-ink p-4 text-white shadow-md md:hidden">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 animate-ping rounded-full bg-[#FFDEA4]" />
                MRR net
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[#FFDEA4]">
                {mrrGrowth >= 0 ? "+" : ""}
                {mrrGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight">
              {mad(kpis.mrr)} <span className="text-base font-medium text-[#FFDEA4]">HT</span>
            </p>
            <p className="mt-2 border-t border-white/10 pt-2 text-xs text-white/50">
              ARR : {mad(kpis.mrr * 12)} HT
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Total
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">{kpis.total}</p>
            <p className="mt-0.5 text-[11px] text-ink/50">100% du parc</p>
          </div>
          <div className="rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Actifs payants
              <span className="h-2.5 w-2.5 rounded-full bg-[#7B5900]" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">{kpis.active}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#7B5900]">
              {activePct}% du parc
            </p>
          </div>
          <div className="rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink/45">
              En essai
              <FlaskConical className="h-4 w-4 text-[#7B5900]" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">{kpis.trial}</p>
            <p className="mt-0.5 text-[11px] font-bold text-primary">
              {kpis.expiringSoon} bientôt
            </p>
          </div>
          <div className="hidden rounded-2xl bg-white p-3.5 shadow-sm md:block">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink/45">
              MRR courant
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-xl font-black text-primary">{mad(kpis.mrr)} HT</p>
            <p className="mt-0.5 text-[11px] text-ink/50">ARR {mad(kpis.mrr * 12)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Impayés
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-red-600">{kpis.pastDue}</p>
            <p className="mt-0.5 text-[11px] font-bold text-red-600">À recouvrer</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-[#FFEFF8] p-3.5 shadow-sm sm:col-span-1 xl:col-span-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Renouvellements
              <Hourglass className="h-4 w-4 text-[#7B5900]" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">{kpis.expiringSoon}</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#7B5900]">Échéance &lt; 7j</p>
          </div>
        </section>
      )}

      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {/* Offer + main content for overview/subscriptions */}
      {(tab === "overview" || tab === "subscriptions") && !loading ? (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">
            {/* Offer card */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#FFDEA4]/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#5D4200]">
                      Architecture tarifaire Maroc
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-ink md:text-2xl">
                    {offerPlan ? offerPlan.name : "Offre Rappel Beauty SaaS"}
                  </h2>
                  <p className="text-sm text-ink/55">
                    Formule standardisée — modules institut débloqués selon le plan.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end">
                  <div>
                    <span className="text-4xl font-black text-primary md:text-5xl">
                      {offerPlan ? Math.round(offerPlan.price) : "—"}
                    </span>
                    <span className="text-lg font-bold text-ink"> DH</span>
                    <span className="block text-xs text-ink/45">HT / mois / institut</span>
                  </div>
                  <Link
                    href={adminHref("/plans/")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-3 py-2 text-sm font-semibold text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Link>
                </div>
              </div>
              <div className="border-t border-[#F0DDE9]/60 bg-[#FFEFF8]/50 px-5 py-4 md:px-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink/45">
                  Périmètre inclus
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: Users, label: "Utilisateurs" },
                    { icon: Calendar, label: "Agenda & RDV" },
                    { icon: CreditCard, label: "Caisse & POS" },
                    { icon: Shield, label: "Analytics & CNDP" },
                  ].map((f) => (
                    <span
                      key={f.label}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs text-ink shadow-sm"
                    >
                      <f.icon className="h-3.5 w-3.5 text-[#7B5900]" />
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile alerts */}
            <div className="space-y-3 lg:hidden">
              {pastDueItems[0] ? (
                <div className="rounded-2xl bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-ink">{pastDueItems[0].organizationName}</p>
                        <p className="text-xs text-ink/45">
                          {pastDueItems[0].organizationCity ?? "—"} · Impayé
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">
                      {mad(pastDueItems[0].priceSnapshot)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(pastDueItems[0].id)}
                      className="h-10 rounded-lg bg-[#FFEFF8] text-xs font-semibold"
                    >
                      Détails
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal("reminder", pastDueItems[0])}
                      className="h-10 rounded-lg bg-emerald-800 text-xs font-semibold text-white"
                    >
                      Relancer
                    </button>
                  </div>
                </div>
              ) : null}
              {trialSoonItems[0] ? (
                <div className="rounded-2xl bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFDEA4]/40 text-[#5D4200]">
                        <Hourglass className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-ink">{trialSoonItems[0].organizationName}</p>
                        <p className="text-xs text-ink/45">
                          Expire le {fmtDate(trialSoonItems[0].currentPeriodEnd)}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#FFDEA4]/70 px-2 py-0.5 text-[11px] font-bold text-[#5D4200]">
                      J-{Math.max(0, trialSoonItems[0].daysUntilExpiry)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openModal("extend", trialSoonItems[0])}
                    className="mt-3 h-10 w-full rounded-lg bg-primary text-xs font-bold text-white"
                  >
                    Convertir / prolonger
                  </button>
                </div>
              ) : null}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-ink/45">Statut</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-transparent font-semibold focus:outline-none"
                  >
                    <option value="ALL">Tous ({kpis.total})</option>
                    <option value="ACTIVE">Actifs ({kpis.active})</option>
                    <option value="TRIAL">Essai ({kpis.trial})</option>
                    <option value="PAST_DUE">Impayés ({kpis.pastDue})</option>
                    <option value="PAUSED">Suspendus ({kpis.suspended})</option>
                    <option value="EXPIRING_SOON">Expire bientôt</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-ink/45">Ville</span>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-transparent font-semibold focus:outline-none"
                  >
                    <option value="ALL">Toutes</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-ink/45">Échéance</span>
                  <select
                    value={dueFilter}
                    onChange={(e) => setDueFilter(e.target.value)}
                    className="bg-transparent font-semibold focus:outline-none"
                  >
                    <option value="ALL">Toutes</option>
                    <option value="48h">Sous 48h</option>
                    <option value="7d">Sous 7 jours</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatus("ALL");
                  setCity("ALL");
                  setDueFilter("ALL");
                }}
                className="rounded-lg p-1.5 text-ink/40 hover:bg-[#FFEFF8] hover:text-ink"
                title="Réinitialiser"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm xl:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-[#FFEFF8]/60 text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <tr>
                      <th className="px-4 py-3 font-medium">Institut & ville</th>
                      <th className="px-3 py-3 font-medium">Plan & tarif</th>
                      <th className="px-3 py-3 font-medium">Statut</th>
                      <th className="px-3 py-3 font-medium">Début</th>
                      <th className="px-3 py-3 font-medium">Échéance</th>
                      <th className="px-3 py-3 font-medium">Paiement</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0DDE9]/70">
                    {pageItems.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-[#FFEFF8]/50",
                          selectedId === row.id && "bg-primary/5",
                          row.status === "PAST_DUE" && "bg-red-50/40",
                          row.status === "PAUSED" && "opacity-75",
                        )}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                row.status === "PAST_DUE"
                                  ? "bg-red-500"
                                  : row.status === "PAUSED"
                                    ? "bg-ink"
                                    : "bg-[#7B5900]",
                              )}
                            />
                            <div>
                              <p className="font-bold text-ink">{row.organizationName}</p>
                              <p className="text-[12px] text-ink/45">
                                {row.organizationCity ?? "—"} · {shortRef(row.id)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="text-xs font-bold text-ink">{mad(row.priceSnapshot)}</p>
                          <p className="text-[11px] text-ink/45">
                            {PLAN_LABEL[row.planCode]}
                            {row.status === "TRIAL" ? " · Essai" : " HT/mois"}
                          </p>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusPill row={row} />
                        </td>
                        <td className="px-3 py-3.5 text-[13px] text-ink/50">
                          {fmtDate(row.currentPeriodStart)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3.5 text-[13px] font-semibold",
                            row.status === "PAST_DUE" || row.urgency === "expired"
                              ? "text-red-600"
                              : row.urgency === "soon"
                                ? "text-[#7B5900]"
                                : "text-ink",
                          )}
                        >
                          {row.urgency === "expired" && row.status !== "TRIAL"
                            ? "Échue"
                            : fmtDate(row.currentPeriodEnd)}
                        </td>
                        <td className="px-3 py-3.5">
                          <p
                            className={cn(
                              "flex items-center gap-1 text-[12px] font-semibold",
                              row.status === "PAST_DUE" ? "text-red-600" : "text-[#7B5900]",
                            )}
                          >
                            {row.status === "PAST_DUE" ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : row.status === "TRIAL" ? (
                              <Hourglass className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {row.paymentLabel}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {row.status === "PAST_DUE" ? (
                              <button
                                type="button"
                                className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white"
                                onClick={() => openModal("reminder", row)}
                              >
                                Relancer
                              </button>
                            ) : row.status === "PAUSED" ? (
                              <button
                                type="button"
                                className="rounded-md bg-[#7B5900] px-2.5 py-1 text-[11px] font-bold text-white"
                                onClick={() =>
                                  void adminSubscriptionAction(row.id, {
                                    action: "reactivate",
                                  }).then(load)
                                }
                              >
                                Réactiver
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-[11px] font-bold",
                                  selectedId === row.id
                                    ? "bg-primary text-white"
                                    : "bg-[#FFEFF8] text-ink",
                                )}
                                onClick={() => setSelectedId(row.id)}
                              >
                                Gérer
                              </button>
                            )}
                            <AdminActionsMenu triggerLabel="⋯">
                              {(close) => (
                                <>
                                  <Link
                                    href={adminHref(`/subscriptions/${row.id}/`)}
                                    className={adminMenuItemClass}
                                    onClick={close}
                                  >
                                    Voir l&apos;abonnement
                                  </Link>
                                  <button
                                    type="button"
                                    className={adminMenuItemClass}
                                    onClick={() => {
                                      close();
                                      openModal("extend", row);
                                    }}
                                  >
                                    Prolonger
                                  </button>
                                  <button
                                    type="button"
                                    className={adminMenuItemClass}
                                    onClick={() => {
                                      close();
                                      openModal("change-plan", row);
                                    }}
                                  >
                                    Changer le plan
                                  </button>
                                  <button
                                    type="button"
                                    className={adminMenuItemClass}
                                    onClick={() => {
                                      close();
                                      openModal("trial", row);
                                    }}
                                  >
                                    Période gratuite
                                  </button>
                                  {row.status !== "PAUSED" ? (
                                    <button
                                      type="button"
                                      className={adminMenuItemClass}
                                      onClick={() => {
                                        close();
                                        openModal("suspend", row);
                                      }}
                                    >
                                      Suspendre
                                    </button>
                                  ) : null}
                                  <Link
                                    href={adminHref(`/organizations/${row.organizationId}/`)}
                                    className={adminMenuItemClass}
                                    onClick={close}
                                  >
                                    Voir l&apos;institut
                                  </Link>
                                </>
                              )}
                            </AdminActionsMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-center justify-between gap-3 border-t border-[#F0DDE9]/60 p-4 sm:flex-row">
                <p className="text-xs text-ink/45">
                  Affichage <span className="font-bold text-ink">{from}</span> à{" "}
                  <span className="font-bold text-ink">{to}</span> sur{" "}
                  <span className="font-bold text-ink">{filtered.length}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-md bg-[#FFEFF8] px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={pageSafe >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold shadow-sm disabled:opacity-40"
                  >
                    Suivant
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile cards */}
            <section className="space-y-3 xl:hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Portefeuille salons</h2>
                <span className="text-xs text-ink/45">
                  {from}–{to} / {filtered.length}
                </span>
              </div>
              {pageItems.map((row) => (
                <article
                  key={row.id}
                  className={cn(
                    "rounded-2xl bg-white p-4 shadow-sm",
                    row.status === "PAUSED" && "opacity-80",
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                            row.status === "PAST_DUE"
                              ? "bg-red-50 text-red-700"
                              : row.status === "TRIAL"
                                ? "bg-[#FFDEA4]/40 text-[#5D4200]"
                                : "bg-[#FFEFF8] text-primary",
                          )}
                        >
                          {initials(row.organizationName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">
                            {row.organizationName}
                          </p>
                          <p className="font-mono text-[11px] text-ink/45">
                            {shortRef(row.id)}
                            {row.organizationCity ? ` · ${row.organizationCity}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusPill row={row} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#FFEFF8]/80 p-3 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-ink/40">Formule</p>
                        <p className="font-bold text-primary">
                          {mad(row.priceSnapshot)}{" "}
                          <span className="text-[11px] font-normal text-ink/45">HT</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-ink/40">Échéance</p>
                        <p className="font-semibold text-ink">{fmtDate(row.currentPeriodEnd)}</p>
                      </div>
                    </div>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openModal("extend", row)}
                      className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-[#FFEFF8] text-xs font-semibold"
                    >
                      Prolonger
                    </button>
                    <Link
                      href={adminHref(`/subscriptions/${row.id}/`)}
                      className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-ink text-xs font-semibold text-white"
                    >
                      Fiche contrat
                    </Link>
                  </div>
                </article>
              ))}
              <div className="flex items-center justify-between pt-1 text-xs text-ink/45">
                <span>
                  Page {pageSafe} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md bg-stone-200 px-2.5 py-1 disabled:opacity-40"
                  >
                    Préc.
                  </button>
                  <button
                    type="button"
                    disabled={pageSafe >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md bg-primary px-2.5 py-1 font-bold text-white disabled:opacity-40"
                  >
                    Suiv.
                  </button>
                </div>
              </div>
            </section>

            {/* Charts */}
            {tab === "overview" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="rounded-2xl bg-white p-4 shadow-sm md:col-span-7">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Trajectoire financière
                      </p>
                      <h3 className="text-base font-bold text-ink">Évolution MRR</h3>
                    </div>
                    <div className="flex rounded-lg bg-[#FFEFF8] p-0.5 text-[11px]">
                      {(
                        [
                          ["30", "30j"],
                          ["90", "3 mois"],
                          ["365", "12 mois"],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setChartRange(v)}
                          className={cn(
                            "rounded-md px-2 py-0.5 font-semibold",
                            chartRange === v
                              ? "bg-white text-primary shadow-sm"
                              : "text-ink/45",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-44 w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ba0049" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="#ba0049" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" hide />
                          <YAxis hide />
                          <Tooltip
                            formatter={(value) => [
                              mad(typeof value === "number" ? value : Number(value) || 0),
                              "MRR",
                            ]}
                            contentStyle={{
                              borderRadius: 8,
                              border: "none",
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#ba0049"
                            strokeWidth={3}
                            fill="url(#mrrFill)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-sm text-ink/40">
                        Pas encore de série MRR
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex justify-between text-[12px] text-ink/45">
                    <span>MRR actuel : {mad(kpis.mrr)}</span>
                    <span className="font-bold text-[#7B5900]">
                      {mrrGrowth >= 0 ? "+" : ""}
                      {mrrGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm md:col-span-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                    Santé contractuelle
                  </p>
                  <h3 className="text-base font-bold text-ink">Ventilation des statuts</h3>
                  <div className="my-4 flex justify-center">
                    <div className="relative h-28 w-28">
                      <svg className="-rotate-90 h-full w-full" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="#F0DDE9"
                          strokeWidth="3.8"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="#7b5900"
                          strokeWidth="3.8"
                          strokeDasharray={`${activePct} ${100 - activePct}`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="#fcca66"
                          strokeWidth="3.8"
                          strokeDasharray={`${trialPct} ${100 - trialPct}`}
                          strokeDashoffset={-activePct}
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="#ba1a1a"
                          strokeWidth="3.8"
                          strokeDasharray={`${duePct} ${100 - duePct}`}
                          strokeDashoffset={-(activePct + trialPct)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-bold leading-none text-ink">
                          {kpis.total}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-ink/45">
                          Contrats
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#7B5900]" />
                        Actifs ({kpis.active})
                      </span>
                      <span className="font-bold">{activePct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#FCCA66]" />
                        Essais ({kpis.trial})
                      </span>
                      <span className="font-bold">{trialPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                        Impayés / suspendus ({kpis.pastDue + kpis.suspended})
                      </span>
                      <span className="font-bold text-red-600">{duePct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right column */}
          <div className="hidden min-w-0 flex-col gap-4 lg:col-span-4 lg:flex">
            {selectedRow ? (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <StatusPill row={selectedRow} />
                    <h3 className="mt-2 text-lg font-bold text-ink">
                      {selectedRow.organizationName}
                    </h3>
                    <p className="font-mono text-xs font-bold text-primary">
                      {shortRef(selectedRow.id)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-ink/40 hover:bg-[#FFEFF8]"
                    onClick={() => setSelectedId(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-3 space-y-2 rounded-xl bg-[#FFEFF8]/80 p-3 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-ink/45">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                    <span className="truncate font-medium text-ink">
                      {selectedRow.organizationEmail ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45">Ville</span>
                    <span className="font-semibold">{selectedRow.organizationCity ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45">Échéance</span>
                    <span className="font-bold text-[#7B5900]">
                      {fmtDateLong(selectedRow.currentPeriodEnd)}
                      {selectedRow.daysUntilExpiry >= 0
                        ? ` (J+${selectedRow.daysUntilExpiry})`
                        : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45">Tarif</span>
                    <span className="font-semibold">
                      {mad(selectedRow.priceSnapshot)} · {PLAN_LABEL[selectedRow.planCode]}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink/45">
                  Actions Super Admin
                </p>
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => openModal("extend", selectedRow)}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#FFEFF8] text-sm font-semibold"
                  >
                    <Calendar className="h-4 w-4 text-[#7B5900]" />
                    Prolonger (+1 mois)
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRow.status === "PAUSED" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void adminSubscriptionAction(selectedRow.id, {
                            action: "reactivate",
                          }).then(load)
                        }
                        className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FFDEA4]/50 text-[13px] font-semibold text-[#5D4200]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Réactiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openModal("suspend", selectedRow)}
                        className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FFDEA4]/40 text-[13px] font-semibold text-[#5D4200]"
                      >
                        <PauseCircle className="h-4 w-4" />
                        Suspendre
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !confirm(
                            `Résilier l'abonnement de ${selectedRow.organizationName} ?`,
                          )
                        ) {
                          return;
                        }
                        void adminSubscriptionAction(selectedRow.id, {
                          action: "cancel",
                        }).then(load);
                      }}
                      className="flex h-10 items-center justify-center gap-1 rounded-lg bg-red-50 text-[13px] font-semibold text-red-800"
                    >
                      <Ban className="h-4 w-4" />
                      Résilier
                    </button>
                  </div>
                  <Link
                    href={adminHref(`/subscriptions/${selectedRow.id}/`)}
                    className="flex h-10 w-full items-center justify-center rounded-lg bg-ink text-sm font-bold text-white"
                  >
                    Ouvrir la fiche complète
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-ink/40 shadow-sm">
                Sélectionnez un abonnement pour afficher le volet de gestion.
              </div>
            )}

            {/* Impayés panel */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Impayés ({kpis.pastDue})
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {pastDueItems.length === 0 ? (
                  <p className="text-xs text-ink/45">Aucun impayé.</p>
                ) : (
                  pastDueItems.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl bg-red-50/50 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">{row.organizationName}</p>
                        <span className="text-[11px] font-bold text-red-600">
                          {mad(row.priceSnapshot)}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink/45">{row.organizationCity ?? "—"}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openModal("reminder", row)}
                          className="rounded bg-white px-2 py-1 text-[11px] font-bold text-[#7B5900] shadow-sm"
                        >
                          Relancer
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className="rounded bg-white px-2 py-1 text-[11px] text-ink/50 shadow-sm"
                        >
                          Détail
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trials panel */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <Hourglass className="h-4 w-4 text-[#7B5900]" />
                  Essais &lt; 7j
                </div>
                <span className="text-[11px] font-bold text-[#7B5900]">
                  {trialSoonItems.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {trialSoonItems.length === 0 ? (
                  <p className="text-xs text-ink/45">Aucun essai critique.</p>
                ) : (
                  trialSoonItems.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[#FFEFF8] p-2"
                    >
                      <div>
                        <p className="text-sm font-bold text-ink">{row.organizationName}</p>
                        <p className="text-[11px] text-[#7B5900]">
                          Expire {fmtDate(row.currentPeriodEnd)} (J-
                          {Math.max(0, row.daysUntilExpiry)})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openModal("extend", row)}
                        className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Convertir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit peek */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-ink">
                <Shield className="h-4 w-4 text-[#7B5900]" />
                Journal d&apos;audit
              </div>
              <div className="mt-3 space-y-2">
                {audit.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-[11px] text-ink/55">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B5900]" />
                    <div>
                      <p className="font-bold text-ink">
                        {platformAuditActionLabel(a.action)}
                      </p>
                      <p>
                        {a.organizationName ?? "Plateforme"} · {relativeTime(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {audit.length === 0 ? (
                  <p className="text-xs text-ink/40">Aucune entrée récente.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile detail sheet */}
      {selectedRow && (tab === "overview" || tab === "subscriptions") ? (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-ink/40"
            onClick={() => setSelectedId(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <StatusPill row={selectedRow} />
                <h3 className="mt-2 text-lg font-bold">{selectedRow.organizationName}</h3>
                <p className="font-mono text-xs text-primary">{shortRef(selectedRow.id)}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-ink/40"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 rounded-xl bg-[#FFEFF8] p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/45">Échéance</span>
                <span className="font-bold">{fmtDate(selectedRow.currentPeriodEnd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/45">Tarif</span>
                <span className="font-bold">{mad(selectedRow.priceSnapshot)}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openModal("extend", selectedRow)}
                className="h-11 rounded-xl bg-[#FFEFF8] text-sm font-semibold"
              >
                Prolonger
              </button>
              <Link
                href={adminHref(`/subscriptions/${selectedRow.id}/`)}
                className="flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white"
              >
                Fiche complète
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">Paiements & passerelle</h2>
          <p className="mt-1 text-sm text-ink/55">
            Suivi MRR, ARR et encaissements plateforme.
          </p>
          <Link
            href={adminHref("/billing/")}
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
          >
            Ouvrir MRR & Revenus
          </Link>
        </div>
      ) : null}

      {tab === "invoices" ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">Factures plateforme</h2>
          <p className="mt-1 text-sm text-ink/55">
            Les lignes de facturation SaaS sont disponibles dans le module facturation.
          </p>
          <Link
            href={adminHref("/billing/")}
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
          >
            Voir la facturation
          </Link>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-ink">Piste d&apos;audit abonnements</h2>
          <ul className="mt-4 divide-y divide-[#F0DDE9]/80">
            {audit.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-ink">
                    {platformAuditActionLabel(a.action)}
                  </p>
                  <p className="text-xs text-ink/45">
                    {a.organizationName ?? "—"} · {a.platformUserName ?? "Système"}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-ink/40">
                  {relativeTime(a.createdAt)}
                </span>
              </li>
            ))}
            {audit.length === 0 ? (
              <li className="py-6 text-center text-sm text-ink/40">Aucun événement.</li>
            ) : null}
          </ul>
          <Link
            href={adminHref("/system/logs/")}
            className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Voir tous les logs →
          </Link>
        </div>
      ) : null}

      <footer className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFDEA4]/50 text-[#5D4200]">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Conformité CNDP · Loi 09-08</p>
            <p className="text-xs text-ink/50">
              Isolation multi-tenant · Hébergement souverain Maroc
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openModal("create")}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          + Créer un abonnement
        </button>
      </footer>

      {/* Modals */}
      {modal && (selected || modal === "create") ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#F0DDE9] bg-white p-6 shadow-xl">
            {modal === "change-plan" && selected ? (
              <>
                <h2 className="text-xl font-bold">Changer le plan</h2>
                <p className="mt-1 text-sm text-ink/50">{selected.organizationName}</p>
                <label className="mt-4 block text-sm">
                  Nouveau plan
                  <select
                    className="mt-1 w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] px-3 py-2"
                    value={newPlanId}
                    onChange={(e) => setNewPlanId(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.price} DH/mois
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="mt-4 space-y-2 text-sm">
                  <legend className="font-medium">Application</legend>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={applyAt === "now"}
                      onChange={() => setApplyAt("now")}
                    />
                    Maintenant
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={applyAt === "next_period"}
                      onChange={() => setApplyAt("next_period")}
                    />
                    Prochaine période
                  </label>
                </fieldset>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/60"
                    onClick={() => setModal(null)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                    disabled={busy || !newPlanId}
                    onClick={() =>
                      void runAction({ action: "change-plan", planId: newPlanId, applyAt })
                    }
                  >
                    Confirmer
                  </button>
                </div>
              </>
            ) : null}

            {modal === "extend" && selected ? (
              <>
                <h2 className="text-xl font-bold">Prolonger</h2>
                <p className="mt-2 text-sm">
                  Échéance actuelle : <strong>{fmtDate(selected.currentPeriodEnd)}</strong>
                </p>
                <label className="mt-4 block text-sm">
                  Durée
                  <select
                    className="mt-1 w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] px-3 py-2"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    <option value={1}>1 mois</option>
                    <option value={3}>3 mois</option>
                    <option value={6}>6 mois</option>
                    <option value={12}>12 mois</option>
                  </select>
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/60"
                    onClick={() => setModal(null)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                    disabled={busy}
                    onClick={() => void runAction({ action: "extend", months })}
                  >
                    Prolonger
                  </button>
                </div>
              </>
            ) : null}

            {modal === "suspend" && selected ? (
              <>
                <h2 className="text-xl font-bold">Suspendre</h2>
                <p className="mt-2 text-sm">{selected.organizationName}</p>
                <label className="mt-4 block text-sm">
                  Motif
                  <input
                    className="mt-1 w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] px-3 py-2"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Impayé, demande client…"
                  />
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/60"
                    onClick={() => setModal(null)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
                    disabled={busy}
                    onClick={() => void runAction({ action: "suspend", reason })}
                  >
                    Suspendre
                  </button>
                </div>
              </>
            ) : null}

            {modal === "trial" && selected ? (
              <>
                <h2 className="text-xl font-bold">Période gratuite</h2>
                <label className="mt-4 block text-sm">
                  Durée (jours)
                  <select
                    className="mt-1 w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] px-3 py-2"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    <option value={7}>7 jours</option>
                    <option value={14}>14 jours</option>
                    <option value={30}>30 jours</option>
                    <option value={60}>60 jours</option>
                  </select>
                </label>
                <label className="mt-3 block text-sm">
                  Motif
                  <input
                    className="mt-1 w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] px-3 py-2"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Offre commerciale"
                  />
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/60"
                    onClick={() => setModal(null)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                    disabled={busy}
                    onClick={() =>
                      void runAction({
                        action: "grant-trial",
                        days,
                        reason: reason || "Offre commerciale",
                      })
                    }
                  >
                    Accorder
                  </button>
                </div>
              </>
            ) : null}

            {modal === "reminder" && selected ? (
              <>
                <h2 className="text-xl font-bold">Rappel de paiement</h2>
                <p className="mt-2 text-sm text-amber-800">
                  Message préparé — envoi WhatsApp non automatique.
                </p>
                <textarea
                  className="mt-4 min-h-[160px] w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] p-3 font-mono text-xs"
                  value={reminderText}
                  onChange={(e) => setReminderText(e.target.value)}
                />
                {!reminderText ? (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-primary"
                    onClick={() =>
                      void adminSubscriptionAction(selected.id, { action: "reminder" }).then(
                        (r) => setReminderText(r.messageTemplate ?? ""),
                      )
                    }
                  >
                    Générer le message
                  </button>
                ) : null}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/60"
                    onClick={() => setModal(null)}
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                    onClick={() => void navigator.clipboard?.writeText(reminderText)}
                  >
                    Copier
                  </button>
                </div>
              </>
            ) : null}

            {modal === "create" ? (
              <>
                <h2 className="text-xl font-bold">Créer un abonnement</h2>
                <label className="mt-4 block text-sm">
                  Institut
                  <select
                    className="mt-1 w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] px-3 py-2"
                    value={createOrgId}
                    onChange={(e) => setCreateOrgId(e.target.value)}
                  >
                    <option value="">Choisir…</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-sm">
                  Plan
                  <select
                    className="mt-1 w-full rounded-xl border border-[#F0DDE9] bg-[#FFEFF8] px-3 py-2"
                    value={createPlan}
                    onChange={(e) => setCreatePlan(e.target.value as SubscriptionPlan)}
                  >
                    <option value="STARTER">Starter</option>
                    <option value="INSTITUT">Institut</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/60"
                    onClick={() => setModal(null)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                    disabled={busy || !createOrgId}
                    onClick={() =>
                      void (async () => {
                        setBusy(true);
                        try {
                          await createAdminSubscriptionApi({
                            organizationId: createOrgId,
                            planCode: createPlan,
                          });
                          setModal(null);
                          load();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Erreur");
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Créer
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
