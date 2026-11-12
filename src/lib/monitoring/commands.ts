import "server-only";

import { readMonitorSnapshot } from "@/lib/monitoring/events";
import { pingRedis } from "@/lib/redis/client";

const HELP = [
  "Commandes Rappel Beauty",
  "/status — état général",
  "/api — erreurs et temps de réponse",
  "/database — PostgreSQL",
  "/redis — Redis",
  "/errors — dernières erreurs",
  "/report — rapport",
  "/help — cette aide",
].join("\n");

async function databaseUp(): Promise<boolean> {
  try {
    const { pool } = await import("@/lib/db/pool");
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    return true;
  } catch {
    return false;
  }
}

function line(name: string, ok: boolean): string {
  return `${name} : ${ok ? "ok" : "indisponible"}`;
}

export async function runMonitorCommand(raw: string): Promise<string> {
  const command = raw.trim().split(/\s+/)[0]?.split("@")[0]?.toLowerCase() ?? "";

  if (command === "/help" || command === "/start") return HELP;

  if (command === "/database") {
    return line("PostgreSQL", await databaseUp());
  }

  if (command === "/redis") {
    const required = Boolean(process.env.REDIS_URL);
    if (!required) return "Redis : non configuré";
    return line("Redis", await pingRedis());
  }

  if (command === "/api" || command === "/errors") {
    const snap = await readMonitorSnapshot();
    if (command === "/errors") {
      if (snap.recent.length === 0) return "Aucune erreur API récente.";
      return [
        "Dernières erreurs API",
        ...snap.recent.map((row) => `${row.source} ${row.status} × ${row.count}`),
      ].join("\n");
    }
    return [
      "API",
      `Requêtes : ${snap.requests}`,
      `Erreurs 5xx : ${snap.errors}`,
      `Lentes (> 5 s) : ${snap.slow}`,
      `Temps moyen : ${snap.avgMs} ms`,
    ].join("\n");
  }

  if (command === "/status" || command === "/report") {
    const [database, redis, snap] = await Promise.all([
      databaseUp(),
      process.env.REDIS_URL ? pingRedis() : Promise.resolve(false),
      readMonitorSnapshot(),
    ]);
    const redisLine = process.env.REDIS_URL ? line("Redis", redis) : "Redis : non configuré";
    const head = ["RAPPEL BEAUTY", "Application : en ligne", line("PostgreSQL", database), redisLine];
    if (command === "/status") return head.join("\n");
    return [
      ...head,
      `Requêtes API : ${snap.requests}`,
      `Erreurs 5xx : ${snap.errors}`,
      `Lentes (> 5 s) : ${snap.slow}`,
      `Temps moyen : ${snap.avgMs} ms`,
      snap.recent.length === 0
        ? "Erreurs récentes : aucune"
        : snap.recent.map((row) => `${row.source} ${row.status} × ${row.count}`).join("\n"),
    ].join("\n");
  }

  return "Commande inconnue.\n" + HELP;
}
