"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlanFeatureKey, PlanFeatures } from "@/types/subscription";
import { isPlanFeatureEnabled } from "@/lib/subscriptions/nav-features";
import { useSession } from "@/components/auth/session-provider";

type PlanFeaturesContextValue = {
  features: PlanFeatures | null;
  planName: string | null;
  planCode: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isEnabled: (key: PlanFeatureKey | string) => boolean;
  isNavEnabled: (navKey: string) => boolean;
};

const PlanFeaturesContext = createContext<PlanFeaturesContextValue | null>(null);

export function PlanFeaturesProvider({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading } = useSession();
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.organizationId) {
      setFeatures(null);
      setPlanName(null);
      setPlanCode(null);
      setLoading(false);
      return;
    }
    try {
      const [subRes, featRes] = await Promise.all([
        fetch("/api/subscription/", { credentials: "include" }),
        fetch("/api/subscription/features/", { credentials: "include" }),
      ]);
      if (subRes.ok) {
        const subData = (await subRes.json()) as {
          subscription?: { planName: string; planCode: string; features: PlanFeatures };
        };
        if (subData.subscription) {
          setPlanName(subData.subscription.planName);
          setPlanCode(subData.subscription.planCode);
          setFeatures(subData.subscription.features);
          setLoading(false);
          return;
        }
      }
      if (featRes.ok) {
        const featData = (await featRes.json()) as {
          features?: { key: PlanFeatureKey; enabled: boolean }[];
        };
        const map = {} as PlanFeatures;
        for (const f of featData.features ?? []) {
          map[f.key] = f.enabled;
        }
        setFeatures(map);
      }
    } catch {
      setFeatures(null);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    if (sessionLoading) return;
    setLoading(true);
    refresh();
  }, [sessionLoading, refresh]);

  const value = useMemo<PlanFeaturesContextValue>(
    () => ({
      features,
      planName,
      planCode,
      loading: sessionLoading || loading,
      refresh,
      isEnabled: (key) => {
        if (!features) return true;
        return features[key as PlanFeatureKey] === true;
      },
      isNavEnabled: (navKey) => isPlanFeatureEnabled(features ?? undefined, navKey),
    }),
    [features, planName, planCode, sessionLoading, loading, refresh],
  );

  return (
    <PlanFeaturesContext.Provider value={value}>{children}</PlanFeaturesContext.Provider>
  );
}

export function usePlanFeatures() {
  const ctx = useContext(PlanFeaturesContext);
  if (!ctx) throw new Error("usePlanFeatures must be used within PlanFeaturesProvider");
  return ctx;
}
