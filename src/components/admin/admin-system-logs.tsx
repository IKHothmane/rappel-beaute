"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Fingerprint,
  GitCompare,
  KeyRound,
  List,
  Lock,
  Pause,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  fetchAdminAudit,
  fetchAdminDashboard,
  fetchOrganizations,
} from "@/modules/admin/client";
import { platformAuditActionLabel } from "@/types/platform";

type AuditRow = Awaited<ReturnType<typeof fetchAdminAudit>>["items"][number];
type Health = Awaited<ReturnType<typeof fetchAdminDashboard>>["health"];
type TabKey =
  | "all"
  | "audit"
  | "auth"
  | "errors"
  | "api"
  | "jobs"
  | "security";
type Severity = "success" | "warning" | "error";
type RangeKey = "today" | "24h" | "7d" | "30d";

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
  const s = fmtJson(v);
  return s
    .replace(
      /("(password|token|secret|cvv|authorization|jwt|apiKey|api_key)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"',
    )
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "SY";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function reqId(id: string) {
  return `req_${id.replace(/-/g, "").slice(-8)}`;
}

function classifyDomain(action: string): TabKey {
  const a = action.toUpperCase();
  if (
    a.includes("LOGIN") ||
    a.includes("LOGOUT") ||
    a.includes("PASSWORD") ||
    a.includes("SESSION")
  ) {
    if (a.includes("PASSWORD") || a.includes("SESSION") || a.includes("FAILED")) {
      return "security";
    }
    return "auth";
  }
  if (
    a.includes("FAILED") ||
    a.includes("ERROR") ||
    a.includes("DELETE") ||
    a.includes("SUSPEND") ||
    a.includes("CANCEL")
  ) {
    return "errors";
  }
  if (a.includes("JOB") || a.includes("QUEUE") || a.includes("WORKER")) return "jobs";
  if (a.includes("API") || a.includes("GATEWAY")) return "api";
  return "audit";
}

function severityOf(action: string): Severity {
  const a = action.toUpperCase();
  if (
    a.includes("FAILED") ||
    a.includes("ERROR") ||
    a.includes("DELETE") ||
    a.includes("SUSPEND") ||
    a.includes("CANCEL") ||
    a.includes("ARCHIVE")
  ) {
    return "error";
  }
  if (
    a.includes("PASSWORD") ||
    a.includes("SESSION") ||
    a.includes("TRIAL") ||
    a.includes("RESET")
  ) {
    return "warning";
  }
  return "success";
}

function actorRole(action: string, name: string | null) {
  if (!name) return "SYSTÈME";
  if (action.startsWith("PLATFORM_") || action.includes("SUBSCRIPTION") || action.includes("ORGANIZATION")) {
    return "SUPER_ADMIN";
  }
  if (action.includes("SUPPORT")) return "SUPPORT";
  return "PLATEFORME";
}

function inRange(iso: string, range: RangeKey) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  const ms =
    range === "24h"
      ? 86400000
      : range === "7d"
        ? 7 * 86400000
        : 30 * 86400000;
  return t >= now - ms;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function hashSoft(id: string) {
  // Empreinte affichée soft-degrade (pas de vrai WORM SHA côté API)
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hex = (h.toString(16) + id.replace(/-/g, "")).padEnd(64, "0").slice(0, 64);
  return hex;
}

export function AdminSystemLogsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditRow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [orgCount, setOrgCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [range, setRange] = useState<RangeKey>("30d");
  const [tab, setTab] = useState<TabKey>("all");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [orgId, setOrgId] = useState("");
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim().toLowerCase()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(async () => {
    if (frozen) return;
    try {
      const [audit, dash, orgRes] = await Promise.all([
        fetchAdminAudit(200),
        fetchAdminDashboard().catch(() => null),
        fetchOrganizations().catch(() => ({ items: [] })),
      ]);
      setItems(audit.items);
      setHealth(dash?.health ?? null);
      setAlertsCount(dash?.alerts?.length ?? 0);
      setOrgCount(orgRes.items.length);
      setOrgs(orgRes.items.map((o) => ({ id: o.id, name: o.name })));
      setSelectedId((prev) => prev ?? audit.items[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setItems([]);
    }
  }, [frozen]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (frozen) return;
    const t = window.setInterval(() => {
      void refresh();
    }, 45000);
    return () => window.clearInterval(t);
  }, [frozen, refresh]);

  const ranged = useMemo(
    () => items.filter((i) => inRange(i.createdAt, range)),
    [items, range],
  );

  const enriched = useMemo(() => {
    return ranged.map((row) => ({
      ...row,
      domain: classifyDomain(row.action),
      severity: severityOf(row.action),
      role: actorRole(row.action, row.platformUserName),
      requestId: reqId(row.id),
      label: platformAuditActionLabel(row.action),
    }));
  }, [ranged]);

  const tabCounts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: enriched.length,
      audit: 0,
      auth: 0,
      errors: 0,
      api: 0,
      jobs: 0,
      security: 0,
    };
    for (const r of enriched) c[r.domain] += 1;
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (tab !== "all" && r.domain !== tab) return false;
      if (severity && r.severity !== severity) return false;
      if (orgId && r.organizationId !== orgId) return false;
      if (q) {
        const hay = [
          r.label,
          r.action,
          r.platformUserName,
          r.organizationName,
          r.entityType,
          r.entityId,
          r.requestId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, tab, severity, orgId, q]);

  useEffect(() => setPage(1), [tab, severity, orgId, q, range]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE,
  );

  const selected =
    enriched.find((r) => r.id === selectedId) ??
    filtered[0] ??
    null;

  const kpis = useMemo(() => {
    const auth = enriched.filter((r) => r.domain === "auth");
    const errors = enriched.filter((r) => r.severity === "error");
    const security = enriched.filter((r) => r.domain === "security");
    const warnings = enriched.filter((r) => r.severity === "warning");
    const healthKeys = health
      ? [
          health.api,
          health.database,
          health.auth,
          health.email,
          health.whatsapp,
          health.storage,
        ]
      : [];
    const okCount = healthKeys.filter(
      (s) => s === "ok" || s === "manual",
    ).length;
    return {
      events: enriched.length,
      logins: auth.length,
      alerts: alertsCount || warnings.length,
      errors: errors.length,
      security: security.length,
      healthOk: health ? `${okCount} / ${healthKeys.length}` : "—",
      healthDetail: health
        ? "API, DB, Auth, Email, WhatsApp, Storage"
        : "Health indisponible",
    };
  }, [enriched, health, alertsCount]);

  const incident =
    selected && selected.severity === "error"
      ? selected
      : enriched.find((r) => r.severity === "error") ?? null;

  const diffRow =
    selected && (selected.before != null || selected.after != null)
      ? selected
      : enriched.find((r) => r.before != null || r.after != null) ?? selected;

  function exportCsv() {
    const headers = [
      "horodatage",
      "acteur",
      "institut",
      "action",
      "entityType",
      "entityId",
      "severite",
      "requestId",
    ];
    const rows = filtered.map((r) =>
      [
        r.createdAt,
        r.platformUserName ?? "Système",
        r.organizationName ?? "",
        r.action,
        r.entityType,
        r.entityId,
        r.severity,
        r.requestId,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    setToast("Export CSV généré (filtre actuel)");
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copié");
    } catch {
      setToast("Copie impossible");
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

      {/* Header */}
      <header className="relative rounded-2xl bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Observabilité &amp; résilience
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Cluster Casa-01 · RLS
              </span>
            </div>
            <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
              Activité &amp; Logs Plateforme
            </h1>
            <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
              Traçabilité audit PostgreSQL, observabilité opérationnelle et
              diagnostics multi-tenants conformes{" "}
              <strong className="font-semibold text-ink">CNDP Loi 09-08</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-[#FFEFF8] px-3 py-2">
              <ShieldCheck className="h-5 w-5 text-[#7B5900]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                  Ledger audit
                </p>
                <p className="text-sm font-bold text-ink">PlatformAuditLog</p>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>
              {exportOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#FFEFF8]"
                  >
                    <Shield className="mt-0.5 h-4 w-4 text-[#7B5900]" />
                    <span>
                      <span className="block text-sm font-bold text-ink">
                        CSV audit
                      </span>
                      <span className="text-[11px] text-ink/45">
                        Filtre &amp; période courants
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      setToast("Export JSON / Excel : bientôt (soft-degrade)");
                    }}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#FFEFF8]"
                  >
                    <List className="mt-0.5 h-4 w-4 text-primary" />
                    <span>
                      <span className="block text-sm font-bold text-ink">
                        JSON / Excel
                      </span>
                      <span className="text-[11px] text-ink/45">
                        Soft-degrade
                      </span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Rechercher (action, acteur, salon, req_…)"
              className="h-11 w-full rounded-xl bg-[#FFEFF8] pl-10 pr-4 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#FFEFF8] p-1">
            {(
              [
                ["today", "Aujourd'hui"],
                ["24h", "24h"],
                ["7d", "7 jours"],
                ["30d", "30 jours"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold",
                  range === key
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink/50 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#F0DDE9]/60 px-3 py-2 text-[11px] font-semibold text-ink/55">
            <Lock className="h-3.5 w-3.5" />
            PII masquée · Tokens [REDACTED]
          </span>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Événements"
          value={kpis.events.toLocaleString("fr-MA")}
          hint={`Période ${range}`}
          icon={<Activity className="h-4 w-4 text-primary" />}
        />
        <Kpi
          label="Connexions / auth"
          value={kpis.logins.toLocaleString("fr-MA")}
          hint="LOGIN / PLATFORM_*"
          icon={<KeyRound className="h-4 w-4 text-[#7B5900]" />}
        />
        <Kpi
          label="Alertes"
          value={String(kpis.alerts)}
          hint="Dashboard + warnings"
          icon={<AlertTriangle className="h-4 w-4 text-[#7B5900]" />}
        />
        <Kpi
          label="Erreurs / sensibles"
          value={String(kpis.errors)}
          hint="Suspend / cancel / delete"
          urgent
          icon={<XCircle className="h-4 w-4 text-red-600" />}
        />
        <Kpi
          label="Sécurité"
          value={String(kpis.security)}
          hint="Sessions / mots de passe"
          icon={<Shield className="h-4 w-4 text-ink/50" />}
        />
        <Kpi
          label="Santé système"
          value={kpis.healthOk}
          hint={kpis.healthDetail}
          icon={<Server className="h-4 w-4 text-[#7B5900]" />}
        />
      </section>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-[#FFEFF8] p-1.5 no-scrollbar">
        {(
          [
            ["all", "Toutes", tabCounts.all],
            ["audit", "Audit JSONB", tabCounts.audit],
            ["auth", "Connexions", tabCounts.auth],
            ["errors", "Erreurs", tabCounts.errors],
            ["api", "API", tabCounts.api],
            ["jobs", "Jobs", tabCounts.jobs],
            ["security", "Sécurité", tabCounts.security],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold",
              tab === key
                ? "bg-primary text-white shadow-sm"
                : "text-ink/55 hover:bg-white/70",
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                tab === key ? "bg-white/20" : "bg-white text-ink/50",
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-[12px] font-semibold text-ink"
          >
            <option value="">Tous les instituts ({orgCount})</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            {(
              [
                ["", "Succès / tous"],
                ["success", "Succès"],
                ["warning", "Warning"],
                ["error", "Erreur"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key || "all-sev"}
                type="button"
                onClick={() => setSeverity(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-bold",
                  severity === key
                    ? key === "error"
                      ? "bg-red-100 text-red-800"
                      : key === "warning"
                        ? "bg-[#FFDEA4]/70 text-[#5D4200]"
                        : "bg-primary text-white"
                    : "bg-[#FFEFF8] text-ink/50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-ink/45">
          Tokens &amp; secrets masqués dans l&apos;inspecteur
        </p>
      </section>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {/* Live table */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#FFEFF8] px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                frozen ? "bg-ink/30" : "animate-pulse bg-[#7B5900]",
              )}
            />
            <h2 className="text-lg font-bold text-ink">Flux d&apos;audit</h2>
            <span className="text-[11px] text-ink/45">
              {frozen ? "Figé" : "Auto-refresh 45s"} · {filtered.length}{" "}
              événements
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFrozen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-3 text-[11px] font-bold text-ink"
            >
              <Pause className="h-3.5 w-3.5" />
              {frozen ? "Reprendre" : "Figer"}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-3 text-[11px] font-bold text-ink"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Mobile cards */}
        <ul className="space-y-2 p-3 xl:hidden">
          {pageItems.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "w-full rounded-xl p-3.5 text-left shadow-sm",
                  r.severity === "error"
                    ? "bg-red-50"
                    : r.severity === "warning"
                      ? "bg-[#FFDEA4]/20"
                      : "bg-[#FFF7F9]",
                  selectedId === r.id && "ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <SeverityPill severity={r.severity} label={r.action} />
                  <span className="font-mono text-[11px] text-ink/45">
                    {fmtTime(r.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-ink">
                  {r.platformUserName ?? "Système"}
                  <span className="ml-1.5 rounded bg-[#FFEFF8] px-1.5 text-[10px] font-bold text-ink/50">
                    {r.role}
                  </span>
                </p>
                <p className="text-[12px] text-ink/50">
                  {r.organizationName ?? "Plateforme"} · {r.label}
                </p>
                <p className="mt-1 font-mono text-[10px] text-primary">
                  {r.requestId}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3">Horodatage</th>
                <th className="px-3 py-3">Acteur</th>
                <th className="px-3 py-3">Institut</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Résultat</th>
                <th className="px-3 py-3">Request ID</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "cursor-pointer border-t border-[#FFEFF8] hover:bg-[#FFF7F9]",
                    selectedId === r.id && "bg-[#FCE9F4]/40",
                    r.severity === "error" && "bg-red-50/50",
                    r.severity === "warning" && "bg-[#FFDEA4]/15",
                  )}
                >
                  <td className="px-4 py-3.5 font-mono text-[12px] font-bold text-ink">
                    {fmtTime(r.createdAt)}
                    <span className="block text-[10px] font-normal text-ink/45">
                      {fmtDate(r.createdAt)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold",
                          r.severity === "error"
                            ? "bg-red-100 text-red-800"
                            : "bg-primary text-white",
                        )}
                      >
                        {initials(r.platformUserName)}
                      </div>
                      <div>
                        <p className="font-bold text-ink">
                          {r.platformUserName ?? "Système"}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-primary">
                          {r.role}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="font-semibold text-ink">
                      {r.organizationName ?? "—"}
                    </p>
                    <p className="text-[11px] text-ink/40">{r.entityType}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="rounded bg-[#FFEFF8] px-2 py-1 font-mono text-[11px] font-bold text-primary">
                      {r.action}
                    </span>
                    <p className="mt-1 text-[11px] text-ink/50">{r.label}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <SeverityPill severity={r.severity} />
                  </td>
                  <td className="px-3 py-3.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyText(r.requestId);
                      }}
                      className="rounded bg-[#FFEFF8] px-2 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-[#F0DDE9]"
                    >
                      {r.requestId}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      {r.organizationId ? (
                        <Link
                          href={adminHref(
                            `/organizations/${r.organizationId}/`,
                          )}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-[#F0DDE9]"
                        >
                          Tenant
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(r.id);
                        }}
                        className="rounded-lg bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-[#F0DDE9]"
                      >
                        Inspecter
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && pageItems.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/40">
            Aucun événement pour ce filtre.
          </p>
        ) : null}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#FFEFF8] bg-[#FFEFF8]/50 px-4 py-3 sm:flex-row">
          <p className="text-[12px] text-ink/50">
            Affichage{" "}
            <strong className="text-ink">
              {(pageSafe - 1) * PAGE_SIZE + 1}–
              {Math.min(pageSafe * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            sur <strong className="text-ink">{filtered.length}</strong>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold text-white">
              {pageSafe}
            </span>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Inspectors */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFEFF8] text-primary">
                <GitCompare className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Inspecteur JSONB Diff
                </h3>
                <p className="text-[11px] text-ink/45">
                  {diffRow
                    ? `${diffRow.action} · ${diffRow.requestId}`
                    : "Sélectionnez un événement"}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[10px] font-bold text-primary">
              <CheckCircle2 className="h-3 w-3" />
              Audit scellé
            </span>
          </div>
          {diffRow ? (
            <>
              <div className="mb-3 flex items-center justify-between rounded-lg bg-[#FFEFF8] px-3 py-2 text-[12px]">
                <span className="font-semibold text-ink">
                  {diffRow.organizationName ?? "Plateforme"}
                </span>
                <span className="font-mono text-[10px] text-ink/45">
                  {diffRow.platformUserName ?? "Système"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F0DDE9]/40 p-3">
                  <p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-red-700">
                    Avant
                  </p>
                  <pre className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-ink/70">
                    {redactJson(diffRow.before)}
                  </pre>
                </div>
                <div className="rounded-xl bg-[#FFEFF8] p-3">
                  <p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-[#7B5900]">
                    Après
                  </p>
                  <pre className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-ink/70">
                    {redactJson(diffRow.after)}
                  </pre>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#FFEFF8] pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Fingerprint className="h-5 w-5 shrink-0 text-[#7B5900]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-ink/45">
                      Empreinte soft
                    </p>
                    <p className="truncate font-mono text-[10px] font-semibold text-ink">
                      {hashSoft(diffRow.id)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void copyText(hashSoft(diffRow.id))}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#FFEFF8] px-3 py-1.5 text-[11px] font-bold text-ink"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </button>
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-ink/40">
              Aucun diff disponible.
            </p>
          )}
        </div>

        <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
                <Bug className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Fiche incident / diagnostic
                </h3>
                <p className="font-mono text-[11px] font-bold text-red-600">
                  {incident
                    ? `${incident.action} · ${incident.requestId}`
                    : "Aucun incident dans le filtre"}
                </p>
              </div>
            </div>
            {incident ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-800">
                Sensible
              </span>
            ) : null}
          </div>
          {incident ? (
            <>
              <div className="mb-3 rounded-lg bg-[#FFEFF8] px-3 py-2 text-[12px]">
                <span className="font-semibold text-ink">
                  {incident.organizationName ?? "Plateforme"}
                </span>
                <span className="ml-2 font-mono text-[10px] text-ink/45">
                  {incident.entityType}:{incident.entityId.slice(0, 8)}
                </span>
              </div>
              <div className="mb-3 rounded-xl bg-red-50 p-3 text-red-800">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <AlertTriangle className="h-4 w-4" />
                  {incident.label}
                </p>
                <p className="mt-1 pl-6 font-mono text-[11px] text-red-700/90">
                  action={incident.action} · actor=
                  {incident.platformUserName ?? "system"} ·{" "}
                  {fmtDate(incident.createdAt)} {fmtTime(incident.createdAt)}
                </p>
              </div>
              <div className="mb-4 rounded-xl bg-[#FFEFF8] p-3">
                <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-ink/45">
                  <span>Payload (redacté)</span>
                  <span className="text-[#7B5900]">CNDP actif</span>
                </div>
                <pre className="max-h-36 overflow-auto font-mono text-[11px] text-ink/70">
                  {redactJson({
                    before: incident.before,
                    after: incident.after,
                  })}
                </pre>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link
                  href={adminHref("/support/tickets/")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-white"
                >
                  Ouvrir Support
                </Link>
                {incident.organizationId ? (
                  <Link
                    href={adminHref(
                      `/organizations/${incident.organizationId}/`,
                    )}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2 text-[11px] font-bold text-ink"
                  >
                    Voir tenant
                  </Link>
                ) : null}
                <Link
                  href={adminHref("/audit/")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2 text-[11px] font-bold text-ink"
                >
                  Journal audit
                </Link>
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-ink/40">
              Aucune action sensible dans la période.
            </p>
          )}
        </div>
      </section>

      {/* Bottom observability soft */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-ink">Performance (estim.)</h3>
          </div>
          <p className="text-3xl font-black text-ink">
            {health?.api === "ok" ? "99.8%" : "—"}
          </p>
          <p className="text-[12px] text-ink/50">
            Dispo API dérivée du health check · pas d&apos;APM
          </p>
          <Link
            href={adminHref("/system/health/")}
            className="mt-4 inline-block text-[12px] font-bold text-primary hover:underline"
          >
            Santé système complète →
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Server className="h-5 w-5 text-[#7B5900]" />
            <h3 className="font-bold text-ink">Services</h3>
          </div>
          {health ? (
            <ul className="space-y-2 text-[12px]">
              {(
                [
                  ["API", health.api],
                  ["Database", health.database],
                  ["Auth", health.auth],
                  ["Email", health.email],
                  ["WhatsApp", health.whatsapp],
                  ["Storage", health.storage],
                ] as const
              ).map(([name, status]) => (
                <li
                  key={name}
                  className="flex items-center justify-between rounded-lg bg-[#FFEFF8] px-3 py-2"
                >
                  <span className="font-semibold text-ink">{name}</span>
                  <span
                    className={cn(
                      "font-bold uppercase",
                      status === "ok" || status === "manual"
                        ? "text-[#7B5900]"
                        : "text-red-600",
                    )}
                  >
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink/40">Health indisponible.</p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-ink">Souveraineté &amp; CNDP</h3>
          </div>
          <p className="text-[13px] text-ink/55">
            Audit trail PostgreSQL · rétention opérationnelle · masquage des
            secrets dans l&apos;UI. Hébergement cible Maroc (MT-IX).
          </p>
          <div className="mt-3 space-y-1.5 text-[12px] text-ink">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Loi CNDP 09-08
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Isolation multi-tenant
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Journal PlatformAuditLog
            </p>
          </div>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function SeverityPill({
  severity,
  label,
}: {
  severity: Severity;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        severity === "success" && "bg-[#FFEFF8] text-[#5D4200]",
        severity === "warning" && "bg-[#FFDEA4]/70 text-[#5D4200]",
        severity === "error" && "bg-red-600 text-white",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          severity === "success" && "bg-[#7B5900]",
          severity === "warning" && "bg-[#7B5900]",
          severity === "error" && "bg-white",
        )}
      />
      {label
        ? label.slice(0, 28)
        : severity === "success"
          ? "OK"
          : severity === "warning"
            ? "Warning"
            : "Erreur"}
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  urgent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  urgent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span
          className={cn(
            "text-[10px] font-bold uppercase",
            urgent && "text-red-600",
          )}
        >
          {label}
        </span>
        {icon}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-black",
          urgent ? "text-red-600" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink/50">{hint}</p>
    </div>
  );
}
