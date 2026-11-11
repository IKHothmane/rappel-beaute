"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Pencil,
  Power,
  Search,
  Shield,
  UserPlus,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  SensitiveConfirmDialog,
  type SensitiveActionKind,
} from "@/components/admin/SensitiveConfirmDialog";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  createPlatformAdminApi,
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
    return "bg-indigo-100 text-indigo-800";
  }
  if (role === "MANAGER") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-900";
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-[#7B5900]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#7B5900]" />
        Inactif ({Math.floor(daysSince(user.lastLoginAt))}j)
      </span>
    );
  }
  if (isLiveSession(user)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-[#3B63D6]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3B63D6]" />
        Actif (Session live)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-[#3B63D6]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#3B63D6]" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Réinitialiser l&apos;accès</h4>
              <p className="text-xs text-slate-500">{userLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-900"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-slate-100 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Nouveau mot de passe temporaire
          </span>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 font-mono text-base font-bold text-[#3B63D6]">
            <span>{password}</span>
            <button
              type="button"
              className="text-slate-400 hover:text-[#3B63D6]"
              onClick={() => void navigator.clipboard?.writeText(password)}
              title="Copier"
            >
              Copier
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            L&apos;utilisateur devra modifier son mot de passe à la prochaine connexion.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-[#E4BDC2]/60"
            onClick={() => void navigator.clipboard?.writeText(message)}
          >
            Copier le message
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#3B63D6] px-4 py-2 text-sm font-bold text-white shadow-sm"
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createFirst, setCreateFirst] = useState("");
  const [createLast, setCreateLast] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

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

  const loadSeq = useRef(0);

  const load = useCallback((fresh = false) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    fetchAdminUsers({
      search: q || undefined,
      role: role !== "ALL" ? role : undefined,
      status: status !== "ALL" ? status : undefined,
      organizationId: organizationId !== "ALL" ? organizationId : undefined,
      fresh,
    })
      .then((res) => {
        if (seq !== loadSeq.current) return;
        setItems(res.items);
        setKpis(res.kpis);
        setOrgs(res.organizations);
        setSelectedId((prev) =>
          prev && res.items.some((item) => item.id === prev) ? prev : (res.items[0]?.id ?? null),
        );
      })
      .catch((e) => {
        if (seq !== loadSeq.current) return;
        setError(e instanceof Error ? e.message : "Erreur");
        setItems([]);
      })
      .finally(() => {
        if (seq === loadSeq.current) setLoading(false);
      });
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
      } else if (kind === "disable" || kind === "delete") {
        await patchAdminUser(user.id, {
          status: "DISABLED",
          delete: kind === "delete",
        });
        setProfileOpen(false);
        setItems((current) =>
          current.map((item) =>
            item.id === user.id ? { ...item, status: "DISABLED" } : item,
          ),
        );
      }
      setPending(null);
      load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  function openProfileEditor(user: PlatformOrgUser) {
    setSelectedId(user.id);
    setProfile({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? "",
    });
    setProfileOpen(true);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || selected.accountKind !== "ORG") return;
    setBusy(true);
    try {
      await patchAdminUser(selected.id, {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      setProfileOpen(false);
      setItems((current) =>
        current.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                firstName: profile.firstName.trim(),
                lastName: profile.lastName.trim(),
                email: profile.email.trim(),
                phone: profile.phone.trim() || null,
              }
            : item,
        ),
      );
      load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
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
    <div className="flex w-full min-w-0 max-w-none flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-[#0F172A]">Utilisateurs</h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">
            Supervisez les comptes, la sécurité des accès et les sessions de tous les instituts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 lg:w-80 lg:flex-none">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              id="users-omni-search"
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Nom, e-mail, téléphone…"
              aria-label="Rechercher un utilisateur"
              className="h-11 w-full rounded-xl border-0 bg-white pl-10 pr-12 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[#3B63D6]/40"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:block">
              ⌘K
            </kbd>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-[#3B63D6]" aria-hidden />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3B63D6] px-4 text-sm font-semibold text-white shadow-lg shadow-[#3B63D6]/25 transition hover:bg-[#2F52B8] sm:px-5"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Ajouter un admin
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section aria-label="Indicateurs" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          {
            key: "total",
            label: "Total comptes",
            value: kpis.total,
            hint: `+${kpis.thisMonth} ce mois · ${kpis.orgsCount} instituts`,
            icon: UsersRound,
            tone: "bg-[#3B63D6]/10 text-[#3B63D6]",
            onClick: () => setSegment("all"),
          },
          {
            key: "active",
            label: "Actifs",
            value: kpis.active,
            hint: `${activePct}% des comptes`,
            icon: CheckCircle2,
            tone: "bg-emerald-100 text-emerald-700",
            onClick: () => setSegment("active"),
          },
          {
            key: "inactive",
            label: "Inactifs",
            value: kpis.inactive,
            hint: `${inactivePct}% · +30 j sans connexion`,
            icon: Hourglass,
            tone: "bg-amber-100 text-amber-700",
            onClick: () => setSegment("inactive"),
          },
          {
            key: "online",
            label: "En ligne aujourd’hui",
            value: kpis.onlineToday,
            hint: "Sessions du jour",
            icon: Bolt,
            tone: "bg-violet-100 text-violet-700",
            onClick: undefined,
          },
          {
            key: "blocked",
            label: "Bloqués",
            value: kpis.disabled,
            hint: "Comptes désactivés",
            icon: Lock,
            tone: "bg-red-100 text-red-700",
            onClick: () => setSegment("blocked"),
          },
          {
            key: "watch",
            label: "À surveiller",
            value: kpis.watchlist,
            hint: "Mot de passe temporaire",
            icon: AlertTriangle,
            tone: "bg-orange-100 text-orange-700",
            onClick: () => setSegment("watchlist"),
          },
        ].map((k) => {
          const Icon = k.icon;
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{k.label}</span>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", k.tone)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">{k.value}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{k.hint}</p>
            </>
          );
          const cls = "rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition";
          return k.onClick ? (
            <button
              key={k.key}
              type="button"
              onClick={k.onClick}
              className={cn(
                cls,
                "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B63D6]",
              )}
            >
              {body}
            </button>
          ) : (
            <div key={k.key} className={cls}>
              {body}
            </div>
          );
        })}
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Filtrer par segment">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={segment === t.id}
                onClick={() => setSegment(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-4 py-1.5 text-sm font-semibold transition",
                  segment === t.id
                    ? "border-[#3B63D6] bg-[#3B63D6] text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
                )}
              >
                <span>{t.label}</span>
                <span className={cn("text-xs", segment === t.id ? "text-white/80" : "text-slate-400")}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden md:inline">
              Affichage {from} à {to} sur {filtered.length}
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[12px] font-bold text-slate-900 focus:outline-none"
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
            className="h-10 rounded-lg bg-slate-100 px-3 text-sm text-slate-900 focus:outline-none"
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
            className="h-10 rounded-lg bg-slate-100 px-3 text-sm text-slate-900 focus:outline-none"
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
            className="h-10 rounded-lg bg-slate-100 px-3 text-sm text-slate-900 focus:outline-none"
          >
            <option value="ALL">Cloisonnement type</option>
            <option value="ORG">Salons abonnés</option>
            <option value="PLATFORM">Platform Super Admin</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg bg-slate-100 px-3 text-sm text-slate-900 focus:outline-none"
          >
            <option value="ALL">Statut compte</option>
            <option value="ACTIVE">Actif</option>
            <option value="DISABLED">Bloqué</option>
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="col-span-2 h-10 rounded-lg bg-slate-100 px-3 text-sm text-slate-900 focus:outline-none md:col-span-1"
          >
            <option value="ALL">Période : toutes</option>
            <option value="30">Derniers 30 jours</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => load(true)}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-semibold shadow-sm"
          >
            Réessayer
          </button>
        </div>
      ) : null}
      {loading ? (
        <div role="status" aria-busy="true" className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <span className="sr-only">Chargement…</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
          ))}
        </div>
      ) : null}

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
                      featured && "ring-1 ring-[#3B63D6]/30",
                      u.status === "DISABLED" && "bg-red-50/60",
                      u.mustChangePassword && "bg-[#FFDEA4]/15",
                    )}
                  >
                    {featured ? (
                      <span className="absolute bottom-0 left-0 top-0 w-1 bg-[#3B63D6]" />
                    ) : null}
                    <div className="flex min-w-0 items-center gap-3 pl-1">
                      <div
                        className={cn(
                          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          u.status === "DISABLED"
                            ? "bg-red-100 text-red-700"
                            : u.mustChangePassword
                              ? "bg-[#FFDEA4]/60 text-[#5D4200]"
                              : "bg-slate-100 text-[#3B63D6]",
                        )}
                      >
                        {initials(u.firstName, u.lastName)}
                        {isOnlineToday(u) && u.status === "ACTIVE" ? (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-slate-900">
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
                        <p className="truncate text-[11px] text-slate-500">
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
                        <span className="text-[11px] text-slate-500">
                          {formatRelative(u.lastLoginAt)}
                        </span>
                      )}
                      <ChevronRight className="h-[18px] w-[18px] text-slate-400" />
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
                  <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5">Utilisateur & contact</th>
                    <th className="px-4 py-3.5">Institut rattaché</th>
                    <th className="px-4 py-3.5">Rôle</th>
                    <th className="px-4 py-3.5">Statut & sécurité</th>
                    <th className="px-4 py-3.5">Dernière connexion</th>
                    <th className="px-4 py-3.5">Créé le</th>
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
                          "cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50",
                          featured && "bg-[#3B63D6]/5",
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
                                  : "bg-slate-100 text-[#3B63D6]",
                              )}
                            >
                              {initials(u.firstName, u.lastName)}
                              {isLiveSession(u) ? (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#3B63D6]" />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-bold text-slate-900">
                                  {fullName(u)}
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                  {u.accountKind === "PLATFORM" ? "Admin" : "Salon"}
                                </span>
                              </div>
                              <p className="truncate text-[12px] text-slate-500">{u.email}</p>
                              {u.phone ? (
                                <p className="font-mono text-[11px] text-slate-500">{u.phone}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">
                              {u.organizationName ?? "— Plateforme —"}
                            </span>
                            {u.organizationCity ? (
                              <span className="text-[12px] text-slate-500">
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
                          <span className="font-bold text-slate-900">
                            {formatRelative(u.lastLoginAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[12px] text-slate-500">
                          {fmtDate(u.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Affichage de <span className="font-bold text-slate-900">{from}</span> à{" "}
                <span className="font-bold text-slate-900">{to}</span> sur{" "}
                <span className="font-bold text-slate-900">{filtered.length}</span> utilisateurs
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm disabled:opacity-40"
                >
                  Précédent
                </button>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B63D6] text-xs font-bold text-white shadow-sm">
                  {pageSafe}
                </span>
                <span className="px-1 text-slate-400">/</span>
                <span className="text-xs font-bold text-slate-900">{totalPages}</span>
                <button
                  type="button"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm disabled:opacity-40"
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
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-white px-3.5 text-sm font-bold text-slate-900 shadow-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Préc.
            </button>
            <div className="flex items-center gap-1 text-sm font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B63D6] text-white">
                {pageSafe}
              </span>
              <span className="text-slate-400">…</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900 shadow-sm">
                {totalPages}
              </span>
            </div>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-white px-3.5 text-sm font-bold text-slate-900 shadow-sm disabled:opacity-40"
            >
              Suiv.
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!loading && filtered.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Aucun utilisateur trouvé.
            </p>
          ) : null}
        </div>

        {/* Drawer */}
        <aside className="sticky top-20 w-full shrink-0 xl:w-[30rem]">
          {selected ? (
            <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-[#3B63D6] ring-2 ring-[#3B63D6]/20">
                    {initials(selected.firstName, selected.lastName)}
                    {isLiveSession(selected) ? (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#3B63D6]" />
                    ) : null}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{fullName(selected)}</h3>
                    <p className="text-[11px] font-bold text-[#7B5900]">
                      {ORG_USER_ROLE_LABEL[selected.role] ?? selected.role}
                    </p>
                    {isLiveSession(selected) ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-[#3B63D6]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#3B63D6]" />
                        Session active maintenant
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-900"
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
                    onClick={() => openProfileEditor(selected)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 text-[12px] font-bold text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPending({ kind: "reset_password", user: selected })
                    }
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#3B63D6] px-2 text-[12px] font-bold text-white shadow-sm"
                  >
                    <KeyRound className="h-4 w-4" />
                    Reset mdp
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPending({ kind: "invalidate_sessions", user: selected })
                    }
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 text-[12px] font-bold text-slate-900"
                  >
                    <Power className="h-4 w-4" />
                    Révoquer
                  </button>
                  {selected.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => setPending({ kind: "delete", user: selected })}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-red-50 px-2 text-[12px] font-bold text-red-800"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
              ) : null}

              {profileOpen && selected.accountKind === "ORG" ? (
                <form onSubmit={(event) => void saveProfile(event)} className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Modifier les informations
                  </p>
                  <label className="block text-[12px] font-bold text-slate-500">
                    Prénom
                    <input
                      required
                      value={profile.firstName}
                      onChange={(event) =>
                        setProfile((current) => ({ ...current, firstName: event.target.value }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[#F0DDE9] bg-white px-2 text-sm font-medium text-slate-900"
                    />
                  </label>
                  <label className="block text-[12px] font-bold text-slate-500">
                    Nom
                    <input
                      required
                      value={profile.lastName}
                      onChange={(event) =>
                        setProfile((current) => ({ ...current, lastName: event.target.value }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[#F0DDE9] bg-white px-2 text-sm font-medium text-slate-900"
                    />
                  </label>
                  <label className="block text-[12px] font-bold text-slate-500">
                    E-mail
                    <input
                      required
                      type="email"
                      value={profile.email}
                      onChange={(event) =>
                        setProfile((current) => ({ ...current, email: event.target.value }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[#F0DDE9] bg-white px-2 text-sm font-medium text-slate-900"
                    />
                  </label>
                  <label className="block text-[12px] font-bold text-slate-500">
                    Téléphone
                    <input
                      value={profile.phone}
                      onChange={(event) =>
                        setProfile((current) => ({ ...current, phone: event.target.value }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[#F0DDE9] bg-white px-2 text-sm font-medium text-slate-900"
                    />
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={busy}
                      className="h-9 flex-1 rounded-lg bg-[#3B63D6] text-[12px] font-bold text-white disabled:opacity-50"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      className="h-9 flex-1 rounded-lg bg-white text-[12px] font-bold text-slate-900"
                      onClick={() => setProfileOpen(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Informations générales
                </p>
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Email</span>
                    <span className="select-all font-bold text-slate-900">{selected.email}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Téléphone</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selected.phone ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Identifiant</span>
                    <span className="font-mono text-[11px] text-[#7B5900]">
                      #{selected.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Créé le</span>
                    <span className="font-mono text-slate-900">{fmtDate(selected.createdAt)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">sessionVersion</span>
                    <span className="font-mono font-bold text-[#3B63D6]">
                      v{selected.sessionVersion}
                    </span>
                  </div>
                </div>
              </div>

              {selected.organizationName ? (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tenant rattaché
                  </p>
                  <p className="font-bold text-slate-900">{selected.organizationName}</p>
                  {selected.organizationCity ? (
                    <p className="text-[12px] text-slate-500">{selected.organizationCity}</p>
                  ) : null}
                  {selected.organizationId ? (
                    <Link
                      href={adminHref(`/organizations/${selected.organizationId}/`)}
                      className="inline-flex text-[12px] font-bold text-[#3B63D6] hover:underline"
                    >
                      Ouvrir l&apos;institut →
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Audit de sécurité
                  </p>
                  {activityLoading ? (
                    <span className="text-[10px] text-slate-400">…</span>
                  ) : null}
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto font-mono text-[11px]">
                  {activity.length === 0 && !activityLoading ? (
                    <p className="text-slate-400">Aucune activité récente.</p>
                  ) : null}
                  {activity.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-slate-900">
                      <span className="shrink-0 text-slate-400">
                        {new Date(a.createdAt).toLocaleTimeString("fr-MA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold">
                          {platformAuditActionLabel(a.action)}
                        </span>
                        <p className="font-sans text-[10px] text-slate-500">
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-[12px] font-bold text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700"
                >
                  <Lock className="h-4 w-4" />
                  Verrouiller temporairement ce compte
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
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
              <h4 className="text-lg font-bold text-slate-900">Répartition des rôles</h4>
              <span className="text-[11px] text-slate-500">{kpis.total} utilisateurs</span>
            </div>
            <p className="text-[13px] text-slate-500">
              Pyramide des privilèges sur l&apos;ensemble du réseau.
            </p>
          </div>
          <div className="space-y-2">
            {roleBars.map((r) => (
              <div key={r.role}>
                <div className="flex justify-between pb-1 text-[12px]">
                  <span className="font-bold text-slate-900">
                    {r.role} ({r.label})
                  </span>
                  <span className="font-mono">
                    {r.count} ({r.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.role === "STAFF"
                        ? "bg-[#3B63D6]"
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
              <p className="text-sm text-slate-400">Pas encore de données.</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-lg font-bold text-slate-900">Activité des connexions</h4>
              <span className="text-[11px] font-bold text-[#3B63D6]">Live</span>
            </div>
            <p className="text-[13px] text-slate-500">
              Fréquentation journalière et comptes à risque.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-xl font-black text-slate-900">{kpis.onlineToday}</div>
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Aujourd&apos;hui
              </span>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-xl font-black text-slate-900">{kpis.active}</div>
              <span className="text-[10px] font-bold uppercase text-slate-500">Actifs</span>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-xl font-black text-[#3B63D6]">{kpis.thisMonth}</div>
              <span className="text-[10px] font-bold uppercase text-slate-500">Ce mois</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#7B5900]" />
              <div>
                <p className="text-[12px] font-bold text-slate-900">Incidents d&apos;auth</p>
                <p className="text-[12px] text-slate-500">
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
              <h4 className="text-lg font-bold text-slate-900">Conformité CNDP & RLS</h4>
            </div>
            <p className="text-[13px] text-slate-500">
              Cadre légal marocain n° 09-08 & isolation PostgreSQL.
            </p>
          </div>
          <div className="space-y-2 text-[12px] text-slate-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3B63D6]" />
              <span>Sessions invalidables via sessionVersion (révocation globale).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3B63D6]" />
              <span>Isolation hermétique des données par tenant (RLS).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3B63D6]" />
              <span>Traçabilité des actions Super Admin dans l&apos;audit plateforme.</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-100 p-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-900">
              <span className="h-2 w-2 rounded-full bg-[#3B63D6]" />
              Hub Casablanca
            </div>
            <span className="font-mono text-[11px] text-slate-500">Cluster MA-CAS</span>
          </div>
        </div>
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F172A]/45 p-4">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              setCreateError(null);
              setBusy(true);
              void createPlatformAdminApi({
                email: createEmail.trim(),
                password: createPassword,
                firstName: createFirst.trim(),
                lastName: createLast.trim(),
              })
                .then(() => {
                  setCreateOpen(false);
                  setCreateFirst("");
                  setCreateLast("");
                  setCreateEmail("");
                  setCreatePassword("");
                  load();
                })
                .catch((err) => {
                  setCreateError(err instanceof Error ? err.message : "Création impossible.");
                })
                .finally(() => setBusy(false));
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Ajouter un admin</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Compte Super Admin. Connexion avec cet e-mail et ce mot de passe.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"
                onClick={() => setCreateOpen(false)}
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Prénom</span>
                <input
                  required
                  value={createFirst}
                  onChange={(e) => setCreateFirst(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-[#3B63D6]"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nom</span>
                <input
                  required
                  value={createLast}
                  onChange={(e) => setCreateLast(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-[#3B63D6]"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">E-mail</span>
              <input
                required
                type="email"
                autoComplete="off"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-[#3B63D6]"
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">Mot de passe</span>
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-[#3B63D6]"
              />
              <span className="mt-1 block text-xs text-slate-500">8 caractères minimum.</span>
            </label>
            {createError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{createError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500"
                onClick={() => setCreateOpen(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#3B63D6] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "…" : "Créer le compte"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

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
