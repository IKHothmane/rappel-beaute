/**
 * Sonde health + envoi alerte webhook (Slack / Discord / n8n).
 * Usage: HEALTH_BASE_URL=https://app-staging... ALERT_WEBHOOK_URL=... npx tsx scripts/ops/monitor-health.ts
 *
 * Sans secret, la surveillance ne lit que les champs publics de /api/health/ (status, database, redis).
 * HEALTH_TOKEN (optionnel) ajoute la sonde détaillée /api/health/db/, réservée aux appels authentifiés.
 */
import { sendAlert, type AlertSeverity } from "../../src/lib/monitoring/alerts";

type Probe = { name: string; url: string; critical: boolean; authorized?: boolean };

// Une variable GitHub non définie est injectée comme chaîne vide, pas comme undefined.
const configured = process.env.HEALTH_BASE_URL?.trim() || "http://127.0.0.1:3000";

if (!/^https?:\/\//.test(configured) || !URL.canParse(configured)) {
  console.error(
    `[monitoring] HEALTH_BASE_URL invalide (« ${configured} ») — attendu une URL absolue en http(s), ex. https://app-staging.rappelbeaute.ma`,
  );
  process.exit(2);
}

const base = configured.replace(/\/$/, "");
const healthToken = process.env.HEALTH_TOKEN?.trim() || "";

const probes: Probe[] = [
  // Couvre aussi la base : le champ public `database` vient d'un SELECT 1 côté serveur.
  { name: "health", url: `${base}/api/health/`, critical: true },
  ...(healthToken
    ? [{ name: "health_db", url: `${base}/api/health/db/`, critical: true, authorized: true }]
    : []),
  { name: "health_redis", url: `${base}/api/health/redis/`, critical: false },
];

async function probe(p: Probe): Promise<{ ok: boolean; detail: string }> {
  try {
    const headers: Record<string, string> = p.authorized ? { Authorization: `Bearer ${healthToken}` } : {};
    const res = await fetch(p.url, { headers, signal: AbortSignal.timeout(10000) });
    const body = (await res.json()) as Record<string, unknown>;
    const ok = res.ok && body.status !== "error" && body.database !== "error";
    return { ok, detail: JSON.stringify(body) };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const failures: { name: string; critical: boolean; detail: string }[] = [];
  if (!healthToken) console.log("[monitoring] HEALTH_TOKEN absent : sonde détaillée /api/health/db/ ignorée.");

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
