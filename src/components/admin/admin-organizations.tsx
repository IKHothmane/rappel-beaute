"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Filter,
  Hourglass,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Store,
  SwitchCamera,
  Verified,
  X,
} from "lucide-react";
import {
  AdminActionsMenu,
  adminMenuItemClass,
} from "@/components/admin/AdminActionsMenu";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  archiveOrganizationApi,
  fetchAdminDashboard,
  fetchOrganization,
  fetchOrganizations,
  reactivateOrganizationApi,
  startSupportSessionApi,
  suspendOrganizationApi,
} from "@/modules/admin/client";
import { PLAN_LABEL } from "@/types/platform";
import type {
  OrganizationDetail,
  OrganizationListItem,
  SubscriptionPlan,
} from "@/types/platform";

type StatusTab =
  | "all"
  | "active"
  | "trial"
  | "payment_due"
  | "suspended"
  | "archived";

type Dash = Awaited<ReturnType<typeof fetchAdminDashboard>>;

const PAGE_SIZE = 20;

function mad(n: number) {
  return `${Math.round(n).toLocaleString("fr-MA")} DH`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ownerInitials(name: string | null) {
  if (!name) return "?";
  return initials(name);
}

function matchesTab(org: OrganizationListItem, tab: StatusTab) {
  if (tab === "all") return true;
  if (tab === "suspended") return org.status === "SUSPENDED";
  if (tab === "archived") return org.status === "ARCHIVED";
  if (tab === "trial") return org.subscriptionStatus === "TRIAL";
  if (tab === "payment_due")
    return org.subscriptionStatus === "PAST_DUE" || org.subscriptionStatus === "PAUSED";
  if (tab === "active") {
    return (
      org.status === "ACTIVE" &&
      org.subscriptionStatus !== "TRIAL" &&
      org.subscriptionStatus !== "PAST_DUE" &&
      org.subscriptionStatus !== "CANCELLED" &&
      org.subscriptionStatus !== "EXPIRED"
    );
  }
  return true;
}

function statusLabel(org: OrganizationListItem) {
  if (org.status === "SUSPENDED") return { label: "Suspendu", tone: "suspended" as const };
  if (org.status === "ARCHIVED") return { label: "Archivé", tone: "archived" as const };
  if (org.subscriptionStatus === "TRIAL") {
    return { label: "Essai", tone: "trial" as const };
  }
  if (org.subscriptionStatus === "PAST_DUE") {
    return { label: "Impayé", tone: "due" as const };
  }
  return { label: "Actif", tone: "active" as const };
}

function StatusPill({ org }: { org: OrganizationListItem }) {
  const s = statusLabel(org);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
        s.tone === "active" && "bg-[#FFDEA4]/70 text-[#5D4200]",
        s.tone === "trial" && "bg-[#FFD9DD] text-[#900036]",
        s.tone === "due" && "bg-red-100 text-red-800",
        s.tone === "suspended" && "bg-ink text-white",
        s.tone === "archived" && "bg-stone-200 text-stone-600",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          s.tone === "active" && "bg-[#7B5900]",
          s.tone === "trial" && "bg-primary",
          s.tone === "due" && "bg-red-600",
          s.tone === "suspended" && "bg-[#FFB2BD]",
          s.tone === "archived" && "bg-stone-400",
        )}
      />
      {s.label}
    </span>
  );
}

