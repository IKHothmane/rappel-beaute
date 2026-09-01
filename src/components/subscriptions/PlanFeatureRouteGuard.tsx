"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  NAV_PLAN_FEATURE,
  pathnameToNavKey,
} from "@/lib/subscriptions/nav-features";
import { FeatureLockedPanel } from "@/components/subscriptions/FeatureLockedPanel";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";

const BYPASS_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/book",
  "/settings/subscription",
  "/profile",
  "/security",
];

export function PlanFeatureRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, isNavEnabled } = usePlanFeatures();

  const path = pathname.replace(/^\/domains\/app/, "") || "/";
  if (BYPASS_PREFIXES.some((p) => path.startsWith(p))) {
    return <>{children}</>;
  }

  const navKey = pathnameToNavKey(pathname);
  const required = navKey ? NAV_PLAN_FEATURE[navKey] : null;

  if (loading || !required || isNavEnabled(navKey!)) {
    return <>{children}</>;
  }

  return <FeatureLockedPanel feature={required} navKey={navKey ?? undefined} />;
}
