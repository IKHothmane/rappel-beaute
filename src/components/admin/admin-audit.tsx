"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Filter,
  KeyRound,
  Lock,
  LogIn,
  Monitor,
  PauseCircle,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  fetchAdminAudit,
  fetchOrganizations,
} from "@/modules/admin/client";
import { platformAuditActionLabel } from "@/types/platform";

type AuditRow = Awaited<ReturnType<typeof fetchAdminAudit>>["items"][number];
type OrgOption = { id: string; name: string };

type TabKey = "all" | "roles" | "auth" | "security" | "alerts" | "sessions";
type ResultFilter = "" | "success" | "failure";
type PeriodKey = "today" | "yesterday" | "7d" | "30d" | "all";

const PAGE_SIZE = 12;

function fmtJson(v: unknown): string {
  if (v == null) return "—";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function redactJson(v: unknown): string {
  return fmtJson(v)
    .replace(
      /("(password|token|secret|cvv|authorization|jwt|apiKey|api_key)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"',
    )
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function reqId(id: string) {
  return `req_${id.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`;
}

function relativeFr(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function isFailure(action: string) {
  const a = action.toUpperCase();
  return (
    a.includes("FAILED") ||
    a.includes("ERROR") ||
    a.includes("DELETE") ||
    a.includes("SUSPEND") ||
    a.includes("CANCEL") ||
    a.includes("ARCHIVE") ||
    a.includes("DISABLE")
  );
}

function isAuth(action: string) {
  const a = action.toUpperCase();
  return (
    a.includes("LOGIN") ||
    a.includes("LOGOUT") ||
    a.includes("SESSION") ||
    a.includes("PASSWORD")
  );
}

function isRoleSensitive(action: string) {
  const a = action.toUpperCase();
  return (
    a.includes("ROLE") ||
    a.includes("PASSWORD") ||
    a.includes("SUSPEND") ||
    a.includes("DELETE") ||
    a.includes("ARCHIVE") ||
    a.includes("OWNER_ACCESS")
  );
}

function isSecurityAlert(action: string) {
  const a = action.toUpperCase();
  return (
    a.includes("FAILED") ||
    a.includes("PASSWORD") ||
    a.includes("ROLE") ||
    a.includes("SUSPEND") ||
    a.includes("INVALIDAT") ||
    a.includes("DISABLE")
  );
}

function actionCategory(action: string): string {
  const a = action.toUpperCase();
  if (isAuth(a)) return "AUTH";
  if (a.includes("USER") || a.includes("ROLE")) return "USERS";
  if (a.includes("SUBSCRIPTION") || a.includes("PLAN")) return "SUBSCRIPTIONS";
  if (a.includes("PAYMENT") || a.includes("BILLING") || a.includes("FINANCE"))
    return "FINANCE";
  return "SYSTEM";
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inPeriod(iso: string, period: PeriodKey) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  if (period === "all") return true;
  if (period === "today") return t >= startOfDay().getTime();
  if (period === "yesterday") {
    const y0 = startOfDay();
    y0.setDate(y0.getDate() - 1);
    const y1 = startOfDay();
    return t >= y0.getTime() && t < y1.getTime();
  }
  if (period === "7d") return t >= now - 7 * 864e5;
  if (period === "30d") return t >= now - 30 * 864e5;
  return true;
}

export function AdminAuditSecurityView() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [orgId, setOrgId] = useState("");
  const [actor, setActor] = useState("");
  const [category, setCategory] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [result, setResult] = useState<ResultFilter>("");
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [audit, orgRes] = await Promise.all([
        fetchAdminAudit(200),
        fetchOrganizations().catch(() => null),
      ]);
      setItems(audit.items);
      if (orgRes?.items) {
        setOrgs(
          orgRes.items.map((o) => ({ id: o.id, name: o.name })).slice(0, 80),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement audit");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const lastActivity = items[0]?.createdAt;

  const kpis = useMemo(() => {
    const dayAgo = Date.now() - 864e5;
    const todayStart = startOfDay().getTime();
    const last24 = items.filter((i) => new Date(i.createdAt).getTime() >= dayAgo);
    const today = items.filter(
      (i) => new Date(i.createdAt).getTime() >= todayStart,
    );
    const logins = today.filter((i) => {
      const a = i.action.toUpperCase();
      return a.includes("LOGIN") && !a.includes("FAILED");
    });
    const failed = today.filter((i) => i.action.toUpperCase().includes("FAILED"));
    const alerts = items.filter((i) => isSecurityAlert(i.action)).slice(0, 40);
    const sensitive = items.filter((i) => isRoleSensitive(i.action));
    const roleChanges = items.filter((i) =>
      i.action.toUpperCase().includes("ROLE"),
    );
    const pwdResets = items.filter((i) =>
      i.action.toUpperCase().includes("PASSWORD"),
    );
    const suspensions = items.filter((i) =>
      i.action.toUpperCase().includes("SUSPEND"),
    );
    return {
      total24: last24.length,
      loginsOk: logins.length,
      loginsFail: failed.length,
      alerts: alerts.length,
      critical: alerts.filter((a) => isFailure(a.action)).length,
      mitigated: failed.length,
      sensitive: sensitive.length,
      roleChanges: roleChanges.length,
      pwdResets: pwdResets.length,
      suspensions: suspensions.length,
      alertItems: alerts.slice(0, 3),
    };
  }, [items]);

  const actions = useMemo(
    () => Array.from(new Set(items.map((i) => i.action))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (!inPeriod(row.createdAt, period)) return false;
      if (orgId && row.organizationId !== orgId) return false;
      if (actor) {
        const name = (row.platformUserName ?? "").toLowerCase();
        if (actor === "ANONYME" && name) return false;
        if (actor === "SUPER_ADMIN" && !name.includes("root") && !name.includes("admin") && !name.includes("superviseur")) {
          // soft: keep if no org (platform actor)
          if (row.organizationId) return false;
        }
        if (actor !== "ANONYME" && actor !== "SUPER_ADMIN") {
          // soft role filter unavailable on PlatformAuditLog
        }
      }
      if (category && actionCategory(row.action) !== category) return false;
      if (actionFilter && row.action !== actionFilter) return false;
      if (result === "success" && isFailure(row.action)) return false;
      if (result === "failure" && !isFailure(row.action)) return false;

      if (tab === "auth" && !isAuth(row.action)) return false;
      if (tab === "roles" && !isRoleSensitive(row.action)) return false;
      if (tab === "security" && !isSecurityAlert(row.action)) return false;
      if (tab === "alerts" && !isSecurityAlert(row.action)) return false;
      if (tab === "sessions" && !isAuth(row.action)) return false;

      if (q.trim()) {
        const hay =
          `${platformAuditActionLabel(row.action)} ${row.action} ${row.platformUserName ?? ""} ${row.organizationName ?? ""} ${row.entityId} ${row.id} ${reqId(row.id)}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [items, period, orgId, actor, category, actionFilter, result, tab, q]);

  useEffect(() => {
    setPage(0);
  }, [tab, q, orgId, actor, category, actionFilter, result, period]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function resetFilters() {
    setQ("");
    setOrgId("");
    setActor("");
    setCategory("");
    setActionFilter("");
    setResult("");
    setPeriod("30d");
    setTab("all");
  }

  function exportCsv() {
    const header = [
      "id",
      "createdAt",
      "actor",
      "organization",
      "action",
      "entityType",
      "entityId",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        [
          r.id,
          r.createdAt,
          JSON.stringify(r.platformUserName ?? ""),
          JSON.stringify(r.organizationName ?? ""),
          r.action,
          r.entityType,
          r.entityId,
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-worm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Export CSV généré (client)");
  }

  const tabs: { id: TabKey; label: string; count?: number }[] = [
    { id: "all", label: "Toutes les activités", count: items.length },
    { id: "roles", label: "Audit métier & rôles", count: kpis.sensitive },
    {
      id: "auth",
      label: "Connexions & auth",
      count: items.filter((i) => isAuth(i.action)).length,
    },
    {
      id: "security",
      label: "Sécurité",
      count: kpis.alerts,
    },
    { id: "alerts", label: "Alertes actives", count: kpis.critical },
    {
      id: "sessions",
      label: "Sessions (audit)",
      count: items.filter((i) => isAuth(i.action)).length,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-ink">
              Sécurité &amp; Audit
            </h1>
            <span className="rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              WORM Scellé SHA-256
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
            Surveillez les actions sensibles, les connexions et les événements de
            sécurité de toute la plateforme SaaS.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFEFF8] px-4 py-2 text-[11px] font-semibold text-ink shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7B5900] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7B5900]" />
            </span>
            Système sécurisé
            {lastActivity
              ? ` · Dernière activité : ${relativeFr(lastActivity)}`
              : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                document.getElementById("audit-search")?.focus();
                setShowFilters(true);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-[12px] font-bold text-ink shadow-sm"
            >
              <Search className="h-4 w-4" />
              Recherche
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 text-[12px] font-bold text-ink"
            >
              <Filter className="h-4 w-4" />
              Filtres
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-[12px] font-bold text-white shadow-sm"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ink shadow-sm"
              aria-label="Actualiser"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI matrix */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Actions totales (échantillon)"
          value={String(kpis.total24)}
          icon={<Activity className="h-5 w-5 text-primary" />}
          hint={`Sur ${items.length} logs chargés · fen. 24h`}
          bar={Math.min(100, kpis.total24 * 4)}
          barClass="bg-primary"
        />
        <KpiCard
          label="Connexions aujourd'hui"
          value={String(kpis.loginsOk + kpis.loginsFail)}
          icon={<LogIn className="h-5 w-5 text-[#7B5900]" />}
          hint={
            <span className="flex w-full justify-between">
              <span>
                <strong className="text-ink">{kpis.loginsOk}</strong> réussies
              </span>
              <span className="text-red-600">{kpis.loginsFail} échouées</span>
            </span>
          }
          dualBar={{ ok: kpis.loginsOk, fail: kpis.loginsFail }}
        />
        <KpiCard
          label="Alertes de sécurité"
          value={String(kpis.alerts)}
          valueClass="text-red-600"
          icon={<ShieldAlert className="h-5 w-5 text-red-700" />}
          hint={
            <span className="flex w-full justify-between">
              <span>{kpis.critical} critiques (soft)</span>
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setTab("alerts");
                  document
                    .getElementById("security-alerts-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Traiter ({kpis.critical})
              </button>
            </span>
          }
          bar={Math.min(100, kpis.alerts * 8)}
          barClass="bg-red-500"
        />
        <KpiCard
          label="Tentatives mitigées"
          value={String(kpis.mitigated)}
          icon={<Shield className="h-5 w-5 text-[#7B5900]" />}
          hint="Échecs / suspensions détectés dans l’audit"
          bar={kpis.mitigated ? 100 : 0}
          barClass="bg-[#7B5900]"
        />
      </div>

      {/* Micro KPIs */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Micro
          label="Actions sensibles"
          value={kpis.sensitive}
          icon={<KeyRound className="h-5 w-5 text-ink/40" />}
        />
        <Micro
          label="Comptes bloqués"
          value="—"
          soft
          icon={<Lock className="h-5 w-5 text-red-500" />}
        />
        <Micro
          label="Réinit. MDP"
          value={kpis.pwdResets}
          icon={<Lock className="h-5 w-5 text-ink/40" />}
        />
        <Micro
          label="Changements rôle"
          value={kpis.roleChanges}
          icon={<ShieldCheck className="h-5 w-5 text-[#7B5900]" />}
        />
        <Micro
          label="Suspensions"
          value={kpis.suspensions}
          icon={<PauseCircle className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Critical alerts */}
      <div
        id="security-alerts-section"
        className="rounded-2xl bg-ink p-5 text-white shadow-md"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-500 p-1 text-white">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold">
              Alertes de sécurité nécessitant une attention
            </h2>
          </div>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
            {kpis.critical} urgent(s) · dérivé audit
          </span>
        </div>
        {kpis.alertItems.length === 0 ? (
          <p className="text-sm text-white/60">
            Aucune alerte sensible dans l’échantillon actuel.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {kpis.alertItems.map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-xl bg-white/10 p-4"
              >
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                      {a.action}
                    </span>
                    <span className="text-[11px] text-white/50">
                      {relativeFr(a.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium leading-relaxed text-white/90">
                    {platformAuditActionLabel(a.action)} —{" "}
                    <span className="font-bold text-[#FFB2BD]">
                      {a.platformUserName ?? "Système"}
                    </span>
                    {a.organizationName
                      ? ` · ${a.organizationName}`
                      : ""}
                  </p>
                  <p className="text-[11px] text-[#FFDEA4]/80">
                    Entité {a.entityType}/{a.entityId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(a)}
                    className="flex-1 rounded-lg bg-white/15 py-1.5 text-[11px] font-semibold text-white hover:bg-white/25"
                  >
                    Inspecter
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setToast("Verrouillage compte : soft — non branché")
                    }
                    className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    Acquitter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-semibold shadow-sm transition",
              tab === t.id
                ? "bg-primary text-white"
                : "bg-white text-ink hover:bg-[#FFEFF8]",
            )}
          >
            {t.label}
            {t.count != null ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold",
                  tab === t.id
                    ? "bg-white/20"
                    : t.id === "alerts"
                      ? "bg-red-500 text-white"
                      : "bg-[#FFEFF8] text-ink/50",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Filters */}
      {showFilters ? (
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
            <FilterField label="Organisation">
              <select
                className={selectClass}
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                <option value="">Toutes</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Acteur (soft)">
              <select
                className={selectClass}
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              >
                <option value="">Tous</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="ANONYME">Anonyme / Système</option>
              </select>
            </FilterField>
            <FilterField label="Catégorie">
              <select
                className={selectClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Toutes</option>
                <option value="AUTH">Authentification</option>
                <option value="USERS">Utilisateurs &amp; droits</option>
                <option value="SUBSCRIPTIONS">Abonnements</option>
                <option value="FINANCE">Finance</option>
                <option value="SYSTEM">Système</option>
              </select>
            </FilterField>
            <FilterField label="Action">
              <select
                className={selectClass}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">Toutes</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Résultat">
              <select
                className={selectClass}
                value={result}
                onChange={(e) => setResult(e.target.value as ResultFilter)}
              >
                <option value="">Tous</option>
                <option value="success">Succès</option>
                <option value="failure">Échec / alerte</option>
              </select>
            </FilterField>
            <FilterField label="Période">
              <select
                className={selectClass}
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              >
                <option value="today">Aujourd&apos;hui</option>
                <option value="yesterday">Hier</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="all">Tout l&apos;échantillon</option>
              </select>
            </FilterField>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-ink/35" />
              <input
                id="audit-search"
                className="h-10 w-full rounded-xl bg-[#FFEFF8] pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Utilisateur, action, tenant, request ID…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-xl bg-[#FFEFF8] px-4 text-[12px] font-bold text-ink"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#FFEFF8] p-1.5 text-primary">
              <Activity className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-ink">
              Journal des événements
            </h2>
            <span className="rounded-full bg-[#FFEFF8] px-2 py-0.5 text-[11px] font-medium text-ink/50">
              {filtered.length} filtrés / {items.length} chargés
            </span>
          </div>
          <p className="inline-flex items-center gap-1 text-[11px] text-ink/45">
            <ShieldCheck className="h-3.5 w-3.5 text-[#7B5900]" />
            PlatformAuditLog · immuable (append-only)
          </p>
        </div>

        {loading ? (
          <p className="px-5 pb-5 text-sm text-ink/45">Chargement…</p>
        ) : pageRows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink/45">
            Aucun événement pour ces filtres.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[#FFEFF8] text-[10px] font-bold uppercase tracking-wider text-ink/45">
                <tr>
                  <th className="px-4 py-3">Date &amp; heure</th>
                  <th className="px-4 py-3">Acteur</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Résultat</th>
                  <th className="px-4 py-3">Entité</th>
                  <th className="px-4 py-3 text-right">Détail</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const fail = isFailure(row.action);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "cursor-pointer border-t border-[#FFEFF8] transition hover:bg-[#FFEFF8]/60",
                        fail && "bg-red-50/40",
                      )}
                      onClick={() => setSelected(row)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p
                          className={cn(
                            "font-semibold",
                            fail ? "text-red-700" : "text-ink",
                          )}
                        >
                          {new Date(row.createdAt).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                        <p className="text-[11px] text-ink/40">
                          {relativeFr(row.createdAt)} · GMT+1
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white",
                              fail ? "bg-red-600" : "bg-primary",
                            )}
                          >
                            {initials(row.platformUserName)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">
                              {row.platformUserName ?? "Système"}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                              {row.organizationId ? "ACTEUR" : "SUPER_ADMIN"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.organizationId ? (
                          <div>
                            <Link
                              href={adminHref(
                                `/organizations/${row.organizationId}/`,
                              )}
                              className="font-medium text-ink hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.organizationName ?? row.organizationId}
                            </Link>
                            <p className="text-[11px] text-ink/40">
                              ID: {row.organizationId.slice(0, 12)}…
                            </p>
                          </div>
                        ) : (
                          <span className="text-ink/40">Plateforme</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold",
                            fail
                              ? "bg-red-100 text-red-800"
                              : "bg-[#FFEFF8] text-primary",
                          )}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {fail ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                            <XCircle className="h-3.5 w-3.5" />
                            Alerte
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold text-[#5D4200]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Succès
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink/55">
                        {row.entityType}
                        <br />
                        <span className="font-mono text-[11px]">
                          {row.entityId.slice(0, 18)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className={cn(
                            "rounded-lg px-2 py-1 text-[11px] font-bold",
                            fail
                              ? "bg-red-100 text-red-800"
                              : "bg-[#FFEFF8] text-ink",
                          )}
                        >
                          {reqId(row.id)} →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-2 border-t border-[#FFEFF8] bg-[#FFEFF8]/50 px-4 py-3 sm:flex-row">
          <p className="text-[12px] text-ink/50">
            Affichage{" "}
            <strong className="text-ink">
              {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–
              {Math.min(filtered.length, (page + 1) * PAGE_SIZE)}
            </strong>{" "}
            sur <strong className="text-ink">{filtered.length}</strong>{" "}
            (échantillon API ≤ 200)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg bg-white px-3 py-1 text-[12px] font-bold text-ink disabled:opacity-40"
            >
              <ChevronLeft className="inline h-3.5 w-3.5" /> Préc.
            </button>
            <span className="px-2 text-[12px] font-bold text-ink">
              {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-lg bg-white px-3 py-1 text-[12px] font-bold text-ink disabled:opacity-40"
            >
              Suiv. <ChevronRight className="inline h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sessions soft section */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#FFEFF8] p-1.5 text-[#7B5900]">
              <Monitor className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Sessions actives globales
              </h2>
              <p className="text-[13px] text-ink/50">
                Soft-degrade — aperçu dérivé des événements auth récents (pas de
                store session global).
              </p>
            </div>
          </div>
          <Link
            href={adminHref("/security/sessions/")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-[12px] font-bold text-red-800"
          >
            Voir connexions audit
          </Link>
        </div>
        <div className="overflow-x-auto border-t border-[#FFEFF8]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#FFEFF8] text-[10px] font-bold uppercase tracking-wider text-ink/45">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Dernière action auth</th>
                <th className="px-4 py-3">Horodatage</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((i) => isAuth(i.action))
                .slice(0, 5)
                .map((s) => (
                  <tr key={s.id} className="border-t border-[#FFEFF8]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {initials(s.platformUserName)}
                        </div>
                        <span className="font-semibold">
                          {s.platformUserName ?? "Système"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.organizationName ?? "Plateforme"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">
                      {s.action}
                    </td>
                    <td className="px-4 py-3 text-ink/50">
                      {relativeFr(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setToast(
                            "Révocation session : soft — utiliser invalidate sessions utilisateur",
                          )
                        }
                        className="rounded-lg bg-red-100 px-2 py-1 text-[11px] font-bold text-red-800"
                      >
                        Révoquer (soft)
                      </button>
                    </td>
                  </tr>
                ))}
              {items.filter((i) => isAuth(i.action)).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-ink/45"
                  >
                    Aucun événement auth dans l’échantillon.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFEFF8] text-[#7B5900]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-ink">
                Conformité CNDP 09-08
              </h3>
              <span className="rounded bg-[#FFEFF8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7B5900]">
                Journal append-only
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink/55">
              Isolation multi-tenant via RLS. Les journaux PlatformAuditLog sont
              append-only ; secrets et tokens sont masqués ([REDACTED]) dans
              l’UI.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setToast("Certificat CNDP : document soft")}
          className="shrink-0 rounded-xl bg-[#FFEFF8] px-4 py-2 text-[13px] font-bold text-ink"
        >
          Certificat CNDP
        </button>
      </div>

      {/* Drawer */}
      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={() => setSelected(null)}
          />
          <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-ink p-5 text-white">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {selected.action}
                  </span>
                  <span className="font-mono text-[13px] text-[#FFDEA4]">
                    {reqId(selected.id)}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold">
                  Détail de l&apos;événement &amp; Diff JSONB
                </h2>
                <p className="text-[12px] text-white/55">
                  {new Date(selected.createdAt).toLocaleString("fr-FR")} · GMT+1
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 space-y-5 p-5">
              <div className="space-y-3 rounded-2xl bg-[#FFEFF8] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                  Métadonnées d&apos;audit
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Meta
                    label="Acteur"
                    value={selected.platformUserName ?? "Système"}
                  />
                  <Meta
                    label="Organisation"
                    value={selected.organizationName ?? "Plateforme"}
                  />
                  <Meta label="Type entité" value={selected.entityType} />
                  <Meta label="ID entité" value={selected.entityId} mono />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink/40">
                  Comparateur d&apos;état (JSONB)
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-[#FFEFF8] p-3">
                    <p className="mb-1 text-[11px] font-bold text-ink/45">
                      ÉTAT AVANT
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-white p-2 font-mono text-[11px] leading-relaxed text-ink">
                      {redactJson(selected.before)}
                    </pre>
                  </div>
                  <div className="rounded-xl bg-[#F6E3EF] p-3">
                    <p className="mb-1 text-[11px] font-bold text-primary">
                      ÉTAT APRÈS
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-white p-2 font-mono text-[11px] leading-relaxed text-ink">
                      {redactJson(selected.after)}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-[#FFEFF8] p-3 text-[13px] text-ink/60">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#7B5900]" />
                <p>
                  <strong className="text-ink">Protection CNDP :</strong> mots de
                  passe, tokens JWT et secrets sont masqués{" "}
                  <code className="rounded bg-white px-1 text-[11px]">
                    [REDACTED]
                  </code>
                  .
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FFEFF8] px-3 py-2 font-mono text-[11px] text-ink/50">
                <span className="truncate">ID: {selected.id}</span>
                <button
                  type="button"
                  className="shrink-0 font-bold text-primary hover:underline"
                  onClick={() => {
                    void navigator.clipboard.writeText(selected.id);
                    setToast("ID copié");
                  }}
                >
                  <Copy className="mr-1 inline h-3.5 w-3.5" />
                  Copier
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#FFEFF8] bg-[#FFEFF8]/60 p-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-ink shadow-sm"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        {
                          ...selected,
                          before: selected.before,
                          after: selected.after,
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${reqId(selected.id)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-white"
              >
                Télécharger preuve JSON
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl">
          <CheckCircle2 className="h-5 w-5 text-[#FFDEA4]" />
          <p className="text-sm font-bold">{toast}</p>
        </div>
      ) : null}
    </div>
  );
}

const selectClass =
  "h-10 w-full rounded-xl bg-[#FFEFF8] px-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
        {label}
      </span>
      {children}
    </label>
  );
}

function KpiCard({
  label,
  value,
  icon,
  hint,
  bar,
  barClass,
  dualBar,
  valueClass,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint: ReactNode;
  bar?: number;
  barClass?: string;
  dualBar?: { ok: number; fail: number };
  valueClass?: string;
}) {
  const total = (dualBar?.ok ?? 0) + (dualBar?.fail ?? 0);
  const okPct = total ? ((dualBar!.ok / total) * 100) : 100;
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
          {label}
        </span>
        <span className="rounded-lg bg-[#FFEFF8] p-1.5">{icon}</span>
      </div>
      <p className={cn("text-3xl font-black text-ink", valueClass)}>{value}</p>
      <div className="mt-3 text-[12px] text-ink/50">{hint}</div>
      {dualBar ? (
        <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-[#FFEFF8]">
          <div
            className="h-full bg-[#F0BF5C]"
            style={{ width: `${okPct}%` }}
          />
          <div
            className="h-full bg-red-500"
            style={{ width: `${100 - okPct}%` }}
          />
        </div>
      ) : bar != null ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#FFEFF8]">
          <div
            className={cn("h-full rounded-full", barClass)}
            style={{ width: `${bar}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function Micro({
  label,
  value,
  icon,
  soft,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  soft?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8] px-4 py-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
          {label}
          {soft ? " · soft" : ""}
        </p>
        <p className="text-xl font-black text-ink">{value}</p>
      </div>
      {icon}
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase text-ink/40">
        {label}
      </span>
      <strong className={cn("text-ink", mono && "font-mono text-[12px]")}>
        {value}
      </strong>
    </div>
  );
}
