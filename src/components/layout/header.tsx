"use client";

import { LogOut, Menu, Search } from "lucide-react";
import { OrgLogo } from "@/components/app/org-logo";
import { useCurrentUser, useSession } from "@/components/auth/session-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";

type HeaderProps = {
  onMenuOpen: () => void;
};

export function Header({ onMenuOpen }: HeaderProps) {
  const user = useCurrentUser();
  const { logout } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur-xl">
      <div className="flex h-[64px] items-center justify-between gap-2 px-4 sm:h-[72px] sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="shrink-0 rounded-xl p-2 text-ink/70 hover:bg-[#FBF4F6] lg:hidden"
            onClick={onMenuOpen}
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
            <OrgLogo url={user.orgLogoUrl} name={user.orgName} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.orgName}</p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-[#FBF4F6]/80 px-3 py-2 md:flex md:max-w-[280px] md:flex-none">
            <Search size={17} className="shrink-0 text-ink/35" />
            <input
              placeholder="Rechercher…"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink/35"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          <NotificationBell />

          <div className="hidden h-7 w-px bg-line sm:block" />

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">{user.firstName}</div>
              <div className="text-xs text-ink/45">{user.orgName}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold font-semibold text-white">
              {user.firstName.charAt(0)}
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl p-2 text-ink/55 transition hover:bg-[#FBF4F6] hover:text-primary"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
