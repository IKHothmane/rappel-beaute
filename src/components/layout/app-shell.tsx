"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { PlanFeatureRouteGuard } from "@/components/subscriptions/PlanFeatureRouteGuard";

type AppShellProps = {
  children: ReactNode;
};

function normalize(pathname: string) {
  const s = pathname.replace(/^\/domains\/app/, "");
  return s === "" ? "/" : s;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const path = normalize(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bare =
    path.startsWith("/login") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/book");

  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[260px]">
        <Header onMenuOpen={() => setSidebarOpen(true)} />

        <main className="min-h-[calc(100vh-64px)] px-4 pb-24 pt-5 sm:min-h-[calc(100vh-72px)] sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-[1600px]">
            <PlanFeatureRouteGuard>{children}</PlanFeatureRouteGuard>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
