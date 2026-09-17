"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  CreditCard,
  Hourglass,
  LayoutDashboard,
  LifeBuoy,
  MonitorDot,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Search,
  Settings,
  Shield,
  Store,
  Terminal,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/www/BrandLogo";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import { fetchAdminAudit, fetchAdminSession, platformLogout } from "@/modules/admin/client";
import { fetchSupportTickets } from "@/modules/admin/support-tickets";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "tickets" | "health";
};
type NavGroup = { title?: string; items: NavItem[] };

/** Navbar plateforme SUPER_ADMIN — maquette « Haute Plateforme » */
const NAV: NavGroup[] = [
  {
    title: "Vue Globale",
    items: [
      { href: "/dashboard/", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/organizations/", label: "Instituts", icon: Store },
      { href: "/subscriptions/", label: "Abonnements", icon: CreditCard },
      { href: "/users/", label: "Utilisateurs globaux", icon: Users },
    ],
  },
  {
    title: "Finance SaaS",
    items: [
      { href: "/billing/", label: "MRR & Revenus", icon: Activity },
      { href: "/plans/", label: "Plans & tarifs", icon: Receipt },
    ],
  },
  {
    title: "Opérations",
    items: [
      { href: "/support/tickets/", label: "Support & Tickets", icon: LifeBuoy, badge: "tickets" },
      { href: "/onboarding/", label: "Onboarding & Essais", icon: Hourglass },
      { href: "/system/logs/", label: "Activité & Logs", icon: Terminal },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { href: "/system/health/", label: "Santé Système", icon: MonitorDot, badge: "health" },
      { href: "/settings/", label: "Configuration", icon: Settings },
      { href: "/audit/", label: "Sécurité & Audit", icon: Shield },
    ],
  },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard/", label: "Vue Globale", icon: LayoutDashboard },
  { href: "/organizations/", label: "Instituts", icon: Store },
  { href: "/subscriptions/", label: "Abonnements", icon: CreditCard },
  { href: "/support/tickets/", label: "Support", icon: LifeBuoy, badge: "tickets" },
  { href: "/system/health/", label: "Système", icon: Terminal },
];

const SIDEBAR_W = 288;
const SIDEBAR_W_COLLAPSED = 76;
const ACCOUNT_FOOTER_H = 108;
const ACCOUNT_FOOTER_H_COLLAPSED = 72;
const SIDEBAR_COLLAPSE_KEY = "rb-admin-sidebar-collapsed";

function normalizePath(pathname: string) {
  const stripped = pathname.replace(/^\/domains\/admin/, "");
  return stripped === "" ? "/" : stripped;
}

function isActive(pathname: string, href: string) {
  const path = normalizePath(pathname);
  if (href === "/dashboard/") {
    return path === "/dashboard/" || path === "/dashboard" || path === "/";
  }
  if (href === "/organizations/") {
    return path.startsWith("/organizations");
  }
  if (href === "/onboarding/") {
    return path.startsWith("/onboarding");
  }
  if (href === "/support/tickets/") {
    return path.startsWith("/support");
  }
  if (href === "/system/logs/") {
    return path.startsWith("/system/logs") || path.startsWith("/notifications");
  }
  if (href === "/system/health/") {
    return path.startsWith("/system/health");
  }
  if (href === "/audit/") {
    return path.startsWith("/audit") || path.startsWith("/security");
  }
  if (href === "/billing/") {
    return path.startsWith("/billing");
  }
  if (href === "/plans/") {
    return path.startsWith("/plans");
  }
  if (href === "/subscriptions/") {
    return path.startsWith("/subscriptions");
  }
  return path === href || path.startsWith(href.replace(/\/$/, ""));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = normalizePath(pathname);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [recentCount, setRecentCount] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const href = adminHref;
  const sidebarW = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;
  const footerH = collapsed ? ACCOUNT_FOOTER_H_COLLAPSED : ACCOUNT_FOOTER_H;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchAdminSession().then((u) => {
      if (!u) return;
      setDisplayName(`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim());
    });
    fetchAdminAudit(20)
      .then((res) => setRecentCount(res.items.length))
      .catch(() => setRecentCount(0));
    fetchSupportTickets({ status: "OPEN" })
      .then((res) => setOpenTickets(res.kpis.open))
      .catch(() => setOpenTickets(0));
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function logout() {
    void platformLogout().then(() => {
      window.location.href = href("/login/");
    });
  }

  if (path.startsWith("/login")) {
    return <>{children}</>;
  }

  function renderNavLink(
    item: NavItem,
    opts?: { mobile?: boolean; indented?: boolean; iconsOnly?: boolean },
  ) {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    const iconsOnly = Boolean(opts?.iconsOnly);
    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={href(item.href)}
        onClick={() => setOpen(false)}
        title={iconsOnly ? item.label : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
          opts?.indented && "pl-3",
          active
            ? "bg-primary font-bold text-white shadow-[0_4px_20px_-2px_rgba(186,0,73,0.25)]"
            : "font-medium text-ink/60 hover:bg-[#F6E3EF] hover:text-ink",
          opts?.mobile && "flex-col gap-0.5 px-2 py-1.5 text-center",
          iconsOnly && "justify-center px-0 py-2.5",
        )}
        aria-current={active ? "page" : undefined}
        aria-label={iconsOnly ? item.label : undefined}
      >
        <span className="relative inline-flex">
          <Icon
            className={cn(opts?.mobile ? "h-[22px] w-[22px]" : "h-5 w-5")}
            strokeWidth={active ? 2.4 : 2}
          />
          {item.badge === "tickets" && openTickets > 0 && (opts?.mobile || iconsOnly) ? (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
              {Math.min(openTickets, 99)}
            </span>
          ) : null}
          {item.badge === "health" && iconsOnly ? (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          ) : null}
        </span>
        {opts?.mobile ? (
          <span className="text-[10px] leading-tight">{item.label}</span>
        ) : iconsOnly ? null : (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge === "tickets" && openTickets > 0 ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-[#D93260] text-white",
                )}
              >
                {Math.min(openTickets, 99)}
              </span>
            ) : null}
            {item.badge === "health" ? (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            ) : null}
          </>
        )}
      </Link>
    );
  }

  return (
    <div className="admin-console min-h-screen bg-[#FFF7F9] text-ink">
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 hidden flex-col border-r border-line bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-[width] duration-200 ease-out lg:flex",
          )}
          style={{ width: sidebarW, height: `calc(100dvh - ${footerH}px)` }}
        >
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-line py-3",
              collapsed ? "flex-col gap-2 px-2" : "justify-between gap-2 px-3",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-2.5",
                collapsed && "justify-center",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-[0_4px_20px_-2px_rgba(186,0,73,0.3)]">
                R
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold tracking-tight text-ink">
                    Rappel Beauté
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B5900]">
                    Haute Plateforme
                  </p>
                </div>
              ) : null}
            </div>
            {!collapsed ? (
              <span className="shrink-0 rounded-full bg-[#382D36] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                Super Admin
              </span>
            ) : null}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Agrandir la navigation" : "Réduire aux icônes"}
              aria-label={collapsed ? "Agrandir la navigation" : "Réduire aux icônes"}
              aria-pressed={collapsed}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/55 transition hover:bg-[#FFEFF8] hover:text-ink",
                collapsed && "mx-auto",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav
            className={cn(
              "min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain",
              collapsed ? "space-y-3 p-2" : "p-4",
            )}
            aria-label="Navigation Super Admin"
          >
            {NAV.map((group) => (
              <div key={group.title ?? "root"}>
                {group.title && !collapsed ? (
                  <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-ink/40">
                    {group.title}
                  </p>
                ) : null}
                {group.title && collapsed ? (
                  <div className="mx-auto mb-1 h-px w-6 bg-line" aria-hidden />
                ) : null}
                <div className="flex flex-col gap-1">
                  {group.items.map((item) =>
                    renderNavLink(item, { iconsOnly: collapsed }),
                  )}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Footer compte desktop */}
        <div
          className="fixed bottom-0 left-0 z-50 hidden border-r border-t border-line bg-white transition-[width] duration-200 ease-out lg:block"
          style={{ width: sidebarW, height: footerH }}
        >
          {collapsed ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
              <Link
                href={href("/settings/#sec-security")}
                title={displayName || "Mon profil"}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFEFF8] text-[#7B5900] hover:bg-[#F6E3EF]"
              >
                <Shield className="h-4 w-4" />
              </Link>
              <button
                type="button"
                title="Déconnexion"
                className="text-[10px] font-bold text-ink/45 hover:text-ink"
                onClick={logout}
              >
                Exit
              </button>
            </div>
          ) : (
            <div className="p-3">
              <div className="rounded-xl bg-[#FFEFF8] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Shield className="h-4 w-4 shrink-0 text-[#7B5900]" />
                    <span className="truncate text-[11px] font-bold text-ink">
                      {displayName || "Super Admin"}
                    </span>
                  </div>
                  <span className="rounded bg-[#F0DDE9] px-1.5 py-0.5 text-[10px] font-bold text-ink/55">
                    v1.4 SaaS
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  <Link
                    href={href("/settings/#sec-security")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Mon profil
                  </Link>
                  <button
                    type="button"
                    className="text-xs text-ink/50 hover:text-ink"
                    onClick={logout}
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer mobile */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-dvh w-[288px] flex-col bg-white shadow-xl transition-transform lg:hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            <BrandLogo href={href("/dashboard/")} height={36} className="max-h-9" />
            <button
              type="button"
              className="rounded-lg border border-line px-2 py-1 text-xs"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {NAV.map((group) => (
              <div key={group.title} className="mb-4">
                <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink/40">
                  {group.title}
                </p>
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => renderNavLink(item))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <div
          className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0"
          style={{ marginLeft: undefined }}
        >
          <div
            className="hidden transition-[margin] duration-200 ease-out lg:block"
            style={{ marginLeft: sidebarW }}
          >
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/90 px-6 backdrop-blur-xl">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  title={collapsed ? "Agrandir la navigation" : "Réduire aux icônes"}
                  aria-label={collapsed ? "Agrandir la navigation" : "Réduire aux icônes"}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ink/55 shadow-sm ring-1 ring-line hover:bg-[#FFEFF8] hover:text-ink"
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </button>
                <div className="hidden min-w-0 xl:block">
                  <p className="truncate text-[18px] font-bold leading-tight text-ink">
                    Bonjour, {displayName || "Super Admin"} 👋
                  </p>
                  <p className="text-[13px] text-ink/50">Casablanca (GMT+1) · Accès plateforme</p>
                </div>
                <div className="relative max-w-xl flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <input
                    className="h-11 w-full rounded-xl border-0 bg-white pl-10 pr-4 text-sm shadow-[0_4px_20px_-2px_rgba(36,26,34,0.04)] outline-none ring-1 ring-line placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
                    placeholder="Rechercher un institut, un owner, un ticket…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const q = (e.target as HTMLInputElement).value.trim();
                        if (q) window.location.href = href(`/organizations/?q=${encodeURIComponent(q)}`);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={href("/organizations/new/")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-bold text-white shadow-[0_4px_20px_-2px_rgba(186,0,73,0.3)]"
                >
                  Créer un institut
                </Link>
                <Link
                  href={href("/system/health/")}
                  className="hidden h-10 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-bold text-ink shadow-sm ring-1 ring-line hover:bg-[#FFEFF8] sm:inline-flex"
                >
                  Santé Système
                </Link>
                <Link
                  href={href("/notifications/")}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ink/55 shadow-sm ring-1 ring-line hover:text-ink"
                  aria-label="Notifications"
                >
                  <Activity className="h-5 w-5" />
                  {recentCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
                      {Math.min(recentCount, 99)}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href={href("/settings/#sec-security")}
                  className="hidden max-w-[140px] truncate text-sm font-bold text-ink/70 hover:text-ink md:inline"
                >
                  {displayName || "Profil"}
                </Link>
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </div>

          {/* Mobile layout */}
          <div className="lg:hidden">
            <header className="sticky top-0 z-20 border-b border-line bg-[#FFF7F9]/90 backdrop-blur-xl">
              <div className="flex h-16 items-center justify-between gap-2 px-4">
                <button
                  type="button"
                  className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
                  onClick={() => setOpen(true)}
                >
                  Menu
                </button>
                <div className="min-w-0 text-center">
                  <p className="truncate text-sm font-bold">Rappel Beauté</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Super Admin
                  </p>
                </div>
                <Link
                  href={href("/notifications/")}
                  className="relative flex h-11 w-11 items-center justify-center text-ink/55"
                >
                  <Activity className="h-5 w-5" />
                  {recentCount > 0 ? (
                    <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {Math.min(recentCount, 99)}
                    </span>
                  ) : null}
                </Link>
              </div>
            </header>
            <main className="flex-1 p-4">{children}</main>
            <nav
              className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
              aria-label="Navigation mobile Super Admin"
            >
              <div className="flex h-16 items-center justify-around px-1">
                {MOBILE_NAV.map((item) => renderNavLink(item, { mobile: true }))}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
