"use client";

import { SessionProvider } from "@/components/auth/session-provider";
import { PlanFeaturesProvider } from "@/components/subscriptions/plan-features-provider";
import { ToastProvider } from "@/components/ui/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PlanFeaturesProvider>
        <ToastProvider>{children}</ToastProvider>
      </PlanFeaturesProvider>
    </SessionProvider>
  );
}
