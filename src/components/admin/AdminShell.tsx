"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PLATFORM_USER, platformStats } from "@/lib/admin-mock";

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
    items: [
      { href: "/support/", label: "Tickets" },
      { href: "/support/mode/", label: "Mode assistance" },
    ],
  },
  {
    items: [
      { href: "/notifications/", label: "Notifications" },
      { href: "/settings/", label: "Paramètres" },
    ],
  },
];

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
  if (href === "/support/") {
    return path.startsWith("/support") && !path.startsWith("/support/mode");
  }
  return path === href || path.startsWith(href.replace(/\/$/, ""));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = normalizePath(pathname);
  const [open, setOpen] = useState(false);
  const unread = platformStats().unreadNotifs;

  if (path.startsWith("/login")) {
    return <>{children}</>;
  }

  return (
    <div className="admin-console min-h-screen bg-[#FBF4F6] text-ink">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-line bg-white transition-transform lg:static lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary font-display text-sm font-semibold text-white">
                R
              </span>
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold">Rappel Beauté</p>
                <p className="font-mono text-[10px] tracking-[0.16em] text-primary">
                  SUPER ADMIN
                </p>
              </div>
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

          <nav className="flex-1 overflow-y-auto p-3" aria-label="Navigation administration">
            {NAV.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-4" : ""}>
                {group.title ? (
                  <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
                    {group.title}
                  </p>
                ) : null}
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`rounded-lg px-3 py-2 text-sm transition ${
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

          <div className="border-t border-line p-4">
            <p className="text-xs font-medium">{PLATFORM_USER.name}</p>
            <p className="text-[11px] text-ink/45">Super administrateur</p>
            <div className="mt-3 flex flex-col gap-1.5">
              <Link href="/profile/" className="text-xs font-semibold text-primary">
                Mon profil
              </Link>
              <Link href="/login/" className="text-xs text-ink/50 hover:text-ink">
                Déconnexion
              </Link>
              <Link href="/?__host=www" className="text-xs text-ink/50 hover:text-ink">
                ← Retour vitrine
              </Link>
            </div>
          </div>
        </aside>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm lg:hidden"
                aria-expanded={open}
                onClick={() => setOpen(true)}
              >
                Menu
              </button>
              <p className="hidden font-display text-sm font-semibold sm:block">
                Rappel Beauté
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/notifications/"
                className="relative rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm"
                aria-label="Notifications"
              >
                Notif.
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
              <Link href="/profile/" className="hidden text-sm text-ink/60 hover:text-ink sm:inline">
                {PLATFORM_USER.firstName}
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
