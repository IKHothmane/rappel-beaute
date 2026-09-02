"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AppSessionUser, PublicSession } from "@/lib/auth/types";
import { isAppSession } from "@/lib/auth/types";
import type { AppRole } from "@/lib/rbac";
import { canAccessNav, isAppRole, ROLE_LABEL } from "@/lib/rbac";

type SessionContextValue = {
  user: PublicSession | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session/", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: PublicSession };
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout/", { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = "/login/";
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function useCurrentUser(): AppSessionUser {
  const { user, loading } = useSession();
  if (loading) {
    return {
      id: "",
      email: "",
      firstName: "…",
      lastName: "",
      role: "STAFF" as AppRole,
      organizationId: "",
      orgName: "",
      orgSlug: "",
      scope: "app",
      accountType: "ORGANIZATION",
    };
  }
  if (!user || !isAppSession(user) || !isAppRole(user.role)) {
    throw new Error("No authenticated app user");
  }
  return user;
}

export { canAccessNav, ROLE_LABEL };
