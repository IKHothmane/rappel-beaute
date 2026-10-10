import { logger } from "@/lib/logger";

const globalState = globalThis as { customerPushTimer?: ReturnType<typeof setInterval> };

export function startCustomerPushScheduler() {
  if (globalState.customerPushTimer) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const tick = () => {
    void import("@/lib/push/customer-push")
      .then((mod) => mod.dispatchAllDueCustomerPushes())
      .catch(() => {
        logger.warn("customer push tick failed");
      });
  };
  const starter = setTimeout(tick, 15_000);
  starter.unref?.();
  globalState.customerPushTimer = setInterval(tick, 60_000);
  globalState.customerPushTimer.unref?.();
}
