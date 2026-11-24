"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppSessionUser, PublicSession } from "@/lib/auth/types";
import { isAppSession } from "@/lib/auth/types";
import type { AppRole } from "@/lib/rbac";
import { canAccessNav, isAppRole, ROLE_LABEL } from "@/lib/rbac";
import { logoutDestination } from "@/lib/auth/logout-destination";
import { clearTutorialDeferral } from "@/components/tutorial/events";

type SessionContextValue = {
  user: PublicSession | null;
  loading: boolean;
  /** Vrai tant que l'e-mail du compte est absent ou non vérifié (champ additif de /api/auth/session/). */
  emailSetupRequired: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailSetupRequired, setEmailSetupRequired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session/", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        setEmailSetupRequired(false);
        return;
      }
      const data = (await res.json()) as { user: PublicSession & { emailSetupRequired?: boolean } };
      setUser(data.user);
      setEmailSetupRequired(data.user?.emailSetupRequired === true);
    } catch {
      setUser(null);
      setEmailSetupRequired(false);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout/", { method: "POST", credentials: "include" });
    // Le report « Plus tard » du tutoriel s'arrête avec la session, quel que soit le bouton de déconnexion utilisé.
    if (userIdRef.current) clearTutorialDeferral(userIdRef.current);
    setUser(null);
    // `signed_out=1` évite un 308 en cache sur /connexion/ (boucle login/logout).
    window.location.replace(logoutDestination(window.location.origin));
  }, []);

  const value = useMemo(
    () => ({ user, loading, emailSetupRequired, refresh, logout }),
    [user, loading, emailSetupRequired, refresh, logout],
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
      orgLogoUrl: null,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: false,
      sessionVersion: 0,
    };
  }
  if (!user || !isAppSession(user) || !isAppRole(user.role)) {
    throw new Error("No authenticated app user");
  }
  return user;
}

export { canAccessNav, ROLE_LABEL };
