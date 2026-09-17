"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bolt,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Hourglass,
  KeyRound,
  Lock,
  Power,
  Search,
  Shield,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  AdminActionsMenu,
  adminMenuItemClass,
} from "@/components/admin/AdminActionsMenu";
import {
  SensitiveConfirmDialog,
  type SensitiveActionKind,
} from "@/components/admin/SensitiveConfirmDialog";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  fetchAdminUser,
  fetchAdminUsers,
  invalidateAdminUserSessions,
  patchAdminUser,
  resetAdminUserPassword,
} from "@/modules/admin/client";
import {
  ORG_USER_ROLE_LABEL,
  platformAuditActionLabel,
  type PlatformOrgUser,
  type PlatformUsersKpis,
} from "@/types/platform";

type SegmentTab = "all" | "active" | "inactive" | "blocked" | "watchlist";
type AccountKindFilter = "ALL" | "ORG" | "PLATFORM";
type PeriodFilter = "ALL" | "30" | "quarter" | "year";

const PAGE_SIZE = 20;

const ROLE_ORDER = ["STAFF", "OWNER", "MANAGER", "CASHIER", "ACCOUNTANT", "SUPER_ADMIN"] as const;

const ROLE_ICON_HINT: Record<string, string> = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  CASHIER: "CASHIER",
  ACCOUNTANT: "ACCOUNTANT",
  SUPER_ADMIN: "ADMIN",
};

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

function fullName(u: PlatformOrgUser) {
  return `${u.firstName} ${u.lastName}`.trim();
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRelative(iso: string | null) {
  if (!iso) return "Jamais";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Maintenant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return `Aujourd'hui ${d.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return hours === 1 ? "Il y a 1 h" : `Il y a ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

function daysSince(iso: string | null) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function isOnlineToday(u: PlatformOrgUser) {
  if (!u.lastLoginAt) return false;
  const d = new Date(u.lastLoginAt);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isInactive(u: PlatformOrgUser) {
  return u.status === "ACTIVE" && daysSince(u.lastLoginAt) >= 30;
}

function isLiveSession(u: PlatformOrgUser) {
  return u.status === "ACTIVE" && daysSince(u.lastLoginAt) < 1 / 24;
}

function matchesSegment(u: PlatformOrgUser, tab: SegmentTab) {
  switch (tab) {
    case "all":
      return true;
    case "active":
      return u.status === "ACTIVE" && !isInactive(u) && !u.mustChangePassword;
    case "inactive":
      return isInactive(u);
    case "blocked":
      return u.status === "DISABLED";
    case "watchlist":
      return u.status === "ACTIVE" && u.mustChangePassword;
    default:
      return true;
  }
}

function roleBadgeClass(role: string) {
  if (role === "OWNER" || role === "SUPER_ADMIN") {
    return "bg-[#FFD9DE] text-[#400014]";
  }
  if (role === "MANAGER") {
    return "bg-[#FFDEA4] text-[#5D4200]";
  }
  return "bg-[#F0DDE9] text-ink";
}

function UserStatusPill({ user }: { user: PlatformOrgUser }) {
  if (user.status === "DISABLED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-800">
        <Lock className="h-3 w-3" />
        Bloqué
      </span>
    );
  }
  if (user.mustChangePassword) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFDEA4]/70 px-2.5 py-1 text-[11px] font-bold text-[#5D4200]">
        <AlertTriangle className="h-3 w-3" />
        Mdp temporaire
      </span>
    );
  }
  if (isInactive(user)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0DDE9] px-2.5 py-1 text-[11px] font-bold text-[#7B5900]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#7B5900]" />
        Inactif ({Math.floor(daysSince(user.lastLoginAt))}j)
      </span>
    );
  }
  if (isLiveSession(user)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-bold text-primary">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        Actif (Session live)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-bold text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      Actif
    </span>
  );
}

