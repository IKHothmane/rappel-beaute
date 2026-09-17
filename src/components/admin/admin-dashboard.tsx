"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  HeartPulse,
  Hourglass,
  LifeBuoy,
  Store,
  Users,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  fetchAdminDashboard,
  fetchAdminSession,
  fetchOrganizations,
} from "@/modules/admin/client";
import { platformAuditActionLabel } from "@/types/platform";
import type { OrganizationListItem } from "@/types/platform";

function mad(n: number) {
  return `${n.toLocaleString("fr-MA")} DH`;
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

function healthOk(v: string) {
  return v === "ok";
}

type Dash = Awaited<ReturnType<typeof fetchAdminDashboard>>;

export function AdminDashboardView() {
  const [data, setData] = useState<Dash | null>(null);
  const [orgs, setOrgs] = useState<OrganizationListItem[]>([]);
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [growthRange, setGrowthRange] = useState<"30" | "90" | "365">("30");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, session, orgRes] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminSession(),
        fetchOrganizations({}).catch(() => ({ items: [] as OrganizationListItem[] })),
      ]);
      setData(dash);
      setOrgs(orgRes.items.slice(0, 5));
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
  const watchCount =
    (data?.payments.failed ?? 0) +
    (data?.payments.pastDue ?? 0) +
    (data?.support.urgentOpen ?? 0);
  const activePct =
    s && s.orgs > 0
      ? Math.round((data!.subscriptions.active / s.orgs) * 1000) / 10
      : 0;
  const collectedEst = s ? Math.round(s.mrr * 0.94) : 0;
  const unpaidEst = s ? Math.max(0, Math.round(s.mrr - collectedEst)) : 0;

  const growthSeries = (data?.orgsSeries ?? []).map((r) => ({
    label: r.label,
    value: r.active,
  }));

  if (loading && !data) {
    return <p className="text-sm text-ink/45">Chargement du tableau de bord…</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!s || !data) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:gap-6">
      {/* Accueil */}
      <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:p-8">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#FFDEA4]/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#5D4200]">
              Maroc · Plateforme
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7B5900]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Production
            </span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink lg:text-[28px]">
            Bonjour, {firstName || "Super Admin"} 👋
          </h1>
          <p className="max-w-2xl text-[15px] text-ink/55">
            État opérationnel et financier de Rappel Beauté — {s.orgs} institut
            {s.orgs > 1 ? "s" : ""} multi-tenant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={adminHref("/organizations/new/")}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm"
          >
            <Store className="h-4 w-4" />
            Créer un institut
          </Link>
          <Link
            href={adminHref("/users/")}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-4 text-sm font-semibold text-ink"
          >
            <Users className="h-4 w-4 text-[#7B5900]" />
            Utilisateurs ({data.users.total})
          </Link>
          <Link
            href={adminHref("/subscriptions/")}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-4 text-sm font-semibold text-ink"
          >
            <CreditCard className="h-4 w-4 text-primary" />
            Abonnements
          </Link>
          <Link
            href={adminHref("/support/tickets/")}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-4 text-sm font-semibold text-ink"
          >
            <LifeBuoy className="h-4 w-4 text-[#D93260]" />
            Support
            {data.support.open > 0 ? (
              <span className="rounded-full bg-[#D93260] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {data.support.open}
              </span>
            ) : null}
          </Link>
          <Link
            href={adminHref("/system/health/")}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-4 text-sm font-semibold text-ink"
          >
            <HeartPulse className="h-4 w-4 text-emerald-600" />
            Santé
          </Link>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-5 xl:gap-4">
        <Link
          href={adminHref("/organizations/")}
          className="group flex flex-col justify-between rounded-xl bg-white p-3.5 shadow-sm transition hover:shadow-md xl:p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
              Instituts
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6E3EF] text-primary xl:h-10 xl:w-10">
              <Store className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-ink xl:text-[40px] xl:leading-none">
              {s.orgs}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-ink/50">
              <span className="inline-flex items-center font-bold text-emerald-700">
                <ArrowUpRight className="h-3.5 w-3.5" />+{s.orgsDelta}
              </span>
              ce mois
            </p>
          </div>
        </Link>

        <Link
          href={adminHref("/subscriptions/")}
          className="group flex flex-col justify-between rounded-xl bg-white p-3.5 shadow-sm transition hover:shadow-md xl:p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
              Abonnements actifs
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFDEA4]/40 text-[#7B5900] xl:h-10 xl:w-10">
              <CreditCard className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-ink xl:text-[40px] xl:leading-none">
              {data.subscriptions.active}
            </p>
            <p className="mt-1 text-[12px] text-ink/50">
              <span className="rounded-md bg-[#F6E3EF] px-2 py-0.5 font-bold text-ink/60">
                {activePct}%
              </span>{" "}
              du parc
            </p>
          </div>
        </Link>

        <div className="col-span-2 flex flex-col justify-between rounded-xl bg-gradient-to-br from-[#382D36] to-[#221820] p-3.5 text-white shadow-sm xl:col-span-1 xl:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              MRR
            </span>
            <CreditCard className="h-5 w-5 text-[#FFDEA4]/80" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight xl:text-[28px]">
              {mad(s.mrr)}
            </p>
            <p className="mt-1 text-[12px] text-white/70">
              <span className="font-bold text-[#FFDEA4]">
                {s.mrrGrowthPercent >= 0 ? "+" : ""}
                {s.mrrGrowthPercent}%
              </span>{" "}
              vs mois précédent
            </p>
          </div>
        </div>

        <Link
          href={adminHref("/organizations/")}
          className="flex flex-col justify-between rounded-xl bg-white p-3.5 shadow-sm xl:p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
              Essais / en attente
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6E3EF] text-[#B61149]">
              <Hourglass className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-ink xl:text-[40px] xl:leading-none">
              {data.subscriptions.pending}
            </p>
            <p className="mt-1 text-[12px] text-ink/50">
              {data.subscriptions.expiringSoon} bientôt à échéance
            </p>
          </div>
        </Link>

        <div className="flex flex-col justify-between rounded-xl bg-white p-3.5 shadow-sm xl:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
              À surveiller
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-red-600 xl:text-[40px] xl:leading-none">
              {watchCount}
            </p>
            <div className="mt-1 space-y-0.5 text-[12px] text-ink/55">
              <div className="flex justify-between">
                <span>Impayés</span>
                <span className="font-bold text-red-600">
                  {data.payments.failed + data.payments.pastDue}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tickets urgents</span>
                <span className="font-bold text-amber-700">{data.support.urgentOpen}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Croissance + Finance */}
      <div className="grid gap-4 xl:grid-cols-12">
        <section className="rounded-xl bg-white p-5 shadow-sm xl:col-span-8 xl:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#7B5900]">
                Évolution
              </p>
              <h2 className="text-[22px] font-bold text-ink">Croissance du réseau</h2>
              <p className="text-[13px] text-ink/50">Instituts actifs sur la période</p>
            </div>
            <div className="inline-flex rounded-lg bg-[#FFEFF8] p-1">
              {(
                [
                  ["30", "30 j"],
                  ["90", "3 mois"],
                  ["365", "12 mois"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setGrowthRange(k)}
                  className={cn(
                    "rounded px-3 py-1 text-[12px] font-semibold",
                    growthRange === k
                      ? "bg-white font-bold text-primary shadow-sm"
                      : "text-ink/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={growthSeries}>
                <defs>
                  <linearGradient id="orgGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ba0049" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#ba0049" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} width={36} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ba0049"
                  strokeWidth={3}
                  fill="url(#orgGrowth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#F0DDE9] pt-4 sm:grid-cols-4">
            <div className="rounded-lg bg-[#FFEFF8] p-3">
              <p className="text-[12px] text-ink/50">Nouveaux (mois)</p>
              <p className="text-lg font-bold text-ink">+{s.orgsDelta}</p>
            </div>
            <div className="rounded-lg bg-[#FFEFF8] p-3">
              <p className="text-[12px] text-ink/50">Actifs</p>
              <p className="text-lg font-bold text-ink">{data.subscriptions.active}</p>
            </div>
            <div className="rounded-lg bg-[#FFEFF8] p-3">
              <p className="text-[12px] text-ink/50">Suspendus</p>
              <p className="text-lg font-bold text-[#7B5900]">{data.orgStatus.suspended}</p>
            </div>
            <div className="rounded-lg bg-[#FFEFF8] p-3">
              <p className="text-[12px] text-ink/50">Archivés</p>
              <p className="text-lg font-bold text-ink/55">{data.orgStatus.archived}</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-xl bg-white p-5 shadow-sm xl:col-span-4 xl:p-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
              Finance SaaS
            </p>
            <h2 className="text-[22px] font-bold text-ink">Santé financière</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-4">
                <div>
                  <p className="text-[12px] font-semibold text-ink/50">MRR courant</p>
                  <p className="text-lg font-extrabold text-primary">{mad(s.mrr)} /mois</p>
                </div>
                <span className="rounded bg-white px-2 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                  {s.mrrGrowthPercent >= 0 ? "+" : ""}
                  {s.mrrGrowthPercent}%
                </span>
              </div>
              <div className="rounded-xl bg-[#FFEFF8] p-4">
                <div className="flex justify-between">
                  <span className="text-[12px] font-semibold text-ink/50">ARR projeté</span>
                  <span className="text-lg font-bold text-ink">{mad(s.arr)}</span>
                </div>
                <p className="mt-1 text-[11px] text-[#7B5900]">Annualisation indicative MRR × 12</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#FFEFF8] p-3">
                  <p className="text-[11px] text-ink/50">Encaissé (est.)</p>
                  <p className="text-base font-bold text-emerald-700">{mad(collectedEst)}</p>
                </div>
                <div className="rounded-lg bg-[#FFEFF8] p-3">
                  <p className="text-[11px] text-red-600">Impayés (est.)</p>
                  <p className="text-base font-bold text-red-600">{mad(unpaidEst)}</p>
                </div>
              </div>
            </div>
          </div>
          <Link
            href={adminHref("/billing/")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Voir MRR & revenus <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      {/* Alertes + Santé + Abonnements */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-xl bg-white p-5 shadow-sm xl:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
            Portefeuille
          </p>
          <h2 className="text-[22px] font-bold text-ink">État des abonnements</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span>Actifs</span>
              <span className="font-bold">{data.subscriptions.active}</span>
            </li>
            <li className="flex justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span>En attente / essai</span>
              <span className="font-bold">{data.subscriptions.pending}</span>
            </li>
            <li className="flex justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span>Expiration &lt; 7 j</span>
              <span className="font-bold text-amber-700">{data.subscriptions.expiringSoon}</span>
            </li>
            <li className="flex justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span>Impayés / échecs</span>
              <span className="font-bold text-red-600">
                {data.payments.failed + data.payments.pastDue}
              </span>
            </li>
            <li className="flex justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span>Suspendus</span>
              <span className="font-bold text-ink/55">{data.subscriptions.suspended}</span>
            </li>
          </ul>
          <Link
            href={adminHref("/subscriptions/")}
            className="mt-4 block text-center text-sm font-bold text-primary hover:underline"
          >
            Gérer les abonnements →
          </Link>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm xl:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                Surveillance
              </p>
              <h2 className="text-[22px] font-bold text-ink">Alertes prioritaires</h2>
            </div>
            {data.alerts.length > 0 ? (
              <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {data.alerts.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className={cn(
                  "space-y-1 rounded-xl p-3.5",
                  a.severity === "critical" || a.severity === "high"
                    ? "bg-red-50"
                    : "bg-amber-50",
                )}
              >
                <p className="text-[15px] font-bold text-ink">
                  {a.count} {a.label}
                </p>
                <Link
                  href={adminHref(a.href)}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
                >
                  Voir <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
            {data.alerts.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800">
                Aucune alerte critique pour le moment.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm md:col-span-2 xl:col-span-1 xl:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Supervision
              </p>
              <h2 className="text-[22px] font-bold text-ink">Santé plateforme</h2>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {(
              [
                ["API", data.health.api],
                ["PostgreSQL", data.health.database],
                ["Auth", data.health.auth],
                ["Emails", data.health.email],
                ["WhatsApp", data.health.whatsapp],
                ["Stockage", data.health.storage],
              ] as const
            ).map(([label, status]) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2.5 text-sm"
              >
                <span className="font-semibold text-ink">{label}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-[12px] font-bold",
                    healthOk(status)
                      ? "text-emerald-700"
                      : status === "manual"
                        ? "text-amber-800"
                        : "text-red-600",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      healthOk(status)
                        ? "bg-emerald-500"
                        : status === "manual"
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                  />
                  {status === "ok"
                    ? "OK"
                    : status === "manual"
                      ? "Manuel V1"
                      : status === "down"
                        ? "Down"
                        : "Dégradé"}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={adminHref("/system/health/")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#7B5900] hover:underline"
          >
            Moniteur complet <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      {/* Derniers instituts */}
      <section className="rounded-xl bg-white p-5 shadow-sm xl:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#7B5900]">
              Registre
            </p>
            <h2 className="text-[22px] font-bold text-ink">Derniers instituts</h2>
          </div>
          <Link
            href={adminHref("/organizations/")}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-[13px] font-bold text-white"
          >
            Voir tous ({s.orgs}) <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile cards */}
        <div className="mt-4 space-y-2.5 lg:hidden">
          {orgs.map((o) => (
            <div key={o.id} className="rounded-xl border border-[#F0DDE9] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{o.name}</p>
                  <p className="text-[12px] text-ink/50">
                    {o.ownerName ?? "—"} · {o.city ?? "Ville —"}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    o.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : o.status === "SUSPENDED"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-ink/10 text-ink/55",
                  )}
                >
                  {o.status === "ACTIVE"
                    ? "Actif"
                    : o.status === "SUSPENDED"
                      ? "Suspendu"
                      : "Archivé"}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <Link
                  href={adminHref(`/organizations/${o.id}/`)}
                  className="rounded-lg bg-[#FFEFF8] px-2.5 py-1 text-[12px] font-bold"
                >
                  Voir
                </Link>
                <Link
                  href={adminHref(`/organizations/${o.id}/?edit=1`)}
                  className="rounded-lg bg-[#FFEFF8] px-2.5 py-1 text-[12px] font-semibold"
                >
                  Modifier
                </Link>
              </div>
            </div>
          ))}
          {orgs.length === 0 ? (
            <p className="text-sm text-ink/45">Aucun institut pour le moment.</p>
          ) : null}
        </div>

        {/* Desktop table */}
        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0DDE9] text-[11px] uppercase tracking-wider text-ink/40">
                <th className="pb-3 pl-2 font-bold">Institut</th>
                <th className="pb-3 font-bold">Localisation</th>
                <th className="pb-3 font-bold">Statut</th>
                <th className="pb-3 font-bold">Créé</th>
                <th className="pb-3 pr-2 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0DDE9]">
              {orgs.map((o) => (
                <tr key={o.id} className="hover:bg-[#FFEFF8]/50">
                  <td className="py-3.5 pl-2">
                    <p className="font-bold text-ink">{o.name}</p>
                    <p className="text-[12px] text-ink/50">{o.ownerName ?? "—"}</p>
                  </td>
                  <td className="py-3.5">{o.city ?? "—"}</td>
                  <td className="py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        o.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : o.status === "SUSPENDED"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-ink/10 text-ink/55",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          o.status === "ACTIVE"
                            ? "bg-emerald-600"
                            : o.status === "SUSPENDED"
                              ? "bg-amber-600"
                              : "bg-ink/40",
                        )}
                      />
                      {o.status === "ACTIVE"
                        ? "Actif"
                        : o.status === "SUSPENDED"
                          ? "Suspendu"
                          : "Archivé"}
                    </span>
                  </td>
                  <td className="py-3.5 text-ink/50">{relativeTime(o.createdAt)}</td>
                  <td className="py-3.5 pr-2 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        href={adminHref(`/organizations/${o.id}/`)}
                        className="rounded bg-[#FFEFF8] px-2.5 py-1 text-[12px] font-bold"
                      >
                        Voir
                      </Link>
                      <Link
                        href={adminHref(`/organizations/${o.id}/?edit=1`)}
                        className="rounded bg-[#FFEFF8] px-2.5 py-1 text-[12px] font-semibold"
                      >
                        Modifier
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Support + Audit */}
      <div className="grid gap-4 xl:grid-cols-12">
        <section className="rounded-xl bg-white p-5 shadow-sm xl:col-span-5 xl:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Support
              </p>
              <h2 className="text-[22px] font-bold text-ink">Tickets & SLA</h2>
            </div>
            <span className="rounded bg-[#D93260] px-2 py-0.5 text-[11px] font-bold text-white">
              {data.support.open} ouverts
            </span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["Nouveaux", data.support.open, "text-red-600"],
                ["En cours", data.support.inProgress, "text-[#7B5900]"],
                ["Attente", data.support.waitingCustomer, "text-ink"],
                ["Résolus", data.support.resolved, "text-emerald-700"],
              ] as const
            ).map(([label, n, color]) => (
              <div key={label} className="rounded-lg bg-[#FFEFF8] p-2">
                <span className={cn("block text-[22px] font-bold", color)}>{n}</span>
                <span className="text-[10px] font-bold uppercase text-ink/45">{label}</span>
              </div>
            ))}
          </div>
          <Link
            href={adminHref("/support/tickets/")}
            className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-[#FFEFF8] text-sm font-bold text-ink"
          >
            Consulter les tickets
          </Link>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm xl:col-span-7 xl:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Audit
              </p>
              <h2 className="text-[22px] font-bold text-ink">Journal d&apos;activité</h2>
            </div>
            <Link
              href={adminHref("/audit/")}
              className="text-sm font-bold text-primary hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {(data.audit ?? []).slice(0, 6).map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-1 rounded-lg bg-[#FFEFF8] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {platformAuditActionLabel(a.action)}
                  </p>
                  <p className="text-[12px] text-ink/50">
                    {a.platformUserName ?? "Système"}
                    {a.organizationName ? ` · ${a.organizationName}` : ""}
                  </p>
                </div>
                <time className="shrink-0 font-mono text-[11px] text-ink/40">
                  {relativeTime(a.createdAt)}
                </time>
              </li>
            ))}
            {(data.audit ?? []).length === 0 ? (
              <p className="text-sm text-ink/45">Aucune activité récente.</p>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
