"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/www/BrandLogo";
import { adminHref } from "@/lib/admin/href";
import { fetchAdminAudit, fetchAdminSession, platformLogout } from "@/modules/admin/client";
import { fetchSupportTickets } from "@/modules/admin/support-tickets";

type NavItem = { href: string; label: string };
type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    items: [{ href: "/dashboard/", label: "Tableau de bord" }],
  },
  {
    title: "Gestion",
    items: [
      { href: "/organizations/", label: "Instituts" },
      { href: "/users/", label: "Utilisateurs" },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/subscriptions/", label: "Abonnements" },
      { href: "/plans/", label: "Plans" },
      { href: "/billing/", label: "Facturation" },
    ],
  },
  {
    title: "Pilotage",
    items: [
      { href: "/analytics/", label: "Analytics" },
      { href: "/audit/", label: "Audit" },
    ],
  },
  {
    title: "Assistance",
    items: [{ href: "/support/tickets/", label: "Support" }],
  },
  {
    items: [
      { href: "/notifications/", label: "Activité" },
      { href: "/settings/", label: "Paramètres" },
    ],
  },
];

const ACCOUNT_FOOTER_H = 132;

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
    return path.startsWith("/organizations") && !path.startsWith("/organizations/new");
  }
  if (href === "/support/tickets/") {
    return path.startsWith("/support");
  }
  return path === href || path.startsWith(href.replace(/\/$/, ""));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = normalizePath(pathname);
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [recentCount, setRecentCount] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const href = adminHref;

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

  function logout() {
    void platformLogout().then(() => {
      window.location.href = href("/login/");
    });
  }

  if (path.startsWith("/login")) {
    return <>{children}</>;
  }

  const accountPanel = (
    <>
      <p className="truncate text-sm font-semibold text-ink">{displayName || "…"}</p>
      <p className="text-[11px] text-ink/45">Super administrateur</p>
      <div className="mt-2 flex flex-col gap-1">
        <Link
          href={href("/settings/#profile")}
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => setOpen(false)}
        >
          Mon profil
        </Link>
        <button
          type="button"
          className="text-left text-xs text-ink/50 hover:text-ink"
          onClick={logout}
        >
          Déconnexion
        </button>
        <Link href="/?__host=www" className="text-xs text-ink/50 hover:text-ink">
          ← Retour vitrine
        </Link>
      </div>
    </>
  );

  return (
    <div className="admin-console min-h-screen bg-[#FBF4F6] text-ink">
      <div className="flex min-h-screen">
        {/* Menu latéral (logo + nav uniquement) */}
        <aside
          className={`fixed left-0 top-0 z-40 flex w-[260px] flex-col border-r border-line bg-white transition-transform lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ height: `calc(100dvh - ${ACCOUNT_FOOTER_H}px)` }}
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo href={href("/dashboard/")} height={40} className="max-h-10" />
              <p className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-primary">
                SUPER ADMIN
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-line px-2 py-1 text-xs lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          </div>

          <nav
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
            aria-label="Navigation administration"
          >
            {NAV.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-3" : ""}>
                {group.title ? (
                  <p className="mb-1 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
                    {group.title}
                  </p>
                ) : null}
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={href(item.href)}
                        onClick={() => setOpen(false)}
                        className={`rounded-lg px-3 py-1.5 text-sm transition ${
                          active
                            ? "bg-primary-light font-semibold text-primary-dark"
                            : "text-ink/65 hover:bg-[#FBF4F6] hover:text-ink"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Profil collé en bas de l'écran (position: fixed viewport) */}
        <div
          className={`fixed bottom-0 left-0 z-50 w-[260px] border-r border-t border-line bg-white p-3 transition-transform lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ height: ACCOUNT_FOOTER_H }}
        >
          {accountPanel}
        </div>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col lg:ml-[260px]">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm lg:hidden"
                aria-expanded={open}
                onClick={() => setOpen(true)}
              >
                Menu
              </button>
              <BrandLogo
                href={href("/dashboard/")}
                height={36}
                className="hidden max-h-9 sm:inline-flex"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={href("/support/tickets/")}
                className="relative rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm"
                aria-label="Support"
              >
                Support
                {openTickets > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] text-white">
                    {Math.min(openTickets, 99)}
                  </span>
                ) : null}
              </Link>
              <Link
                href={href("/notifications/")}
                className="relative rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm"
                aria-label="Activité récente"
              >
                Activité
                {recentCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] text-white">
                    {Math.min(recentCount, 99)}
                  </span>
                ) : null}
              </Link>
              <Link
                href={href("/settings/#profile")}
                className="hidden truncate text-sm font-medium text-ink/70 hover:text-ink sm:inline max-w-[140px]"
              >
                {displayName || "Profil"}
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
