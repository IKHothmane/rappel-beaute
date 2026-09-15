"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import { fetchAdminDashboard, fetchAdminSession } from "@/modules/admin/client";
import { SUPPORT_CATEGORY_LABEL } from "@/modules/admin/support-tickets";

function mad(n: number) {
  return `${n.toLocaleString("fr-MA")} MAD`;
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return `Il y a ${Math.floor(hours / 24)} j`;
}

function formatMinutes(n: number | null) {
  if (n == null) return "—";
  if (n < 60) return `${Math.round(n)} min`;
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return `${h}h ${String(m).padStart(2, "0")}`;
}

function healthLabel(v: string) {
  if (v === "ok") return { text: "Opérationnelle", color: "text-emerald-700" };
  if (v === "manual") return { text: "Manuel", color: "text-amber-700" };
  if (v === "down") return { text: "Hors service", color: "text-red-700" };
  return { text: "Dégradée", color: "text-amber-700" };
}

function healthDot(v: string) {
  if (v === "ok") return "🟢";
  if (v === "manual") return "🟡";
  if (v === "down") return "🔴";
  return "🟡";
}

function activityLabel(a: {
  action: string;
  entityType: string;
  organizationName: string | null;
  platformUserName: string | null;
}) {
  const org = a.organizationName ? ` · ${a.organizationName}` : "";
  if (a.entityType === "SupportTicket") return `Ticket ${a.action.toLowerCase()}${org}`;
  if (a.entityType === "Subscription") return `Abonnement ${a.action.toLowerCase()}${org}`;
  if (a.entityType === "Organization") return `Organisation ${a.action.toLowerCase()}${org}`;
  if (a.entityType === "User") return `Utilisateur ${a.action.toLowerCase()}${org}`;
  if (a.entityType === "PlatformConfig") return `Paramètres ${a.action.toLowerCase()}`;
  return `${a.entityType} · ${a.action}${org}`;
}

