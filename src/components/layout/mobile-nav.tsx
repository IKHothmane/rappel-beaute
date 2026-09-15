"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  CircleUserRound,
  LayoutDashboard,
  Menu,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import { canAccessNav, useCurrentUser } from "@/components/auth/session-provider";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const items = [
  { label: "Accueil", href: "/dashboard/", icon: LayoutDashboard, match: "/dashboard", key: "dashboard" },
  { label: "Agenda", href: "/agenda/", icon: CalendarDays, match: "/agenda", key: "agenda" },
  { label: "Clientes", href: "/customers/", icon: Users, match: "/customers", key: "customers" },
  { label: "Caisse", href: "/cash-register/", icon: Wallet, match: "/cash-register", key: "cash-register" },
] as const;

const createActions = [
  { href: "/agenda/", label: "Nouveau rendez-vous", icon: CalendarPlus, key: "agenda" },
  { href: "/customers/", label: "Nouvelle cliente", icon: CircleUserRound, key: "customers" },
  { href: "/cash-register/", label: "Encaissement", icon: Wallet, key: "cash-register" },
  { href: "/more/", label: "Menu complet", icon: Menu, key: "dashboard" },
] as const;

function normalize(pathname: string) {
  return pathname.replace(/^\/domains\/app/, "") || "/";
}

export function MobileNav() {
  const pathname = usePathname();
  const path = normalize(pathname);
  const user = useCurrentUser();
  const [sheetOpen, setSheetOpen] = useState(false);
  const visible = items.filter((item) => canAccessNav(user.role, item.key));
  const left = visible.filter((item) => item.key === "dashboard" || item.key === "agenda");
  const right = visible.filter((item) => item.key === "customers" || item.key === "cash-register");
  const actions = createActions.filter((action) => canAccessNav(user.role, action.key));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-line/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="relative mx-auto flex h-20 max-w-lg items-center justify-between px-2">
          {left.map((item) => (
            <NavItem key={item.href} item={item} path={path} />
          ))}

          <div className="relative flex items-center justify-center -mt-6">
            <button
              type="button"
              aria-label="Nouveau rendez-vous ou encaissement"
              onClick={() => setSheetOpen(true)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_-4px_rgba(227,28,95,0.45)] transition active:scale-95"
            >
              <Plus size={28} strokeWidth={1.8} />
            </button>
          </div>

          {right.map((item) => (
            <NavItem key={item.href} item={item} path={path} />
          ))}
        </div>
      </nav>

      <Drawer
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Créer"
        side="bottom"
        className="lg:hidden"
      >
        <div className="grid gap-1 pb-[env(safe-area-inset-bottom)]">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink hover:bg-[#FBF4F6]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF1F6] text-primary">
                <action.icon size={18} />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </Drawer>
    </>
  );
}

function NavItem({
  item,
  path,
}: {
  item: (typeof items)[number];
  path: string;
}) {
  const Icon = item.icon;
  const active =
    item.match === "/dashboard"
      ? path === "/" || path.startsWith("/dashboard")
      : path.startsWith(item.match);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-14 min-w-[56px] flex-col items-center justify-center gap-1 transition",
        active ? "font-semibold text-primary" : "text-ink/40 hover:text-primary",
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
      <span className="text-[11px] font-medium">{item.label}</span>
    </Link>
  );
}
