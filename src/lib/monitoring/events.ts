import "server-only";

import { getRedis } from "@/lib/redis/client";
import { sendTelegramAlert } from "@/lib/monitoring/telegram";

const SLOW_MS = 5_000;
const WINDOW_SEC = 24 * 60 * 60;
const RECENT_LIMIT = 50;

type MonitorEvent = {
  source: string;
  status: number;
  durationMs: number;
  exception?: boolean;
};

type RecentError = {
  source: string;
  status: number;
  at: string;
};

type MemoryState = {
  requests: number;
  errors: number;
  slow: number;
  durationMs: number;
  recent: RecentError[];
};

const memory: MemoryState = {
  requests: 0,
  errors: 0,
  slow: 0,
  durationMs: 0,
  recent: [],
};

export type MonitorSnapshot = {
  requests: number;
  errors: number;
  slow: number;
  avgMs: number;
  recent: { source: string; status: number; count: number }[];
};

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function sanitizeRoute(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";
  const cleaned = path
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (segment.includes("@")) return ":id";
      if (UUID_RE.test(segment)) {
        UUID_RE.lastIndex = 0;
        return ":id";
      }
      UUID_RE.lastIndex = 0;
      if (/^\d+$/.test(segment)) return ":id";
      if (segment.length > 24) return ":id";
      return segment;
    })
    .join("/");
  return cleaned.slice(0, 160);
}

export function routeLabel(input: unknown): string {
  if (!input || typeof input !== "object") return "api";
  const rec = input as { method?: string; nextUrl?: { pathname?: string }; url?: string };
  let path = rec.nextUrl?.pathname ?? "";
  if (!path && rec.url) {
    try {
      path = new URL(rec.url).pathname;
    } catch {
      path = "";
    }
  }
  if (!path.startsWith("/api/")) return "api";
  const method = rec.method ? rec.method.toUpperCase().slice(0, 8) : "";
  return `${method} ${sanitizeRoute(path)}`.trim();
}

function quietRoute(source: string): boolean {
  return source.includes("/api/health") || source.includes("/api/monitoring/telegram");
}

function remember(state: MemoryState, event: MonitorEvent) {
  state.requests += 1;
  state.durationMs += Math.max(0, event.durationMs);
  if (event.status >= 500 || event.exception) {
    state.errors += 1;
    state.recent.unshift({
      source: event.source,
      status: event.exception ? 500 : event.status,
      at: new Date().toISOString(),
    });
    if (state.recent.length > RECENT_LIMIT) state.recent.length = RECENT_LIMIT;
  }
  if (event.durationMs >= SLOW_MS) state.slow += 1;
}

async function rememberRedis(event: MonitorEvent): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  const status = event.exception ? 500 : event.status;
  await redis.incr("mon:req");
  await redis.incrBy("mon:dur", Math.max(0, Math.round(event.durationMs)));
  await redis.expire("mon:req", WINDOW_SEC);
  await redis.expire("mon:dur", WINDOW_SEC);
  if (status >= 500 || event.exception) {
    await redis.incr("mon:err");
    await redis.expire("mon:err", WINDOW_SEC);
    await redis.lPush(
      "mon:recent",
      JSON.stringify({ source: event.source, status, at: new Date().toISOString() }),
    );
    await redis.lTrim("mon:recent", 0, RECENT_LIMIT - 1);
    await redis.expire("mon:recent", WINDOW_SEC);
  }
  if (event.durationMs >= SLOW_MS) {
    await redis.incr("mon:slow");
    await redis.expire("mon:slow", WINDOW_SEC);
  }
  return true;
}

export async function observeApi(event: MonitorEvent): Promise<void> {
  if (process.env.MONITORING_ENABLED !== "true") return;
  try {
    if (!quietRoute(event.source)) {
      try {
        const stored = await rememberRedis(event);
        if (!stored) remember(memory, event);
      } catch {
        remember(memory, event);
      }
    }

    if (quietRoute(event.source)) return;
    if (event.exception || event.status >= 500) {
      await sendTelegramAlert({
        level: "critical",
        title: event.exception ? "Exception API" : `HTTP ${event.status}`,
        source: event.source,
        status: event.exception ? 500 : event.status,
        durationMs: event.durationMs,
      });
      return;
    }
    if (event.durationMs >= SLOW_MS) {
      await sendTelegramAlert({
        level: "warning",
        title: "API lente",
        source: event.source,
        status: event.status,
        durationMs: event.durationMs,
      });
    }
  } catch {
    // Le monitoring ne doit jamais interrompre la route.
  }
}

function group(rows: RecentError[]): MonitorSnapshot["recent"] {
  const counts = new Map<string, { source: string; status: number; count: number }>();
  for (const row of rows) {
    const key = `${row.status}:${row.source}`;
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { source: row.source, status: row.status, count: 1 });
  }
  return [...counts.values()].slice(0, 8);
}

function snapshotFrom(requests: number, errors: number, slow: number, durationMs: number, recent: RecentError[]): MonitorSnapshot {
  return {
    requests,
    errors,
    slow,
    avgMs: requests > 0 ? Math.round(durationMs / requests) : 0,
    recent: group(recent),
  };
}

export async function readMonitorSnapshot(): Promise<MonitorSnapshot> {
  try {
    const redis = await getRedis();
    if (redis) {
      const [requests, errors, slow, duration, recent] = await Promise.all([
        redis.get("mon:req"),
        redis.get("mon:err"),
        redis.get("mon:slow"),
        redis.get("mon:dur"),
        redis.lRange("mon:recent", 0, RECENT_LIMIT - 1),
      ]);
      const rows: RecentError[] = [];
      for (const item of recent) {
        try {
          const parsed = JSON.parse(item) as RecentError;
          if (parsed && typeof parsed.source === "string" && typeof parsed.status === "number") {
            rows.push({ source: sanitizeRoute(parsed.source).slice(0, 160), status: parsed.status, at: "" });
          }
        } catch {
          // Entrée illisible : ignorée.
        }
      }
      return snapshotFrom(Number(requests ?? 0), Number(errors ?? 0), Number(slow ?? 0), Number(duration ?? 0), rows);
    }
  } catch {
    // Repli mémoire.
  }
  return snapshotFrom(memory.requests, memory.errors, memory.slow, memory.durationMs, memory.recent);
}

export function resetMonitorMemory() {
  memory.requests = 0;
  memory.errors = 0;
  memory.slow = 0;
  memory.durationMs = 0;
  memory.recent = [];
}