function TempPasswordModal({
  password,
  message,
  userLabel,
  onClose,
}: {
  password: string;
  message: string;
  userLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFDEA4] text-[#5D4200]">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-ink">Réinitialiser l&apos;accès</h4>
              <p className="text-xs text-ink/50">{userLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-ink/40 hover:text-ink"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-[#FFEFF8] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
            Nouveau mot de passe temporaire
          </span>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 font-mono text-base font-bold text-primary">
            <span>{password}</span>
            <button
              type="button"
              className="text-ink/40 hover:text-primary"
              onClick={() => void navigator.clipboard?.writeText(password)}
              title="Copier"
            >
              Copier
            </button>
          </div>
          <p className="text-[11px] text-ink/55">
            L&apos;utilisateur devra modifier son mot de passe à la prochaine connexion.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl bg-[#F0DDE9] px-4 py-2 text-sm font-bold text-ink hover:bg-[#E4BDC2]/60"
            onClick={() => void navigator.clipboard?.writeText(message)}
          >
            Copier le message
          </button>
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

type ActivityItem = {
  id: string;
  platformUserName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export function AdminUsersView() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [organizationId, setOrganizationId] = useState("ALL");
  const [accountKind, setAccountKind] = useState<AccountKindFilter>("ALL");
  const [period, setPeriod] = useState<PeriodFilter>("ALL");
  const [segment, setSegment] = useState<SegmentTab>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [items, setItems] = useState<PlatformOrgUser[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [kpis, setKpis] = useState<PlatformUsersKpis>({
    total: 0,
    active: 0,
    disabled: 0,
    thisMonth: 0,
    inactive: 0,
    onlineToday: 0,
    watchlist: 0,
    orgsCount: 0,
    roleShare: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [temp, setTemp] = useState<{
    password: string;
    message: string;
    label: string;
  } | null>(null);
  const [pending, setPending] = useState<{
    kind: SensitiveActionKind;
    user: PlatformOrgUser;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("users-omni-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminUsers({
      search: q || undefined,
      role: role !== "ALL" ? role : undefined,
      status: status !== "ALL" ? status : undefined,
      organizationId: organizationId !== "ALL" ? organizationId : undefined,
    })
      .then((res) => {
        setItems(res.items);
        setKpis(res.kpis);
        setOrgs(res.organizations);
        setSelectedId((prev) => prev ?? res.items[0]?.id ?? null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [q, role, status, organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, role, status, organizationId, accountKind, period, segment, pageSize]);

  const selected = useMemo(
    () => items.find((u) => u.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setActivity([]);
      return;
    }
    let cancelled = false;
    setActivityLoading(true);
    fetchAdminUser(selectedId)
      .then((res) => {
        if (!cancelled) setActivity(res.activity ?? []);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const now = new Date();
    return items.filter((u) => {
      if (!matchesSegment(u, segment)) return false;
      if (accountKind !== "ALL" && u.accountKind !== accountKind) return false;
      if (period !== "ALL") {
        const created = new Date(u.createdAt);
        if (period === "30") {
          if (daysSince(u.createdAt) > 30) return false;
        } else if (period === "quarter") {
          const q = Math.floor(now.getMonth() / 3);
          if (
            created.getFullYear() !== now.getFullYear() ||
            Math.floor(created.getMonth() / 3) !== q
          ) {
            return false;
          }
        } else if (period === "year") {
          if (created.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [items, segment, accountKind, period]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);
  const from = filtered.length === 0 ? 0 : (pageSafe - 1) * pageSize + 1;
  const to = Math.min(pageSafe * pageSize, filtered.length);

  const segmentCounts = useMemo(() => {
    const c = { all: items.length, active: 0, inactive: 0, blocked: 0, watchlist: 0 };
    for (const u of items) {
      if (matchesSegment(u, "active")) c.active += 1;
      if (matchesSegment(u, "inactive")) c.inactive += 1;
      if (matchesSegment(u, "blocked")) c.blocked += 1;
      if (matchesSegment(u, "watchlist")) c.watchlist += 1;
    }
    return c;
  }, [items]);

  const activePct =
    kpis.total > 0 ? Math.round((kpis.active / kpis.total) * 1000) / 10 : 0;
  const inactivePct =
    kpis.total > 0 ? Math.round((kpis.inactive / kpis.total) * 1000) / 10 : 0;

  const roleBars = useMemo(() => {
    const totalRoles = Object.values(kpis.roleShare).reduce((a, b) => a + b, 0) || 1;
    return ROLE_ORDER.filter((r) => (kpis.roleShare[r] ?? 0) > 0).map((r) => {
      const n = kpis.roleShare[r] ?? 0;
      return {
        role: r,
        label: ORG_USER_ROLE_LABEL[r] ?? r,
        count: n,
        pct: Math.round((n / totalRoles) * 1000) / 10,
      };
    });
  }, [kpis.roleShare]);

  async function executeSensitive(kind: SensitiveActionKind, user: PlatformOrgUser) {
    setBusy(true);
    try {
      if (kind === "reset_password") {
        const res = await resetAdminUserPassword(user.id);
        setTemp({
          password: res.temporaryPassword,
          message: res.messageTemplate,
          label: `${fullName(user)} · ${user.email}`,
        });
      } else if (kind === "invalidate_sessions") {
        await invalidateAdminUserSessions(user.id);
      } else if (kind === "disable") {
        await patchAdminUser(user.id, { status: "DISABLED" });
      } else if (kind === "delete") {
        await patchAdminUser(user.id, { status: "DISABLED", delete: true });
      }
      setPending(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const headers = [
      "id",
      "prenom",
      "nom",
      "email",
      "telephone",
      "role",
      "statut",
      "institut",
      "ville",
      "type",
      "derniere_connexion",
      "cree_le",
    ];
    const rows = filtered.map((u) =>
      [
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.phone ?? "",
        u.role,
        u.status,
        u.organizationName ?? "",
        u.organizationCity ?? "",
        u.accountKind,
        u.lastLoginAt ?? "",
        u.createdAt,
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
    a.download = `utilisateurs-globaux-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: SegmentTab; label: string; count: number; accent?: string }[] = [
    { id: "all", label: "Tous les comptes", count: kpis.total || segmentCounts.all },
    { id: "active", label: "Actifs", count: kpis.active || segmentCounts.active },
    {
      id: "inactive",
      label: "Inactifs",
      count: kpis.inactive || segmentCounts.inactive,
    },
    {
      id: "blocked",
      label: "Bloqués",
      count: kpis.disabled || segmentCounts.blocked,
      accent: "text-red-700",
    },
    {
      id: "watchlist",
      label: "À surveiller",
      count: kpis.watchlist || segmentCounts.watchlist,
      accent: "text-[#7B5900]",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink/45">
          <span className="font-bold text-primary">Super Admin</span>
          <span>/</span>
          <span className="text-ink/60">Utilisateurs globaux</span>
          <span className="hidden sm:inline">/</span>
          <span className="hidden font-bold text-[#7B5900] sm:inline">
            Gouvernance des accès & sessions
          </span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
                Utilisateurs globaux
              </h1>
              <span className="rounded-full bg-[#FFD9DE] px-2.5 py-1 text-[11px] font-bold text-[#400014]">
                {kpis.total} Comptes
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-[#F0DDE9] px-2.5 py-0.5 text-[11px] text-ink/60 sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                {kpis.orgsCount} Instituts actifs
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
              Supervision, sécurité des accès et gouvernance des sessions actives sur
              l&apos;ensemble des instituts de beauté au Maroc.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex min-w-[240px] flex-1 items-center sm:min-w-[300px]">
              <Search className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-ink/35" />
              <input
                id="users-omni-search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Recherche nom, email, tél, #USR-…"
                className="h-11 w-full rounded-xl bg-white pl-10 pr-12 text-sm text-ink shadow-sm placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <kbd className="absolute right-3 rounded bg-[#FFEFF8] px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink/45">
                ⌘K
              </kbd>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-ink shadow-sm hover:bg-[#FFEFF8]"
            >
              <Download className="h-4 w-4 text-primary" />
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={() => setSegment("watchlist")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7B5900] px-4 text-sm font-bold text-white shadow-sm hover:opacity-90"
            >
              <AlertTriangle className="h-4 w-4" />
              À surveiller
              <span className="rounded-full bg-[#FFDEA4] px-1.5 py-0.5 text-[10px] font-bold text-[#5D4200]">
                {kpis.watchlist}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Total comptes
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFEFF8] text-ink/60">
              <UsersRound className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-ink">{kpis.total}</span>
            <span className="text-[11px] font-bold text-primary">+{kpis.thisMonth}/m</span>
          </div>
          <p className="truncate text-[11px] text-ink/50">
            sur {kpis.orgsCount} salons au Maroc
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Actifs
            </span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis.active}</span>
            <span className="text-[11px] font-bold text-primary">{activePct}%</span>
          </div>
          <p className="truncate text-[11px] text-ink/50">Comptes engagés</p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Inactifs
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFDEA4] text-[#5D4200]">
              <Hourglass className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis.inactive}</span>
            <span className="text-[11px] font-bold text-[#7B5900]">{inactivePct}%</span>
          </div>
          <p className="truncate text-[11px] text-ink/50">&gt; 30j sans connexion</p>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-ink p-3.5 text-white shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              En ligne aujourd&apos;hui
            </span>
            <Bolt className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">{kpis.onlineToday}</span>
            <span className="text-[11px] font-bold text-primary">Live</span>
          </div>
          <p className="truncate text-[11px] text-white/60">Sessions du jour</p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Bloqués
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <Lock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600">{kpis.disabled}</span>
            <span className="text-[11px] font-bold text-red-600">Sécurité</span>
          </div>
          <p className="truncate text-[11px] text-ink/50">Comptes désactivés</p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              À surveiller
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0BF5C]/50 text-[#5D4200]">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#7B5900]">{kpis.watchlist}</span>
            <span className="text-[11px] font-bold text-[#7B5900]">Mdp expiré</span>
          </div>
          <p className="truncate text-[11px] text-ink/50">Audit de mot de passe</p>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSegment(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all",
                  segment === t.id
                    ? "bg-white font-bold text-ink shadow-sm ring-1 ring-ink/5"
                    : "text-ink/55 hover:text-ink",
                  segment === t.id ? "bg-[#FFF7F9]" : "bg-transparent",
                  t.accent && segment !== t.id ? t.accent : null,
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    t.id === "blocked"
                      ? "bg-red-100 text-red-700"
                      : t.id === "watchlist"
                        ? "bg-[#FFDEA4] text-[#5D4200]"
                        : "bg-[#F0DDE9] text-ink/60",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-ink/45">
            <span className="hidden md:inline">
              Affichage {from} à {to} sur {filtered.length}
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg bg-[#FFEFF8] px-2 py-1 text-[12px] font-bold text-ink focus:outline-none"
            >
              <option value={20}>20 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
          >
            <option value="ALL">Tous les instituts</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
          >
            <option value="ALL">Tous les rôles</option>
            <option value="OWNER">OWNER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="STAFF">STAFF</option>
            <option value="CASHIER">CASHIER</option>
            <option value="ACCOUNTANT">ACCOUNTANT</option>
            <option value="SUPER_ADMIN">SUPER ADMIN</option>
          </select>
          <select
            value={accountKind}
            onChange={(e) => setAccountKind(e.target.value as AccountKindFilter)}
            className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
          >
            <option value="ALL">Cloisonnement type</option>
            <option value="ORG">Salons abonnés</option>
            <option value="PLATFORM">Platform Super Admin</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
          >
            <option value="ALL">Statut compte</option>
            <option value="ACTIVE">Actif</option>
            <option value="DISABLED">Bloqué</option>
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="col-span-2 h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none md:col-span-1"
          >
            <option value="ALL">Période : toutes</option>
            <option value="30">Derniers 30 jours</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {/* Table + drawer */}
      <div className="relative flex flex-col items-start gap-5 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Mobile cards */}
          <ul className="space-y-2.5 xl:hidden">
            {pageItems.map((u) => {
              const featured = selectedId === u.id;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className={cn(
                      "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl bg-white p-3.5 text-left shadow-sm",
                      featured && "ring-1 ring-primary/30",
                      u.status === "DISABLED" && "bg-red-50/60",
                      u.mustChangePassword && "bg-[#FFDEA4]/15",
                    )}
                  >
                    {featured ? (
                      <span className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
                    ) : null}
                    <div className="flex min-w-0 items-center gap-3 pl-1">
                      <div
                        className={cn(
                          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          u.status === "DISABLED"
                            ? "bg-red-100 text-red-700"
                            : u.mustChangePassword
                              ? "bg-[#FFDEA4]/60 text-[#5D4200]"
                              : "bg-[#FFEFF8] text-primary",
                        )}
                      >
                        {initials(u.firstName, u.lastName)}
                        {isOnlineToday(u) && u.status === "ACTIVE" ? (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-ink">
                            {fullName(u)}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-black uppercase",
                              roleBadgeClass(u.role),
                            )}
                          >
                            {ROLE_ICON_HINT[u.role] ?? u.role}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-ink/50">
                          {u.organizationName ?? "Plateforme"}
                          {u.organizationCity ? ` · ${u.organizationCity}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {u.status === "DISABLED" ? (
                        <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          Bloqué
                        </span>
                      ) : u.mustChangePassword ? (
                        <span className="rounded bg-[#FFDEA4]/50 px-2 py-0.5 text-[10px] font-bold text-[#5D4200]">
                          Échec mdp
                        </span>
                      ) : isOnlineToday(u) ? (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          En ligne
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink/45">
                          {formatRelative(u.lastLoginAt)}
                        </span>
                      )}
                      <ChevronRight className="h-[18px] w-[18px] text-ink/35" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm xl:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <th className="px-4 py-3.5">Utilisateur & contact</th>
                    <th className="px-4 py-3.5">Institut rattaché</th>
                    <th className="px-4 py-3.5">Rôle</th>
                    <th className="px-4 py-3.5">Statut & sécurité</th>
                    <th className="px-4 py-3.5">Dernière connexion</th>
                    <th className="px-4 py-3.5">Créé le</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((u) => {
                    const featured = selectedId === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedId(u.id)}
                        className={cn(
                          "cursor-pointer border-t border-[#FFEFF8] transition-colors hover:bg-[#FFF7F9]",
                          featured && "bg-[#FCE9F4]/40",
                          u.status === "DISABLED" && "bg-red-50/40",
                          u.mustChangePassword && "bg-[#FFDEA4]/10",
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                                u.status === "DISABLED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-[#FFEFF8] text-primary",
                              )}
                            >
                              {initials(u.firstName, u.lastName)}
                              {isLiveSession(u) ? (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-primary" />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-bold text-ink">
                                  {fullName(u)}
                                </span>
                                <span className="rounded bg-[#F0DDE9] px-1.5 py-0.5 text-[10px] font-bold text-ink/60">
                                  {u.accountKind === "PLATFORM" ? "Admin" : "Salon"}
                                </span>
                              </div>
                              <p className="truncate text-[12px] text-ink/45">{u.email}</p>
                              {u.phone ? (
                                <p className="font-mono text-[11px] text-ink/50">{u.phone}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-ink">
                              {u.organizationName ?? "— Plateforme —"}
                            </span>
                            {u.organizationCity ? (
                              <span className="text-[12px] text-ink/45">
                                {u.organizationCity}
                              </span>
                            ) : null}
                            {u.organizationId ? (
                              <span className="font-mono text-[10px] text-[#7B5900]">
                                #{u.organizationId.slice(-8).toUpperCase()}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
                              roleBadgeClass(u.role),
                            )}
                          >
                            <Shield className="h-3.5 w-3.5" />
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <UserStatusPill user={u} />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-ink">
                            {formatRelative(u.lastLoginAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[12px] text-ink/50">
                          {fmtDate(u.createdAt)}
                        </td>
                        <td
                          className="px-4 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AdminActionsMenu triggerLabel="⋯">
                            {(close) => (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={adminMenuItemClass}
                                  onClick={() => {
                                    setSelectedId(u.id);
                                    close();
                                  }}
                                >
                                  Voir la fiche
                                </button>
                                <Link
                                  href={adminHref(`/users/${u.id}/`)}
                                  className={adminMenuItemClass}
                                  role="menuitem"
                                  onClick={close}
                                >
                                  Fiche complète
                                </Link>
                                {u.organizationId ? (
                                  <Link
                                    href={adminHref(
                                      `/organizations/${u.organizationId}/`,
                                    )}
                                    className={adminMenuItemClass}
                                    role="menuitem"
                                    onClick={close}
                                  >
                                    Voir l&apos;institut
                                  </Link>
                                ) : null}
                                {u.accountKind === "ORG" ? (
                                  <>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className={`${adminMenuItemClass} font-bold text-[#7B5900]`}
                                      onClick={() => {
                                        close();
                                        setPending({ kind: "reset_password", user: u });
                                      }}
                                    >
                                      Réinitialiser le mot de passe
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className={`${adminMenuItemClass} font-bold text-primary`}
                                      onClick={() => {
                                        close();
                                        setPending({
                                          kind: "invalidate_sessions",
                                          user: u,
                                        });
                                      }}
                                    >
                                      Révoquer sessions
                                    </button>
                                    {u.status === "ACTIVE" ? (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className={`${adminMenuItemClass} font-bold text-red-700`}
                                        onClick={() => {
                                          close();
                                          setPending({ kind: "disable", user: u });
                                        }}
                                      >
                                        Bloquer le compte
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className={adminMenuItemClass}
                                        onClick={() => {
                                          close();
                                          void patchAdminUser(u.id, {
                                            status: "ACTIVE",
                                          }).then(load);
                                        }}
                                      >
                                        Réactiver
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <p className="px-3 py-2 text-xs text-ink/45">
                                    Compte plateforme — actions limitées.
                                  </p>
                                )}
                              </>
                            )}
                          </AdminActionsMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-[#FFEFF8] px-4 py-3">
              <p className="text-xs text-ink/55">
                Affichage de <span className="font-bold text-ink">{from}</span> à{" "}
                <span className="font-bold text-ink">{to}</span> sur{" "}
                <span className="font-bold text-ink">{filtered.length}</span> utilisateurs
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-sm disabled:opacity-40"
                >
                  Précédent
                </button>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-sm">
                  {pageSafe}
                </span>
                <span className="px-1 text-ink/40">/</span>
                <span className="text-xs font-bold text-ink">{totalPages}</span>
                <button
                  type="button"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-sm disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>

          {/* Mobile pagination */}
          <div className="flex items-center justify-between xl:hidden">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-white px-3.5 text-sm font-bold text-ink shadow-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Préc.
            </button>
            <div className="flex items-center gap-1 text-sm font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                {pageSafe}
              </span>
              <span className="text-ink/40">…</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink shadow-sm">
                {totalPages}
              </span>
            </div>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-white px-3.5 text-sm font-bold text-ink shadow-sm disabled:opacity-40"
            >
              Suiv.
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!loading && filtered.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
              Aucun utilisateur trouvé.
            </p>
          ) : null}
        </div>

        {/* Drawer */}
        <aside className="sticky top-20 w-full shrink-0 xl:w-96">
          {selected ? (
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#FFEFF8] text-lg font-bold text-primary ring-2 ring-primary/20">
                    {initials(selected.firstName, selected.lastName)}
                    {isLiveSession(selected) ? (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary" />
                    ) : null}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">{fullName(selected)}</h3>
                    <p className="text-[11px] font-bold text-[#7B5900]">
                      {ORG_USER_ROLE_LABEL[selected.role] ?? selected.role}
                    </p>
                    {isLiveSession(selected) ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-primary">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        Session active maintenant
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-ink/35 hover:text-ink"
                  onClick={() => setSelectedId(null)}
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {selected.accountKind === "ORG" ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPending({ kind: "reset_password", user: selected })
                    }
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-[12px] font-bold text-white shadow-sm"
                  >
                    <KeyRound className="h-4 w-4" />
                    Reset mdp
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPending({ kind: "invalidate_sessions", user: selected })
                    }
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FFEFF8] px-2 text-[12px] font-bold text-ink"
                  >
                    <Power className="h-4 w-4" />
                    Révoquer
                  </button>
                </div>
              ) : null}

              <div className="space-y-2 rounded-xl bg-[#FFF7F9] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                  Informations générales
                </p>
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-ink/45">Email</span>
                    <span className="select-all font-bold text-ink">{selected.email}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-ink/45">Téléphone</span>
                    <span className="font-mono font-bold text-ink">
                      {selected.phone ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-ink/45">Identifiant</span>
                    <span className="font-mono text-[11px] text-[#7B5900]">
                      #{selected.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-ink/45">Créé le</span>
                    <span className="font-mono text-ink">{fmtDate(selected.createdAt)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-ink/45">sessionVersion</span>
                    <span className="font-mono font-bold text-primary">
                      v{selected.sessionVersion}
                    </span>
                  </div>
                </div>
              </div>

              {selected.organizationName ? (
                <div className="space-y-2 rounded-xl bg-[#FFF7F9] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    Tenant rattaché
                  </p>
                  <p className="font-bold text-ink">{selected.organizationName}</p>
                  {selected.organizationCity ? (
                    <p className="text-[12px] text-ink/55">{selected.organizationCity}</p>
                  ) : null}
                  {selected.organizationId ? (
                    <Link
                      href={adminHref(`/organizations/${selected.organizationId}/`)}
                      className="inline-flex text-[12px] font-bold text-primary hover:underline"
                    >
                      Ouvrir l&apos;institut →
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    Audit de sécurité
                  </p>
                  {activityLoading ? (
                    <span className="text-[10px] text-ink/40">…</span>
                  ) : null}
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto font-mono text-[11px]">
                  {activity.length === 0 && !activityLoading ? (
                    <p className="text-ink/40">Aucune activité récente.</p>
                  ) : null}
                  {activity.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-ink">
                      <span className="shrink-0 text-ink/40">
                        {new Date(a.createdAt).toLocaleTimeString("fr-MA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold">
                          {platformAuditActionLabel(a.action)}
                        </span>
                        <p className="font-sans text-[10px] text-ink/45">
                          {a.entityType} · {a.entityId.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selected.accountKind === "ORG" && selected.status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={() => setPending({ kind: "disable", user: selected })}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FFEFF8] py-2 text-[12px] font-bold text-ink/50 transition-colors hover:bg-red-100 hover:text-red-700"
                >
                  <Lock className="h-4 w-4" />
                  Verrouiller temporairement ce compte
                </button>
              ) : null}

              <Link
                href={adminHref(`/users/${selected.id}/`)}
                className="text-center text-[12px] font-bold text-primary hover:underline"
              >
                Ouvrir la fiche complète
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
              Sélectionnez un utilisateur pour inspecter sa fiche.
            </div>
          )}
        </aside>
      </div>

      {/* Bottom stats */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-lg font-bold text-ink">Répartition des rôles</h4>
              <span className="text-[11px] text-ink/45">{kpis.total} utilisateurs</span>
            </div>
            <p className="text-[13px] text-ink/55">
              Pyramide des privilèges sur l&apos;ensemble du réseau.
            </p>
          </div>
          <div className="space-y-2">
            {roleBars.map((r) => (
              <div key={r.role}>
                <div className="flex justify-between pb-1 text-[12px]">
                  <span className="font-bold text-ink">
                    {r.role} ({r.label})
                  </span>
                  <span className="font-mono">
                    {r.count} ({r.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#FFEFF8]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.role === "STAFF"
                        ? "bg-primary"
                        : r.role === "OWNER"
                          ? "bg-[#BA0049]"
                          : r.role === "MANAGER"
                            ? "bg-[#F0BF5C]"
                            : "bg-[#8F6F73]",
                    )}
                    style={{ width: `${Math.min(100, r.pct)}%` }}
                  />
                </div>
              </div>
            ))}
            {roleBars.length === 0 ? (
              <p className="text-sm text-ink/40">Pas encore de données.</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-lg font-bold text-ink">Activité des connexions</h4>
              <span className="text-[11px] font-bold text-primary">Live</span>
            </div>
            <p className="text-[13px] text-ink/55">
              Fréquentation journalière et comptes à risque.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#FFEFF8] p-3">
              <div className="text-xl font-black text-ink">{kpis.onlineToday}</div>
              <span className="text-[10px] font-bold uppercase text-ink/45">
                Aujourd&apos;hui
              </span>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] p-3">
              <div className="text-xl font-black text-ink">{kpis.active}</div>
              <span className="text-[10px] font-bold uppercase text-ink/45">Actifs</span>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] p-3">
              <div className="text-xl font-black text-primary">{kpis.thisMonth}</div>
              <span className="text-[10px] font-bold uppercase text-ink/45">Ce mois</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#FFF7F9] p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#7B5900]" />
              <div>
                <p className="text-[12px] font-bold text-ink">Incidents d&apos;auth</p>
                <p className="text-[12px] text-ink/45">
                  {kpis.disabled} comptes séquestrés · {kpis.watchlist} watchlist
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2 pb-1">
              <ShieldCheck className="h-5 w-5 text-[#7B5900]" />
              <h4 className="text-lg font-bold text-ink">Conformité CNDP & RLS</h4>
            </div>
            <p className="text-[13px] text-ink/55">
              Cadre légal marocain n° 09-08 & isolation PostgreSQL.
            </p>
          </div>
          <div className="space-y-2 text-[12px] text-ink">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Sessions invalidables via sessionVersion (révocation globale).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Isolation hermétique des données par tenant (RLS).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Traçabilité des actions Super Admin dans l&apos;audit plateforme.</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Hub Casablanca
            </div>
            <span className="font-mono text-[11px] text-ink/45">Cluster MA-CAS</span>
          </div>
        </div>
      </section>

      {temp ? (
        <TempPasswordModal
          password={temp.password}
          message={temp.message}
          userLabel={temp.label}
          onClose={() => setTemp(null)}
        />
      ) : null}

      <SensitiveConfirmDialog
        open={pending != null}
        kind={pending?.kind ?? null}
        subject={pending ? fullName(pending.user) : ""}
        detail={pending?.user.email}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void executeSensitive(pending.kind, pending.user);
        }}
      />
    </div>
  );
}