function OrgActions({
  org,
  onChanged,
  onInspect,
}: {
  org: OrganizationListItem;
  onChanged: () => void;
  onInspect: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const detailHref = adminHref(`/organizations/${org.id}/`);

  async function run(action: () => Promise<false | void>, close: () => void) {
    setBusy(true);
    try {
      const result = await action();
      if (result === false) return;
      close();
      onChanged();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        className="rounded-lg p-2 text-primary hover:bg-primary/10"
        title="Inspecter"
        onClick={(e) => {
          e.stopPropagation();
          onInspect();
        }}
      >
        <Eye className="h-4 w-4" />
      </button>
      <Link
        href={adminHref(`/organizations/${org.id}/support/`)}
        className="rounded-lg p-2 text-ink/45 hover:bg-[#FFEFF8] hover:text-ink"
        title="Mode assistance"
        onClick={(e) => e.stopPropagation()}
      >
        <SwitchCamera className="h-4 w-4" />
      </Link>
      <div onClick={(e) => e.stopPropagation()}>
        <AdminActionsMenu triggerLabel="⋯">
          {(close) => (
            <>
              <button
                type="button"
                className={adminMenuItemClass}
                onClick={() => {
                  close();
                  onInspect();
                }}
              >
                Fiche 360°
              </button>
              <Link href={detailHref} className={adminMenuItemClass} onClick={close}>
                Ouvrir la fiche
              </Link>
              <Link
                href={adminHref(`/organizations/${org.id}/?edit=1`)}
                className={adminMenuItemClass}
                onClick={close}
              >
                Modifier
              </Link>
              {org.status === "ACTIVE" ? (
                <button
                  type="button"
                  className={adminMenuItemClass}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (!confirm(`Suspendre « ${org.name} » ?`)) return false;
                      await suspendOrganizationApi(org.id);
                    }, close)
                  }
                >
                  Suspendre
                </button>
              ) : org.status === "SUSPENDED" ? (
                <button
                  type="button"
                  className={adminMenuItemClass}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await reactivateOrganizationApi(org.id);
                    }, close)
                  }
                >
                  Réactiver
                </button>
              ) : null}
              {org.status !== "ARCHIVED" ? (
                <button
                  type="button"
                  className={`${adminMenuItemClass} text-red-700`}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (
                        !confirm(
                          `Archiver définitivement « ${org.name} » ?`,
                        )
                      ) {
                        return false;
                      }
                      await archiveOrganizationApi(org.id);
                    }, close)
                  }
                >
                  Archiver
                </button>
              ) : null}
            </>
          )}
        </AdminActionsMenu>
      </div>
    </div>
  );
}

