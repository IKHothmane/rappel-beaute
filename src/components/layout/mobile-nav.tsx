"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Menu, Users, Wallet } from "lucide-react";
import { canAccessNav, useCurrentUser } from "@/components/auth/session-provider";
import { cn } from "@/lib/utils";

const items = [
  { label: "Accueil", href: "/dashboard/", icon: Home, match: "/dashboard", key: "dashboard" },
  { label: "Agenda", href: "/agenda/", icon: CalendarDays, match: "/agenda", key: "agenda" },
  { label: "Clientes", href: "/customers/", icon: Users, match: "/customers", key: "customers" },
  { label: "Caisse", href: "/cash-register/", icon: Wallet, match: "/cash-register", key: "cash-register" },
];

function normalize(pathname: string) {
  return pathname.replace(/^\/domains\/app/, "") || "/";
}

export function MobileNav() {
  const pathname = usePathname();
  const path = normalize(pathname);
  const user = useCurrentUser();
  const visible = items.filter((item) => canAccessNav(user.role, item.key));
  const moreActive = path.startsWith("/more");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:px-2 lg:hidden">
      <div className="mx-auto flex h-[68px] max-w-lg items-center justify-around">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            item.match === "/dashboard"
              ? path === "/" || path.startsWith("/dashboard")
              : path.startsWith(item.match);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition sm:px-3",
                active ? "text-primary" : "text-ink/40",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className="truncate text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/more/"
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 sm:px-3",
            moreActive ? "text-primary" : "text-ink/40",
          )}
        >
          <Menu size={20} strokeWidth={moreActive ? 2.4 : 1.8} />
          <span className="truncate text-[10px] font-medium">Plus</span>
        </Link>
      </div>
    </nav>
  );
}
