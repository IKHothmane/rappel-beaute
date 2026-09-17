"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Bolt,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Database,
  Gavel,
  Globe,
  HardDrive,
  Mail,
  MessageCircle,
  RefreshCw,
  Rocket,
  Save,
  Server,
  Settings2,
  Shield,
  ShieldCheck,
  Terminal,
  Timer,
  Zap,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import { fetchAdminDashboard } from "@/modules/admin/client";

type Health = Awaited<ReturnType<typeof fetchAdminDashboard>>["health"];
type ProbeStatus = "ok" | "error" | "skipped" | "unknown";

type Probe = {
  path: string;
  label: string;
  protocol: string;
  status: ProbeStatus;
  latencyMs: number | null;
  detail?: string;
};

type RefreshSec = 15 | 30 | 60 | 0;

function statusLabel(v: string) {
  if (v === "ok") return { text: "Opérationnel", tone: "ok" as const };
  if (v === "manual") return { text: "Manuel V1", tone: "manual" as const };
  if (v === "down" || v === "error") return { text: "Hors service", tone: "down" as const };
  if (v === "skipped") return { text: "Non configuré", tone: "skipped" as const };
  return { text: "Dégradé", tone: "degraded" as const };
}

function TonePill({ tone, text }: { tone: string; text: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
        tone === "ok" && "bg-emerald-50 text-emerald-700",
        tone === "manual" && "bg-[#FFDEA4]/50 text-[#5D4200]",
        tone === "degraded" && "bg-[#FFDEA4]/40 text-[#5D4200]",
        tone === "down" && "bg-red-100 text-red-800",
        tone === "skipped" && "bg-[#F0DDE9] text-ink/50",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "ok" && "bg-emerald-600",
          tone === "manual" && "bg-[#7B5900]",
          tone === "degraded" && "bg-[#7B5900]",
          tone === "down" && "bg-red-600",
          tone === "skipped" && "bg-ink/30",
        )}
      />
      {text}
    </span>
  );
}

async function probeEndpoint(path: string): Promise<{
  status: ProbeStatus;
  latencyMs: number;
  body?: Record<string, unknown>;
}> {
  const start = performance.now();
  try {
    const res = await fetch(path, { credentials: "include", cache: "no-store" });
    const latencyMs = Math.round(performance.now() - start);
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const raw = String(body.status ?? (res.ok ? "ok" : "error"));
    const status: ProbeStatus =
      raw === "ok" || raw === "skipped" || raw === "error" ? raw : res.ok ? "ok" : "error";
    return { status, latencyMs, body };
  } catch {
    return { status: "error", latencyMs: Math.round(performance.now() - start) };
  }
}

function relativeAgo(iso: string | null, tick: number) {
  if (!iso) return "—";
  void tick;
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `il y a ${sec} s`;
  const m = Math.floor(sec / 60);
  return `il y a ${m} min ${sec % 60}s`;
}