function TenantDrawer({
  orgId,
  onClose,
  onChanged,
}: {
  orgId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchOrganization(orgId)
      .then((r) => setDetail(r.organization))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  async function suspend() {
    if (!detail) return;
    if (!confirm(`Suspendre « ${detail.name} » ? Les connexions seront bloquées.`)) return;
    setBusy(true);
    try {
      await suspendOrganizationApi(detail.id);
      onChanged();
      const r = await fetchOrganization(orgId);
      setDetail(r.organization);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function reactivate() {
    if (!detail) return;
    setBusy(true);
    try {
      await reactivateOrganizationApi(detail.id);
      onChanged();
      const r = await fetchOrganization(orgId);
      setDetail(r.organization);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function impersonate() {
    if (!detail) return;
    const reason = window.prompt("Motif de la session assistance :", "Diagnostic Super Admin");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await startSupportSessionApi(detail.id, reason.trim());
      window.location.href = adminHref(`/organizations/${detail.id}/support/`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:w-[400px]">
      <div className="flex items-start justify-between gap-2">
        {loading || !detail ? (
          <p className="text-sm text-ink/45">Chargement…</p>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#B61149] text-sm font-black text-white shadow-md">
              {initials(detail.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="truncate text-base font-black text-ink">{detail.name}</h2>
                <StatusPill org={detail} />
              </div>
              <p className="text-[11px] text-ink/45">
                /{detail.slug}
                {detail.city ? ` · ${detail.city}` : ""}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          className="rounded-xl p-1.5 text-ink/40 hover:bg-[#FFEFF8]"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {detail ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void impersonate()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#FFEFF8] py-2.5 text-xs font-bold text-ink"
            >
              <SwitchCamera className="h-3.5 w-3.5 text-primary" />
              Assistance
            </button>
            {detail.status === "ACTIVE" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void suspend()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 py-2.5 text-xs font-bold text-red-800"
              >
                <Ban className="h-3.5 w-3.5" />
                Suspendre
              </button>
            ) : detail.status === "SUSPENDED" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void reactivate()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#FFDEA4]/50 py-2.5 text-xs font-bold text-[#5D4200]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réactiver
              </button>
            ) : (
              <div className="rounded-xl bg-stone-100 py-2.5 text-center text-xs font-semibold text-stone-500">
                Archivé
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#FFEFF8] p-3">
              <p className="text-[11px] text-ink/45">Clientes</p>
              <p className="text-xl font-black text-ink">{detail.stats.customers}</p>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] p-3">
              <p className="text-[11px] text-ink/45">RDV</p>
              <p className="text-xl font-black text-ink">{detail.stats.appointments}</p>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] p-3">
              <p className="text-[11px] text-ink/45">CA encaissé</p>
              <p className="text-lg font-black text-ink">{mad(detail.stats.revenue)}</p>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] p-3">
              <p className="text-[11px] text-ink/45">Staff / Prod.</p>
              <p className="text-lg font-black text-ink">
                {detail.stats.staff} · {detail.stats.products}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FFEFF8]/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                Propriétaire
              </span>
              <span className="text-[10px] font-semibold text-primary">OWNER</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-bold">
                {ownerInitials(detail.ownerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {detail.ownerName ?? "—"}
                </p>
                <p className="truncate text-xs text-ink/45">
                  {detail.ownerEmail ?? detail.email ?? "—"}
                </p>
                {detail.ownerPhone || detail.phone ? (
                  <p className="font-mono text-[11px] text-ink/50">
                    {detail.ownerPhone ?? detail.phone}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-2 border-t border-white/60 pt-2 text-[11px] text-ink/45">
              Inscrit le{" "}
              <span className="font-semibold text-ink">{formatDate(detail.createdAt)}</span>
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFEFF8]/80 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                Abonnement
              </span>
              <Shield className="h-3.5 w-3.5 text-[#7B5900]" />
            </div>
            <div className="space-y-1 text-xs text-ink/55">
              <div className="flex justify-between">
                <span>Formule</span>
                <span className="font-bold text-ink">
                  {detail.subscription
                    ? `${PLAN_LABEL[detail.subscription.plan]} · ${mad(detail.subscription.price)}`
                    : detail.plan
                      ? PLAN_LABEL[detail.plan]
                      : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Statut</span>
                <span className="font-bold text-ink">
                  {detail.subscription?.status ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Échéance</span>
                <span className="font-bold text-ink">
                  {formatDate(detail.subscription?.renewAt ?? detail.renewAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Utilisateurs</span>
                <span className="font-bold text-ink">{detail.usersCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#F0DDE9] pt-3">
            <Link
              href={adminHref(`/organizations/${detail.id}/?tab=subscription`)}
              className="flex items-center gap-1 text-xs font-semibold text-ink/50 hover:text-primary"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Facturation
            </Link>
            <Link
              href={adminHref(`/organizations/${detail.id}/?edit=1`)}
              className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink/90"
            >
              Modifier la fiche
            </Link>
          </div>
        </>
      ) : null}
    </aside>
  );
}

export function AdminOrganizationsView() {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [dash, setDash] = useState<Dash | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan | "ALL">("ALL");
  const [city, setCity] = useState("ALL");
  const [tab, setTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("orgs-omni-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchOrganizations({
        search: q || undefined,
        plan: plan !== "ALL" ? plan : undefined,
      }),
      fetchAdminDashboard().catch(() => null),
    ])
      .then(([orgRes, d]) => {
        setItems(orgRes.items);
        if (d) setDash(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, plan]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, plan, city, tab]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const o of items) {
      if (o.city?.trim()) set.add(o.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (!matchesTab(o, tab)) return false;
      if (city !== "ALL" && (o.city ?? "") !== city) return false;
      return true;
    });
  }, [items, tab, city]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, filtered.length);

  const counts = useMemo(() => {
    const c = {
      all: items.length,
      active: 0,
      trial: 0,
      payment_due: 0,
      suspended: 0,
      archived: 0,
    };
    for (const o of items) {
      if (matchesTab(o, "active")) c.active += 1;
      if (matchesTab(o, "trial")) c.trial += 1;
      if (matchesTab(o, "payment_due")) c.payment_due += 1;
      if (matchesTab(o, "suspended")) c.suspended += 1;
      if (matchesTab(o, "archived")) c.archived += 1;
    }
    return c;
  }, [items]);

  const s = dash?.stats;
  const activePct =
    s && s.orgs > 0
      ? Math.round(((dash?.subscriptions.active ?? 0) / s.orgs) * 1000) / 10
      : 0;

  const tabs: { id: StatusTab; label: string; count: number; dot?: string }[] = [
    { id: "all", label: "Tous", count: counts.all },
    { id: "active", label: "Actifs", count: counts.active, dot: "bg-[#7B5900]" },
    { id: "trial", label: "En essai", count: counts.trial, dot: "bg-primary" },
    { id: "payment_due", label: "Impayés", count: counts.payment_due, dot: "bg-red-500" },
    { id: "suspended", label: "Suspendus", count: counts.suspended, dot: "bg-ink" },
    { id: "archived", label: "Archivés", count: counts.archived },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink/45">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 font-bold uppercase tracking-widest text-primary">
              <Building2 className="h-3.5 w-3.5" />
              Super Admin
            </span>
            <span>/</span>
            <span className="font-semibold text-ink">Tenants & Salons</span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Cluster Maroc · CNDP
          </span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
              Instituts & Tenants
            </h1>
            <p className="mt-1 max-w-2xl text-[15px] text-ink/55">
              Supervision et cycle de vie des {s?.orgs ?? items.length} établissements
              inscrits sur Rappel Beauté.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={adminHref("/organizations/new/")}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(227,28,95,0.25)]"
            >
              <Plus className="h-4 w-4" />
              Créer un institut
            </Link>
          </div>
        </div>

        <div className="relative flex h-12 items-center rounded-2xl bg-white px-4 shadow-sm sm:h-14">
          <Search className="mr-3 h-5 w-5 shrink-0 text-ink/35" />
          <input
            id="orgs-omni-search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Rechercher par nom, gérante, e-mail, ville, slug…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink/30 focus:outline-none"
          />
          <kbd className="hidden rounded-md bg-[#FFEFF8] px-1.5 py-0.5 text-[10px] font-bold text-ink/45 sm:inline">
            ⌘K
          </kbd>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Total
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8]">
              <Store className="h-4 w-4 text-ink" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {s?.orgs ?? items.length}
            </span>
            <p className="mt-0.5 text-[11px] font-bold text-[#7B5900]">
              +{s?.orgsDelta ?? 0} ce mois
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Actifs
            </span>
            <Verified className="h-4 w-4 text-[#7B5900]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink sm:text-3xl">
              {dash?.subscriptions.active ?? counts.active}
            </span>
            <p className="mt-0.5 text-[11px] text-ink/50">
              <span className="font-bold text-ink">{activePct}%</span>
              {s ? ` · ${mad(s.mrr)} MRR` : ""}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#FFEFF8]">
            <div
              className="h-full rounded-full bg-[#7B5900]"
              style={{ width: `${Math.min(100, activePct)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              En essai
            </span>
            <Hourglass className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink sm:text-3xl">
              {dash?.subscriptions.pending ?? counts.trial}
            </span>
            <p className="mt-0.5 text-[11px] font-bold text-primary">
              {dash?.subscriptions.expiringSoon ?? 0} expirent bientôt
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Expirent &lt; 7j
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDEA4]/60 text-[#5D4200]">
              <Hourglass className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#7B5900] sm:text-3xl">
              {dash?.subscriptions.expiringSoon ?? 0}
            </span>
            <p className="mt-0.5 text-[11px] font-semibold text-ink/55">Action requise</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Impayés
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-600 sm:text-3xl">
              {(() => {
                const n =
                  (dash?.payments.pastDue ?? 0) + (dash?.payments.failed ?? 0);
                return n > 0 ? n : counts.payment_due;
              })()}
            </span>
            <p className="mt-0.5 text-[11px] font-bold text-red-600">À recouvrer</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Suspendus
            </span>
            <Lock className="h-4 w-4 text-ink/50" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink/60 sm:text-3xl">
              {dash?.stats && "suspendedOrgs" in dash.stats
                ? dash.stats.suspendedOrgs
                : dash?.orgStatus.suspended ?? counts.suspended}
            </span>
            <p className="mt-0.5 text-[11px] text-ink/45">Licences gelées</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === t.id
                  ? "bg-primary font-bold text-white shadow-sm"
                  : "bg-white text-ink/55 hover:bg-[#FFEFF8]",
              )}
            >
              {t.dot ? <span className={cn("h-2 w-2 rounded-full", t.dot)} /> : null}
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl bg-[#FFEFF8] px-3 py-1.5 text-xs text-ink">
              <Filter className="h-3.5 w-3.5 text-ink/40" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-transparent font-semibold focus:outline-none"
              >
                <option value="ALL">Toutes les villes</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-[#FFEFF8] px-3 py-1.5 text-xs text-ink">
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as SubscriptionPlan | "ALL")}
                className="bg-transparent font-semibold focus:outline-none"
              >
                <option value="ALL">Toutes les formules</option>
                <option value="STARTER">Starter</option>
                <option value="INSTITUT">Institut</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-ink/45">
            Affichage de <span className="font-bold text-ink">{from}</span> à{" "}
            <span className="font-bold text-ink">{to}</span> sur{" "}
            <span className="font-bold text-ink">{filtered.length}</span>
          </p>
        </div>
      </section>

      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
          Aucun institut trouvé.
        </p>
      ) : null}

      {/* Layout table + drawer */}
      <div className="relative flex flex-col items-start gap-5 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Mobile cards */}
          <ul className="space-y-3 xl:hidden">
            {pageItems.map((org) => {
              const featured = selectedId === org.id;
              return (
                <li
                  key={org.id}
                  className={cn(
                    "rounded-2xl border bg-white p-3.5 shadow-sm transition-all",
                    featured ? "border-primary/30" : "border-transparent",
                    org.status === "SUSPENDED" && "opacity-80",
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedId(org.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold",
                            statusLabel(org).tone === "due"
                              ? "bg-red-100 text-red-800"
                              : statusLabel(org).tone === "active"
                                ? "bg-gradient-to-br from-primary to-[#B61149] text-white"
                                : "bg-[#FFEFF8] text-ink",
                          )}
                        >
                          {initials(org.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h2 className="truncate text-sm font-bold text-ink">{org.name}</h2>
                            {org.plan === "PREMIUM" ? (
                              <span className="rounded bg-amber-50 px-1 text-[10px] font-bold text-amber-700">
                                Prestige
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-ink/45">
                            <span className="font-mono font-semibold text-primary">
                              /{org.slug}
                            </span>
                            {org.city ? ` · ${org.city}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusPill org={org} />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-[#F0DDE9]/80 pt-2.5 text-xs">
                      <div>
                        <span className="font-semibold text-ink">
                          {org.ownerName ?? "—"}
                        </span>
                        {org.ownerEmail ? (
                          <span className="mt-0.5 block truncate text-[10px] text-ink/40">
                            {org.ownerEmail}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase text-ink/40">
                          Abonnement
                        </span>
                        <span className="font-bold text-ink">
                          {org.plan ? PLAN_LABEL[org.plan] : "—"}
                          {org.mrr > 0 ? ` · ${mad(org.mrr)}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink/45">
                      <span>{org.usersCount} utilisateur{org.usersCount > 1 ? "s" : ""}</span>
                      <span>Créé {formatDate(org.createdAt)}</span>
                    </div>
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(org.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-ink py-2 text-xs font-semibold text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Fiche 360°
                    </button>
                    <Link
                      href={adminHref(`/organizations/${org.id}/support/`)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-[#FFF0F5] py-2 text-xs font-semibold text-primary"
                    >
                      <SwitchCamera className="h-3.5 w-3.5" />
                      Assistance
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-3xl bg-white shadow-sm xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="bg-[#FFEFF8]/60 text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <th className="px-4 py-3.5 font-medium">Institut</th>
                    <th className="px-3 py-3.5 font-medium">Gérante</th>
                    <th className="px-3 py-3.5 font-medium">Ville</th>
                    <th className="px-3 py-3.5 font-medium">Formule</th>
                    <th className="px-3 py-3.5 font-medium">Usage</th>
                    <th className="px-3 py-3.5 font-medium">Statut</th>
                    <th className="px-4 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0DDE9]/80">
                  {pageItems.map((org) => (
                    <tr
                      key={org.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-[#FFEFF8]/50",
                        selectedId === org.id && "bg-[#FFEFF8]/70",
                        org.status === "SUSPENDED" && "opacity-75",
                      )}
                      onClick={() => setSelectedId(org.id)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black",
                              statusLabel(org).tone === "due"
                                ? "bg-red-100 text-red-800"
                                : selectedId === org.id
                                  ? "bg-gradient-to-br from-primary to-[#B61149] text-white"
                                  : "bg-[#FFEFF8] text-ink",
                            )}
                          >
                            {initials(org.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-bold text-ink">{org.name}</span>
                              {org.plan === "PREMIUM" ? (
                                <Verified className="h-3.5 w-3.5 shrink-0 text-[#7B5900]" />
                              ) : null}
                            </div>
                            <p className="font-mono text-[11px] text-primary">/{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFEFF8] text-[10px] font-bold">
                            {ownerInitials(org.ownerName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-ink">
                              {org.ownerName ?? "—"}
                            </p>
                            <p className="truncate text-[11px] text-ink/40">
                              {org.ownerEmail ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-xs font-bold text-ink">{org.city ?? "—"}</p>
                        {org.phone ? (
                          <p className="font-mono text-[11px] text-ink/40">{org.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-xs font-bold text-primary">
                          {org.plan ? PLAN_LABEL[org.plan] : "—"}
                          {org.mrr > 0 ? ` · ${mad(org.mrr)}` : ""}
                        </p>
                        <p className="text-[11px] text-ink/40">
                          {org.subscriptionStatus === "TRIAL"
                            ? `Essai · fin ${formatDate(org.renewAt)}`
                            : org.renewAt
                              ? `Échéance ${formatDate(org.renewAt)}`
                              : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-md bg-[#FFEFF8] px-2 py-0.5 text-[11px] font-medium text-ink">
                          {org.usersCount} user{org.usersCount > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill org={org} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <OrgActions
                          org={org}
                          onChanged={load}
                          onInspect={() => setSelectedId(org.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#F0DDE9]/60 bg-[#FFEFF8]/30 p-4 sm:flex-row">
              <p className="text-xs text-ink/45">
                Page <span className="font-bold text-ink">{pageSafe}</span> sur{" "}
                <span className="font-bold text-ink">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#FFEFF8] px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm disabled:opacity-40"
                >
                  Suivant
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile pagination */}
          <div className="flex items-center justify-between pt-1 text-xs text-ink/45 xl:hidden">
            <span>
              Page {pageSafe} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md bg-stone-200 px-2.5 py-1 font-medium disabled:opacity-40"
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
        </div>

        {selectedId ? (
          <div className="w-full xl:w-auto">
            {/* Mobile: overlay-style drawer peek */}
            <div className="fixed inset-0 z-40 bg-ink/40 xl:hidden" onClick={() => setSelectedId(null)} />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl xl:static xl:z-auto xl:max-h-none xl:overflow-visible xl:rounded-none">
              <TenantDrawer
                orgId={selectedId}
                onClose={() => setSelectedId(null)}
                onChanged={load}
              />
            </div>
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFDEA4]/50 text-[#5D4200]">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Conformité CNDP · Loi 09-08</p>
            <p className="text-xs text-ink/50">
              Données clientes hébergées au Maroc — isolation multi-tenant.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#7B5900]">100% Souveraineté Maroc</span>
      </footer>
    </div>
  );
}
