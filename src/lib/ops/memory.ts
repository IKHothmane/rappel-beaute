/**
 * Diagnostic mémoire process Node (sans données perso).
 * Activer via MEMORY_DIAGNOSTICS=1 sur Railway.
 */

import v8 from "node:v8";

export type MemorySnapshot = {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  arrayBuffersMb: number;
  /** RSS hors heap V8 ≈ allocations natives (Sharp/libvips, buffers, etc.). */
  unaccountedMb: number;
  /** Plafond --max-old-space-size (Mo). Si ~1536+ sans env → limite non appliquée. */
  heapSizeLimitMb: number;
};

function mb(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

export function getMemorySnapshot(): MemorySnapshot {
  const memory = process.memoryUsage();
  const rssMb = mb(memory.rss);
  const heapUsedMb = mb(memory.heapUsed);
  const heapTotalMb = mb(memory.heapTotal);
  const externalMb = mb(memory.external);
  const arrayBuffersMb = mb(memory.arrayBuffers);
  const heapSizeLimitMb = mb(v8.getHeapStatistics().heap_size_limit);
  return {
    rssMb,
    heapUsedMb,
    heapTotalMb,
    externalMb,
    arrayBuffersMb,
    unaccountedMb: Math.max(0, rssMb - heapUsedMb - externalMb - arrayBuffersMb),
    heapSizeLimitMb,
  };
}

export function memoryDiagnosticsEnabled(): boolean {
  return process.env.MEMORY_DIAGNOSTICS === "1" || process.env.MEMORY_DIAGNOSTICS === "true";
}

/** Journalise un snapshot mémoire. `label` = étape (ex. "health", "after-sharp"). */
export function logMemoryUsage(label: string): MemorySnapshot {
  const snapshot = getMemorySnapshot();
  console.info("[MEMORY]", {
    label,
    rss: `${snapshot.rssMb} MB`,
    heapUsed: `${snapshot.heapUsedMb} MB`,
    heapTotal: `${snapshot.heapTotalMb} MB`,
    external: `${snapshot.externalMb} MB`,
    arrayBuffers: `${snapshot.arrayBuffersMb} MB`,
    unaccounted: `${snapshot.unaccountedMb} MB`,
    heapLimit: `${snapshot.heapSizeLimitMb} MB`,
  });
  return snapshot;
}

let intervalStarted = false;

/** Log périodique en prod quand MEMORY_DIAGNOSTICS=1 (défaut 5 min). */
export function startMemoryDiagnosticsInterval(): void {
  if (intervalStarted || !memoryDiagnosticsEnabled()) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  intervalStarted = true;

  const everyMs = Number(process.env.MEMORY_DIAGNOSTICS_INTERVAL_MS ?? 5 * 60_000);
  logMemoryUsage("boot");
  const timer = setInterval(() => logMemoryUsage("interval"), Number.isFinite(everyMs) ? everyMs : 300_000);
  timer.unref?.();
}
