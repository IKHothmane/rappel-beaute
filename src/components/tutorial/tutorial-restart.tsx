"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Status = "idle" | "queued" | "running" | "failed";

type Restart = {
  status: Status;
  request: () => void;
  claim: () => boolean;
  finish: (ok: boolean) => void;
};

const RestartContext = createContext<Restart | null>(null);

export function TutorialRestartProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("idle");
  const current = useRef<Status>("idle");

  const transition = useCallback((next: Status) => {
    current.current = next;
    setStatus(next);
  }, []);

  const request = useCallback(() => {
    if (current.current !== "queued" && current.current !== "running") transition("queued");
  }, [transition]);

  const claim = useCallback(() => {
    if (current.current !== "queued") return false;
    transition("running");
    return true;
  }, [transition]);

  const finish = useCallback((ok: boolean) => transition(ok ? "idle" : "failed"), [transition]);
  const value = useMemo(() => ({ status, request, claim, finish }), [status, request, claim, finish]);

  return (
    <RestartContext.Provider value={value}>
      {children}
      {status === "queued" || status === "running" ? (
        <div className="sr-only" role="status">Relance du tutoriel en cours…</div>
      ) : null}
    </RestartContext.Provider>
  );
}

export function useTutorialRestart() {
  return useContext(RestartContext);
}
