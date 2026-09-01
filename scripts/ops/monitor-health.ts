/**
 * Sonde health + envoi alerte webhook (Slack / Discord / n8n).
 * Usage: HEALTH_BASE_URL=https://app-staging... ALERT_WEBHOOK_URL=... npx tsx scripts/ops/monitor-health.ts
 */
import { sendAlert, type AlertSeverity } from "../../src/lib/monitoring/alerts";

type Probe = { name: string; url: string; critical: boolean };

const base = (process.env.HEALTH_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const probes: Probe[] = [
  { name: "health", url: `${base}/api/health/`, critical: true },
  { name: "health_db", url: `${base}/api/health/db/`, critical: true },
  { name: "health_redis", url: `${base}/api/health/redis/`, critical: false },
];

async function probe(p: Probe): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(p.url, { signal: AbortSignal.timeout(10000) });
    const body = (await res.json()) as Record<string, unknown>;
    const ok = res.ok && body.status !== "error" && body.database !== "error";
    return { ok, detail: JSON.stringify(body) };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const failures: { name: string; critical: boolean; detail: string }[] = [];

  for (const p of probes) {
    const { ok, detail } = await probe(p);
    const label = ok ? "OK" : "FAIL";
    console.log(`[${label}] ${p.name} — ${p.url}`);
    if (!ok) failures.push({ name: p.name, critical: p.critical, detail });
  }

  if (failures.length === 0) {
    console.log("Tous les probes OK");
    process.exit(0);
  }

  const critical = failures.filter((f) => f.critical);
  const severity: AlertSeverity = critical.length > 0 ? "critical" : "warning";

  await sendAlert({
    severity,
    title: critical.length > 0 ? "Application dégradée ou indisponible" : "Sonde non critique en échec",
    source: "monitor-health",
    details: failures.map((f) => `${f.name}: ${f.detail}`).join("\n"),
    env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  });

  process.exit(critical.length > 0 ? 1 : 0);
}

main();