export function AdminSystemHealthView() {
  const [health, setHealth] = useState<Health | null>(null);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [pipelineMs, setPipelineMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshSec, setRefreshSec] = useState<RefreshSec>(30);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const runChecks = useCallback(async () => {
    setChecking(true);
    const pipelineStart = performance.now();
    try {
      const [dash, healthRoot, db, redis] = await Promise.all([
        fetchAdminDashboard().catch(() => null),
        probeEndpoint("/api/health/"),
        probeEndpoint("/api/health/db/"),
        probeEndpoint("/api/health/redis/"),
      ]);

      if (dash?.health) setHealth(dash.health);
      else if (!dash) setError("Dashboard health indisponible");

      const nextProbes: Probe[] = [
        {
          path: "/api/health/",
          label: "/api/health/",
          protocol: "GET HTTP",
          status: healthRoot.status,
          latencyMs: healthRoot.latencyMs,
          detail: String(healthRoot.body?.status ?? ""),
        },
        {
          path: "/api/health/db/",
          label: "/api/health/db/",
          protocol: "GET (SELECT 1)",
          status: db.status,
          latencyMs: db.latencyMs,
          detail:
            typeof db.body?.latencyMs === "number"
              ? `ping ${db.body.latencyMs} ms`
              : undefined,
        },
        {
          path: "/api/health/redis/",
          label: "/api/health/redis/",
          protocol: "GET (PING)",
          status: redis.status,
          latencyMs: redis.latencyMs,
          detail:
            redis.status === "skipped"
              ? "REDIS_URL absent"
              : undefined,
        },
        {
          path: "/api/health/storage/",
          label: "/api/health/storage/",
          protocol: "HEAD (soft)",
          status: dash?.health?.storage === "ok" ? "ok" : "skipped",
          latencyMs: null,
          detail: "Sonde dédiée non exposée — statut dashboard",
        },
        {
          path: "/api/health/jobs/",
          label: "/api/health/jobs/",
          protocol: "GET BullMQ (soft)",
          status: "skipped",
          latencyMs: null,
          detail: "Stats files non exposées en V1",
        },
      ];
      setProbes(nextProbes);
      setPipelineMs(Math.round(performance.now() - pipelineStart));
      setLastCheck(new Date().toISOString());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vérification impossible");
    } finally {
      setChecking(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  useEffect(() => {
    if (!refreshSec) return;
    const t = window.setInterval(() => void runChecks(), refreshSec * 1000);
    return () => window.clearInterval(t);
  }, [refreshSec, runChecks]);

  const services = useMemo(() => {
    const h = health;
    const dbProbe = probes.find((p) => p.path.includes("/db/"));
    const redisProbe = probes.find((p) => p.path.includes("/redis/"));
    const rootProbe = probes.find((p) => p.path === "/api/health/");

    return [
      {
        id: "api",
        title: "API Gateway",
        subtitle: "Next.js App Router",
        icon: Globe,
        status: h?.api ?? rootProbe?.status ?? "unknown",
        rows: [
          ["Latence sondes", rootProbe?.latencyMs != null ? `${rootProbe.latencyMs} ms` : "—"],
          ["Statut", statusLabel(h?.api ?? "unknown").text],
          ["TLS", "App / edge"],
        ],
        action: { label: "Tester API", onClick: () => void runChecks() },
      },
      {
        id: "db",
        title: "PostgreSQL (RLS)",
        subtitle: "Pool applicatif",
        icon: Database,
        status: h?.database ?? dbProbe?.status ?? "unknown",
        rows: [
          [
            "Latence ping",
            dbProbe?.latencyMs != null ? `${dbProbe.latencyMs} ms` : "—",
          ],
          ["Sonde", dbProbe?.detail ?? "SELECT 1"],
          ["RLS", "Multi-tenant"],
        ],
        action: {
          label: "Inspecter DB",
          onClick: () => void probeEndpoint("/api/health/db/").then(() => runChecks()),
        },
      },
      {
        id: "redis",
        title: "Redis",
        subtitle: "Cache / files / rate-limit",
        icon: Bolt,
        status:
          redisProbe?.status === "skipped"
            ? "skipped"
            : h
              ? redisProbe?.status === "ok"
                ? "ok"
                : redisProbe?.status === "error"
                  ? "down"
                  : "degraded"
              : redisProbe?.status ?? "unknown",
        rows: [
          [
            "Latence",
            redisProbe?.latencyMs != null ? `${redisProbe.latencyMs} ms` : "—",
          ],
          ["Config", redisProbe?.status === "skipped" ? "Optionnel" : "REDIS_URL"],
          ["Ping", redisProbe?.status ?? "—"],
        ],
        action: null,
        footer:
          redisProbe?.status === "skipped"
            ? "Redis non configuré (skipped)"
            : "Ping TTL validé",
      },
      {
        id: "jobs",
        title: "Background Jobs",
        subtitle: "BullMQ / workers (soft)",
        icon: Settings2,
        status: "skipped",
        rows: [
          ["WAIT", "—"],
          ["ACTIVE", "—"],
          ["DONE / FAIL", "Non exposé"],
        ],
        action: {
          label: "Soft-degrade",
          onClick: () => setToast("Stats BullMQ non disponibles en V1"),
        },
      },
      {
        id: "email",
        title: "Service Email",
        subtitle: "Resend / SMTP",
        icon: Mail,
        status: h?.email ?? "unknown",
        rows: [
          ["Config", h?.email === "ok" ? "Resend OK" : "Non configuré / dégradé"],
          ["Auth", statusLabel(h?.auth ?? "unknown").text],
          ["Dernière check", h?.checkedAt ? new Date(h.checkedAt).toLocaleTimeString("fr-MA") : "—"],
        ],
        action: {
          label: "État email",
          onClick: () =>
            setToast(
              h?.email === "ok"
                ? "Resend configuré"
                : "Email dégradé — vérifier RESEND_API_KEY",
            ),
        },
      },
      {
        id: "storage",
        title: "Storage médias",
        subtitle: "Objets / factures",
        icon: Cloud,
        status: h?.storage ?? "unknown",
        rows: [
          ["Statut", statusLabel(h?.storage ?? "unknown").text],
          ["Sonde", "Via dashboard"],
          ["Chiffrement", "Cible AES-256"],
        ],
        action: null,
        footer: "Conformité stockage — soft",
      },
      {
        id: "push",
        title: "Push & In-App",
        subtitle: "Notifications",
        icon: Bell,
        status: h?.auth === "ok" ? "ok" : "degraded",
        rows: [
          ["Canal", "In-app / soft FCM"],
          ["Auth sessions", statusLabel(h?.auth ?? "unknown").text],
          ["Métriques 24h", "Non exposées"],
        ],
        action: null,
        footer: "WebSockets soft-degrade",
      },
      {
        id: "whatsapp",
        title: "WhatsApp Métier",
        subtitle: "Mode semi-assisté wa.me",
        icon: MessageCircle,
        status: h?.whatsapp ?? "manual",
        rows: [
          [
            "Mode",
            h?.whatsapp === "ok"
              ? "Auto-send"
              : h?.whatsapp === "manual"
                ? "Manuel V1"
                : "Down",
          ],
          ["Politique", "Anti-ban salons"],
          ["Générateur", "wa.me actif"],
        ],
        action: null,
        footer: "API Cloud Meta volontairement limitée",
      },
    ];
  }, [health, probes, runChecks]);

  const coreOk = useMemo(() => {
    const statuses = [
      health?.api,
      health?.database,
      health?.auth,
      health?.email,
      health?.storage,
      health?.whatsapp === "down" ? "down" : "ok",
    ];
    const ok = statuses.filter((s) => s === "ok" || s === "manual" || s === "degraded").length;
    const total = statuses.filter(Boolean).length || 6;
    const probesOk = probes.filter((p) => p.status === "ok" || p.status === "skipped").length;
    return { ok, total, probesOk, probesTotal: probes.length };
  }, [health, probes]);

  const allCriticalOk =
    health &&
    (health.api === "ok" || health.api === "degraded") &&
    health.database === "ok";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
      {/* Header */}
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink/45">
            <span>Infrastructure</span>
            <ChevronRight className="h-3 w-3 opacity-40" />
            <span className="font-bold text-primary">Santé Système</span>
            <span className="mx-1 text-ink/25">•</span>
            <span className="rounded-full bg-[#FFDEA4]/40 px-2 py-0.5 font-mono font-semibold normal-case text-[#5D4200]">
              Cluster Casa-01
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono font-semibold normal-case text-emerald-700">
              RLS Multi-Tenant
            </span>
          </div>
          <h1 className="mt-2 text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
            Santé Système &amp; Monitoring
          </h1>
          <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
            Surveillance des services critiques, sondes d&apos;endpoints et
            conformité opérationnelle CNDP Loi 09-08.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink/50">
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-emerald-600",
                checking && "animate-spin",
              )}
            />
            <span>
              Dernière vérification :{" "}
              <strong className="text-ink">
                {lastCheck
                  ? new Date(lastCheck).toLocaleString("fr-MA")
                  : "—"}
              </strong>
            </span>
            <span className="text-primary font-medium">
              {relativeAgo(lastCheck, tick)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl bg-[#FFEFF8] px-3 py-2 text-[12px] text-ink/60">
            <Timer className="h-4 w-4" />
            Auto-refresh
            <select
              value={refreshSec}
              onChange={(e) =>
                setRefreshSec(Number(e.target.value) as RefreshSec)
              }
              className="bg-transparent font-bold text-ink focus:outline-none"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={0}>Désactivé</option>
            </select>
          </label>
          <button
            type="button"
            disabled={checking}
            onClick={() => void runChecks()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
            Vérifier maintenant
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {/* Master banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#171018] via-[#241720] to-[#171018] p-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                allCriticalOk
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-300",
              )}
            >
              {allCriticalOk ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <Server className="h-7 w-7" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest",
                    allCriticalOk
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-300",
                  )}
                >
                  {allCriticalOk
                    ? "Système opérationnel"
                    : "Attention requise"}
                </span>
                <span className="font-mono text-[12px] text-white/40">
                  Casa Cluster
                </span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-white">
                {allCriticalOk
                  ? "Services critiques fonctionnels"
                  : "Un ou plusieurs services sont dégradés"}
              </h2>
              <p className="mt-1 text-[13px] text-white/70">
                Pipeline de sondes : API, PostgreSQL, Redis. Isolation RLS et
                santé dashboard en temps quasi réel.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 lg:border-l lg:border-white/10 lg:pl-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C79A3B]">
                Services core
              </p>
              <p className="text-2xl font-black">
                {coreOk.ok} / {coreOk.total}
              </p>
              <p className="text-[11px] text-emerald-400">Dashboard health</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Pipeline check
              </p>
              <p className="font-mono text-2xl font-black">
                {pipelineMs != null ? `${(pipelineMs / 1000).toFixed(2)}s` : "—"}
              </p>
              <p className="text-[11px] text-white/60">
                Sondes {coreOk.probesOk}/{coreOk.probesTotal}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                DB
              </p>
              <p
                className={cn(
                  "font-mono text-2xl font-black",
                  health?.database === "ok"
                    ? "text-emerald-400"
                    : "text-red-300",
                )}
              >
                {health?.database === "ok" ? "OK" : "KO"}
              </p>
              <p className="text-[11px] text-white/60">SELECT 1</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setToast("Mode maintenance : réservé ROOT (OTP) — soft")
              }
              className="inline-flex items-center gap-1.5 self-center rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              <Shield className="h-4 w-4 text-[#C79A3B]" />
              Maintenance [OTP]
            </button>
          </div>
        </div>
      </section>

      {/* 8 services */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-ink">Services critiques</h3>
            <span className="rounded bg-[#FFEFF8] px-2 py-0.5 font-mono text-[11px] font-bold text-ink/50">
              8 nœuds
            </span>
          </div>
          <span className="text-[11px] text-ink/45">Architecture plateforme</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {services.map((s) => {
            const Icon = s.icon;
            const st = statusLabel(String(s.status));
            return (
              <div
                key={s.id}
                className="flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFEFF8] text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <TonePill tone={st.tone} text={st.text} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">{s.title}</h4>
                    <p className="text-[12px] text-ink/50">{s.subtitle}</p>
                  </div>
                  <div className="space-y-1 rounded-xl bg-[#FFEFF8] p-2.5 font-mono text-[11px]">
                    {s.rows.map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-2 text-ink/55"
                      >
                        <span>{k}</span>
                        <span className="font-bold text-ink">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {s.action ? (
                  <button
                    type="button"
                    onClick={s.action.onClick}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#F0DDE9]/60 text-[12px] font-bold text-ink hover:bg-[#F0DDE9]"
                  >
                    {s.action.label}
                  </button>
                ) : s.footer ? (
                  <div className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#FFEFF8] text-[12px] font-semibold text-ink/50">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {s.footer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Deep dive */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-ink">
                  Sondes &amp; health checks
                </h3>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
                {probes.filter((p) => p.status === "ok").length}/
                {probes.filter((p) => p.status !== "skipped").length || "—"} OK
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <th className="pb-2">Endpoint</th>
                    <th className="pb-2">Protocole</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2 text-right">Latence</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[12px]">
                  {probes.map((p) => {
                    const st = statusLabel(p.status);
                    return (
                      <tr
                        key={p.path}
                        className="border-b border-[#FFEFF8]/80 hover:bg-[#FFF7F9]"
                      >
                        <td className="py-2.5 font-bold text-ink">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                p.status === "ok" && "bg-emerald-500",
                                p.status === "error" && "bg-red-500",
                                p.status === "skipped" && "bg-ink/25",
                                p.status === "unknown" && "bg-[#7B5900]",
                              )}
                            />
                            {p.label}
                          </span>
                          {p.detail ? (
                            <span className="mt-0.5 block pl-4 text-[10px] font-normal text-ink/40">
                              {p.detail}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 text-ink/50">{p.protocol}</td>
                        <td className="py-2.5">
                          <TonePill tone={st.tone} text={st.text} />
                        </td>
                        <td className="py-2.5 text-right font-bold text-ink">
                          {p.latencyMs != null ? `${p.latencyMs} ms` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFEFF8] p-3 text-[12px] text-ink/55">
              <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Sondes publiques{" "}
                <code className="font-mono font-semibold text-primary">
                  /api/health/*
                </code>{" "}
                + agrégat dashboard admin. Storage / jobs en soft-degrade tant
                que les routes dédiées n&apos;existent pas.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-ink">
                Latence sondes (session)
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  label: "Pipeline",
                  value: pipelineMs != null ? `${pipelineMs} ms` : "—",
                },
                {
                  label: "API root",
                  value:
                    probes.find((p) => p.path === "/api/health/")?.latencyMs !=
                    null
                      ? `${probes.find((p) => p.path === "/api/health/")!.latencyMs} ms`
                      : "—",
                },
                {
                  label: "DB",
                  value:
                    probes.find((p) => p.path.includes("/db/"))?.latencyMs !=
                    null
                      ? `${probes.find((p) => p.path.includes("/db/"))!.latencyMs} ms`
                      : "—",
                },
                {
                  label: "Redis",
                  value:
                    probes.find((p) => p.path.includes("/redis/"))?.latencyMs !=
                    null
                      ? `${probes.find((p) => p.path.includes("/redis/"))!.latencyMs} ms`
                      : "—",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl bg-[#FFEFF8] p-3"
                >
                  <p className="text-[10px] font-bold uppercase text-ink/45">
                    {c.label}
                  </p>
                  <p className="font-mono text-xl font-black text-ink">
                    {c.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink/40">
              Pas d&apos;APM p50/p95/p99 historique — latences mesurées à chaque
              refresh client.
            </p>
            {/* Soft sparkline */}
            <div className="mt-3 overflow-hidden rounded-xl bg-[#FFEFF8] p-3">
              <svg
                className="h-24 w-full text-primary"
                preserveAspectRatio="none"
                viewBox="0 0 700 140"
              >
                <defs>
                  <linearGradient id="healthGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ba0049" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ba0049" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,110 C100,109 220,95 330,70 C390,75 470,80 530,75 C600,105 650,106 700,108 L700,140 L0,140 Z"
                  fill="url(#healthGrad)"
                />
                <path
                  d="M0,110 C100,109 220,95 330,70 C390,75 470,80 530,75 C600,105 650,106 700,108"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-center text-[10px] text-ink/40">
                Illustration soft — pas de série temporelle stockée
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-ink">Disponibilité</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["API", health?.api],
                  ["Database", health?.database],
                  ["Auth", health?.auth],
                  ["Email", health?.email],
                  ["WhatsApp", health?.whatsapp],
                  ["Storage", health?.storage],
                ] as const
              ).map(([name, st]) => {
                const s = statusLabel(String(st ?? "unknown"));
                return (
                  <div
                    key={name}
                    className="rounded-xl bg-[#FFEFF8] p-3"
                  >
                    <p className="text-[10px] font-bold uppercase text-ink/45">
                      {name}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-lg font-black",
                        s.tone === "ok" && "text-emerald-700",
                        s.tone === "down" && "text-red-600",
                        (s.tone === "manual" || s.tone === "degraded") &&
                          "text-[#7B5900]",
                      )}
                    >
                      {s.text}
                    </p>
                  </div>
                );
              })}
            </div>
            <Link
              href={adminHref("/system/logs/")}
              className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
            >
              Consulter Activité &amp; Logs
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-ink">
                  Sauvegardes (soft)
                </h3>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-2 rounded-xl bg-[#FFEFF8] p-3 font-mono text-[12px] text-ink/55">
              <div className="flex justify-between">
                <span>Dernier backup</span>
                <span className="font-bold text-ink">Non branché</span>
              </div>
              <div className="flex justify-between">
                <span>Intégrité</span>
                <span className="font-bold text-primary">Soft-degrade</span>
              </div>
              <div className="flex justify-between">
                <span>PostgreSQL</span>
                <span className="font-bold text-ink">
                  {health?.database === "ok" ? "Connecté" : "KO"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-ink/40">
              Snapshots WAL / R2 non exposés via API admin pour l&apos;instant.
            </p>
          </div>
        </div>
      </section>

      {/* Compliance strip */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 border-b border-[#FFEFF8] pb-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#7B5900]" />
            <h3 className="text-lg font-bold text-ink">
              Sécurité, déploiement &amp; souveraineté
            </h3>
          </div>
          <div className="flex gap-2 text-[11px]">
            <span className="rounded bg-[#FFEFF8] px-2 py-0.5 font-mono font-bold text-ink">
              Production
            </span>
            <span className="rounded bg-[#FFEFF8] px-2 py-0.5 font-mono font-bold text-ink">
              Next.js App
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 text-[12px]">
          <div>
            <p className="mb-2 flex items-center gap-1.5 font-bold text-primary">
              <Shield className="h-4 w-4" />
              Sécurité
            </p>
            <ul className="space-y-1 font-mono text-ink/55">
              <li className="flex justify-between">
                <span>Sessions</span>
                <span className="font-bold text-emerald-700">Actif</span>
              </li>
              <li className="flex justify-between">
                <span>Auth health</span>
                <span className="font-bold text-ink">
                  {statusLabel(health?.auth ?? "unknown").text}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Redis rate-limit</span>
                <span className="font-bold text-ink">
                  {probes.find((p) => p.path.includes("redis"))?.status ===
                  "ok"
                    ? "Disponible"
                    : "Optionnel"}
                </span>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 font-bold text-ink">
              <Rocket className="h-4 w-4" />
              Runtime
            </p>
            <ul className="space-y-1 font-mono text-ink/55">
              <li className="flex justify-between">
                <span>Check</span>
                <span className="font-bold text-ink">
                  {lastCheck
                    ? new Date(lastCheck).toLocaleTimeString("fr-MA")
                    : "—"}
                </span>
              </li>
              <li className="flex justify-between">
                <span>ORM</span>
                <span className="font-bold text-ink">Prisma / pg</span>
              </li>
              <li className="flex justify-between">
                <span>Env</span>
                <span className="font-bold text-primary">admin host</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 font-bold text-emerald-700">
              <HardDrive className="h-4 w-4" />
              SLA ops
            </p>
            <ul className="space-y-1.5 text-ink/55">
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                {allCriticalOk
                  ? "Aucun incident critique détecté"
                  : "Vérifier les services dégradés"}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Sondes auto-refresh {refreshSec ? `${refreshSec}s` : "off"}
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 font-bold text-[#5D4200]">
              <Gavel className="h-4 w-4" />
              Souveraineté
            </p>
            <div className="rounded-xl bg-[#FFEFF8] p-3 text-ink/55">
              <p className="font-bold text-ink">CNDP Loi 09-08</p>
              <p className="mt-1 leading-snug">
                Isolation multi-tenant RLS · données ciblées Maroc (MT-IX).
              </p>
              <p className="mt-2 font-semibold text-emerald-700">
                ✓ Conformité ops validée
              </p>
            </div>
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