const ORG_COLORS = ["#E31C5F", "#C79A3B", "#7C3A6A", "#94A3B8"];
type Dash = Awaited<ReturnType<typeof fetchAdminDashboard>>;

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mrrRange, setMrrRange] = useState<6 | 12>(6);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, session] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminSession(),
      ]);
      setData(dash);
      if (session && "firstName" in session) setFirstName(String(session.firstName));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const s = data?.stats;
  const mrrData = (data?.mrrSeries ?? []).slice(-(mrrRange === 6 ? 6 : 12));
  const maxCat = Math.max(1, ...(data?.support.byCategory.map((c) => c.count) ?? [1]));
  const orgPie = data
    ? [
        { name: "Actifs", value: data.orgStatus.active, fill: "#2D9F6F" },
        { name: "Suspendus", value: data.orgStatus.suspended, fill: "#D97706" },
        { name: "Archivés", value: data.orgStatus.archived, fill: "#94A3B8" },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <>
      <AdminPageHeader
        title={firstName ? `Bonjour, ${firstName}` : "Tableau de bord"}
        description="Voici l'état de Rappel Beauty aujourd'hui."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ac-btn-ghost" onClick={() => void refresh()}>
              Actualiser
            </button>
            <Link href={adminHref("/organizations/new/")} className="ac-btn">
              + Institut
            </Link>
          </div>
        }
      />

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>
      ) : null}

      {s && data ? (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href={adminHref("/organizations/")} className="block transition hover:opacity-90">
              <StatTile
                label="Instituts"
                value={String(s.orgs)}
                hint={`+${s.orgsDelta} ce mois · ${s.orgsActive} actifs`}
              />
            </Link>
            <Link href={adminHref("/users/")} className="block transition hover:opacity-90">
              <StatTile
                label="Utilisateurs"
                value={String(data.users.total)}
                hint={`+${data.users.thisMonth} ce mois`}
              />
            </Link>
            <Link href={adminHref("/subscriptions/")} className="block transition hover:opacity-90">
              <StatTile
                label="Abonnements"
                value={String(data.subscriptions.active)}
                hint={`${data.subscriptions.expiringSoon} bientôt à échéance`}
              />
            </Link>
            <Link href={adminHref("/billing/")} className="block transition hover:opacity-90">
              <StatTile
                label="CA / MRR"
                value={mad(s.mrr)}
                hint={`${s.mrrGrowthPercent >= 0 ? "+" : ""}${s.mrrGrowthPercent} %`}
              />
            </Link>
          </div>

          {/* Alertes */}
          {data.alerts.length > 0 ? (
            <section className="rounded-xl border border-red-100 bg-red-50/50 p-4 sm:p-5">
              <h2 className="font-display text-lg font-semibold text-red-950">À surveiller</h2>
              <ul className="mt-3 space-y-2">
                {data.alerts.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm"
                  >
                    <span>
                      {a.severity === "critical"
                        ? "🔴"
                        : a.severity === "high"
                          ? "🟠"
                          : a.severity === "medium"
                            ? "🟡"
                            : "⚠️"}{" "}
                      <strong>{a.count}</strong> {a.label}
                    </span>
                    <Link
                      href={adminHref(a.href)}
                      className="font-medium text-[var(--admin-accent)] hover:underline"
                    >
                      Voir
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* CA */}
          <section className="ac-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">Chiffre d&apos;affaires (MRR)</h2>
                <p className="text-sm text-[var(--admin-muted)]">
                  {mad(s.mrr)} · {s.mrrGrowthPercent >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(s.mrrGrowthPercent)} %
                </p>
              </div>
              <div className="flex gap-1 rounded-lg border border-line p-0.5 text-xs">
                {([6, 12] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`rounded-md px-2.5 py-1 ${
                      mrrRange === n ? "bg-ink text-white" : "text-ink/55"
                    }`}
                    onClick={() => setMrrRange(n)}
                  >
                    {n} mois
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={mrrData}>
                  <defs>
                    <linearGradient id="dashMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E31C5F" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#E31C5F" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} width={48} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [mad(Number(v ?? 0)), "MRR"]} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#E31C5F"
                    strokeWidth={2.5}
                    fill="url(#dashMrr)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Instituts */}
            <section className="ac-card p-5">
              <h2 className="font-display text-lg font-semibold">Nouveaux instituts</h2>
              <div className="mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={data.orgsSeries}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} width={28} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="newOrgs" name="Nouveaux" fill="#E31C5F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-[#FBF4F6] p-2">
                  <p className="text-[var(--admin-muted)]">Actifs</p>
                  <p className="font-mono font-semibold">{data.orgStatus.active}</p>
                </div>
                <div className="rounded-lg bg-[#FBF4F6] p-2">
                  <p className="text-[var(--admin-muted)]">Suspendus</p>
                  <p className="font-mono font-semibold">{data.orgStatus.suspended}</p>
                </div>
                <div className="rounded-lg bg-[#FBF4F6] p-2">
                  <p className="text-[var(--admin-muted)]">Archivés</p>
                  <p className="font-mono font-semibold">{data.orgStatus.archived}</p>
                </div>
              </div>
            </section>

            {/* Abonnements */}
            <section className="ac-card p-5">
              <h2 className="font-display text-lg font-semibold">Abonnements</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">Offre unique · 400 DH / mois</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>🟢 Actifs</span>
                  <span className="font-mono">{data.subscriptions.active}</span>
                </li>
                <li className="flex justify-between">
                  <span>🟡 En attente / trial</span>
                  <span className="font-mono">{data.subscriptions.pending}</span>
                </li>
                <li className="flex justify-between">
                  <span>🔴 Expirés</span>
                  <span className="font-mono">{data.subscriptions.expired}</span>
                </li>
                <li className="flex justify-between">
                  <span>⚫ Suspendus / annulés</span>
                  <span className="font-mono">{data.subscriptions.suspended}</span>
                </li>
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-sm">
                <div>
                  <p className="text-[var(--admin-muted)]">MRR</p>
                  <p className="font-mono text-lg font-semibold">{mad(data.subscriptions.mrr)}</p>
                </div>
                <div>
                  <p className="text-[var(--admin-muted)]">ARR estimé</p>
                  <p className="font-mono text-lg font-semibold">{mad(data.subscriptions.arr)}</p>
                </div>
              </div>
              <Link
                href={adminHref("/subscriptions/")}
                className="mt-3 inline-block text-sm text-[var(--admin-accent)] hover:underline"
              >
                Gérer les abonnements →
              </Link>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Users */}
            <section className="ac-card p-5">
              <h2 className="font-display text-lg font-semibold">Utilisateurs</h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Total</span>
                  <span className="font-mono">{data.users.total}</span>
                </li>
                <li className="flex justify-between">
                  <span>Actifs</span>
                  <span className="font-mono">{data.users.active}</span>
                </li>
                <li className="flex justify-between">
                  <span>Nouveaux ce mois</span>
                  <span className="font-mono">{data.users.thisMonth}</span>
                </li>
                <li className="flex justify-between">
                  <span>Bloqués</span>
                  <span className="font-mono">{data.users.disabled}</span>
                </li>
              </ul>
              <Link
                href={adminHref("/users/")}
                className="mt-4 inline-block text-sm text-[var(--admin-accent)] hover:underline"
              >
                Voir les utilisateurs →
              </Link>
            </section>

            {/* Support */}
            <section className="ac-card p-5">
              <h2 className="font-display text-lg font-semibold">Support</h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>🔴 Urgents</span>
                  <span className="font-mono">{data.support.urgentOpen}</span>
                </li>
                <li className="flex justify-between">
                  <span>🟠 Haute priorité</span>
                  <span className="font-mono">{data.support.highOpen}</span>
                </li>
                <li className="flex justify-between">
                  <span>🟡 En cours</span>
                  <span className="font-mono">{data.support.inProgress}</span>
                </li>
                <li className="flex justify-between">
                  <span>🟢 Résolus</span>
                  <span className="font-mono">{data.support.resolved}</span>
                </li>
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-sm">
                <div>
                  <p className="text-[var(--admin-muted)]">Temps de réponse</p>
                  <p className="font-mono font-semibold">
                    {formatMinutes(data.support.avgFirstResponseMinutes)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--admin-muted)]">Satisfaction</p>
                  <p className="font-mono font-semibold">
                    {data.support.avgSatisfaction != null
                      ? `★ ${data.support.avgSatisfaction} / 5`
                      : "—"}
                  </p>
                </div>
              </div>
              <Link href={adminHref("/support/tickets/")} className="ac-btn mt-4 inline-flex">
                Ouvrir le support
              </Link>
            </section>
          </div>

          {/* Top orgs + activité */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="ac-card p-5">
              <h2 className="font-display text-lg font-semibold">Top instituts</h2>
              <ul className="mt-4 space-y-3">
                {data.topOrgs.map((o, i) => (
                  <li key={o.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <Link
                        href={adminHref(`/organizations/${o.id}/`)}
                        className="font-medium hover:text-[var(--admin-accent)]"
                      >
                        {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `}
                        {o.name}
                      </Link>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {o.appointments} RDV · {o.customers} clientes ·{" "}
                        {relativeTime(o.lastActivityAt)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs">{mad(o.mrr)}</span>
                  </li>
                ))}
                {data.topOrgs.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)]">Aucun institut.</p>
                ) : null}
              </ul>
            </section>

            <section className="ac-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Activité récente</h2>
                <Link
                  href={adminHref("/audit/")}
                  className="text-sm text-[var(--admin-accent)] hover:underline"
                >
                  Audit
                </Link>
              </div>
              <ul className="space-y-3">
                {(data.audit ?? []).slice(0, 8).map((a) => (
                  <li key={a.id} className="border-b border-line/60 pb-2 text-sm last:border-0">
                    <p className="font-medium">{activityLabel(a)}</p>
                    <p className="font-mono text-[10px] text-[var(--admin-muted)]">
                      {relativeTime(a.createdAt)}
                      {a.platformUserName ? ` · ${a.platformUserName}` : ""}
                    </p>
                  </li>
                ))}
                {(data.audit ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)]">Aucune activité.</p>
                ) : null}
              </ul>
            </section>
          </div>

          {/* Santé */}
          <section className="ac-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Santé de la plateforme</h2>
              <p className="font-mono text-[10px] text-[var(--admin-muted)]">
                Vérifié {relativeTime(data.health.checkedAt)}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {(
                [
                  ["API", data.health.api],
                  ["Base de données", data.health.database],
                  ["Authentification", data.health.auth],
                  ["Emails", data.health.email],
                  ["WhatsApp", data.health.whatsapp],
                  ["Stockage", data.health.storage],
                ] as const
              ).map(([label, status]) => {
                const h = healthLabel(status);
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg bg-[#FBF4F6] px-3 py-2"
                  >
                    <span>
                      {healthDot(status)} {label}
                    </span>
                    <span className={`text-xs font-medium ${h.color}`}>{h.text}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Graphiques bas */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="ac-card p-5">
              <h2 className="font-display text-lg font-semibold">Tickets par catégorie</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {data.support.byCategory.map((c) => (
                  <li key={c.category}>
                    <div className="mb-1 flex justify-between">
                      <span>
                        {SUPPORT_CATEGORY_LABEL[
                          c.category as keyof typeof SUPPORT_CATEGORY_LABEL
                        ] ?? c.category}
                      </span>
                      <span className="font-mono text-[var(--admin-muted)]">{c.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(c.count / maxCat) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
                {data.support.byCategory.length === 0 ? (
                  <p className="text-[var(--admin-muted)]">Pas encore de tickets.</p>
                ) : null}
              </ul>
            </section>

            <section className="ac-card p-5">
              <h2 className="font-display text-lg font-semibold">Organisations</h2>
              {orgPie.length > 0 ? (
                <div className="mx-auto mt-2 h-48 max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={orgPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72}>
                        {orgPie.map((e, i) => (
                          <Cell key={e.name} fill={e.fill || ORG_COLORS[i % ORG_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Actifs</span>
                  <span className="font-mono">{data.orgStatus.active}</span>
                </li>
                <li className="flex justify-between">
                  <span>Suspendus</span>
                  <span className="font-mono">{data.orgStatus.suspended}</span>
                </li>
                <li className="flex justify-between">
                  <span>Archivés</span>
                  <span className="font-mono">{data.orgStatus.archived}</span>
                </li>
              </ul>
            </section>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={adminHref("/analytics/")} className="ac-btn-ghost">
              Analytics plateforme
            </Link>
            <Link href={adminHref("/billing/")} className="ac-btn-ghost">
              Paiements
            </Link>
            <Link href={adminHref("/settings/")} className="ac-btn-ghost">
              Paramètres
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
