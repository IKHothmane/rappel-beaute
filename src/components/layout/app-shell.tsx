"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useSession } from "@/components/auth/session-provider";
import { isAppSession } from "@/lib/auth/types";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import OwnerSidebar from "./OwnerSidebar";
import { PlanFeatureRouteGuard } from "@/components/subscriptions/PlanFeatureRouteGuard";
import { StaffColorProvider } from "@/components/agenda/staff-color-provider";
import { NotificationPopupHost } from "@/components/notifications/notification-popup-host";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

function normalize(pathname: string) {
  const s = pathname.replace(/^\/domains\/app/, "");
  return s === "" ? "/" : s;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const path = normalize(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useSession();

  const bare =
    path.startsWith("/login") ||
    path.startsWith("/connexion") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/changer-mot-de-passe") ||
    path.startsWith("/activate") ||
    path.startsWith("/book");

  const fullBleed = path.startsWith("/salon-3d");

  useEffect(() => {
    if (loading || bare) return;
    if (user && isAppSession(user) && user.mustChangePassword) {
      router.replace("/changer-mot-de-passe/");
    }
  }, [loading, bare, user, router]);

  if (bare) return <>{children}</>;

  if (loading || !user || !isAppSession(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7FA] text-sm text-ink/60">
        Chargement…
      </div>
    );
  }

  if (user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7FA] text-sm text-ink/60">
        Redirection…
      </div>
    );
  }

  const isOwner = user.role === "OWNER";

  return (
    <div className="min-h-dvh bg-[#F8F7FA] text-ink">
      {isOwner ? (
        <OwnerSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
      ) : (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div
        className={cn(
          "min-h-dvh min-w-0 overflow-x-hidden transition-[margin] duration-300",
          isOwner
            ? collapsed
              ? "lg:ml-[76px]"
              : "lg:ml-[280px]"
            : "lg:pl-[260px]",
        )}
        style={
          {
            ["--app-sidebar-offset"]: isOwner ? (collapsed ? "76px" : "280px") : "260px",
          } as CSSProperties
        }
      >
        <Header onMenuOpen={() => setSidebarOpen(true)} />

        <main
          className={cn(
            "min-h-[calc(100vh-64px)] min-w-0 sm:min-h-[calc(100vh-72px)]",
            fullBleed
              ? "px-0 pb-20 pt-0 lg:pb-0"
              : "px-3 pb-28 pt-4 sm:px-4 lg:px-5 lg:pb-6 xl:px-6",
          )}
        >
          <div className="w-full min-w-0 max-w-none">
            <StaffColorProvider>
              <PlanFeatureRouteGuard>{children}</PlanFeatureRouteGuard>
            </StaffColorProvider>
          </div>
        </main>
      </div>

      <MobileNav />
      <NotificationPopupHost />
    </div>
  );
}
