import "server-only";

import { getRedis } from "@/lib/redis/client";

type AlertLevel = "warning" | "critical" | "recovery";

type TelegramAlert = {
  level: AlertLevel;
  title: string;
  source: string;
  status?: number;
  durationMs?: number;
  incidentId?: string;
};

const lastSent = new Map<string, number>();
const alertTimes: number[] = [];
const COOLDOWN_MS = 5 * 60 * 1000;
const ALERTS_PER_MINUTE = 30;

function redact(value: string): string {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[filtre]").slice(0, 180);
}

function cooldownKey(alert: TelegramAlert): string {
  return [alert.level, alert.source, alert.status ?? "", alert.title].join(":");
}

async function allowAlertBudget(): Promise<boolean> {
  const now = Date.now();
  try {
    const redis = await getRedis();
    if (redis) {
      const count = await redis.incr("mon:alert:min");
      if (count === 1) await redis.expire("mon:alert:min", 60);
      return count <= ALERTS_PER_MINUTE;
    }
  } catch {
    // Repli mémoire.
  }
  while (alertTimes.length > 0 && now - alertTimes[0] > 60_000) alertTimes.shift();
  if (alertTimes.length >= ALERTS_PER_MINUTE) return false;
  alertTimes.push(now);
  return true;
}

async function claimCooldown(key: string): Promise<boolean> {
  const redisKey = `mon:cool:${key}`.slice(0, 240);
  try {
    const redis = await getRedis();
    if (redis) {
      const created = await redis.set(redisKey, "1", { NX: true, EX: 300 });
      return created === "OK";
    }
  } catch {
    // Repli mémoire.
  }
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < COOLDOWN_MS) return false;
  lastSent.set(key, now);
  if (lastSent.size > 500) lastSent.clear();
  return true;
}

async function releaseCooldown(key: string): Promise<void> {
  lastSent.delete(key);
  try {
    const redis = await getRedis();
    if (redis) await redis.del(`mon:cool:${key}`.slice(0, 240));
  } catch {
    // Le prochain envoi retentera au plus tard à l'expiration Redis.
  }
}

async function postTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 3500),
    }),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  return response.ok;
}

export async function sendTelegramAlert(alert: TelegramAlert): Promise<boolean> {
  if (process.env.MONITORING_ENABLED !== "true") return false;
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return false;

  const key = cooldownKey(alert);
  if (!(await allowAlertBudget())) return false;
  if (!(await claimCooldown(key))) return false;

  const message = [
    "RAPPEL BEAUTY MONITOR",
    `Niveau : ${alert.level}`,
    `Titre : ${redact(alert.title)}`,
    `Source : ${redact(alert.source)}`,
    `Statut : ${alert.status ?? "N/A"}`,
    `Durée : ${alert.durationMs ?? "N/A"} ms`,
    `Incident : ${alert.incidentId ?? "N/A"}`,
    `Date : ${new Date().toISOString()}`,
  ].join("\n");

  try {
    const ok = await postTelegram(message);
    if (!ok) {
      console.error("Telegram alert delivery failed");
      await releaseCooldown(key);
      return false;
    }
    return true;
  } catch {
    console.error("Telegram alert transport unavailable");
    await releaseCooldown(key);
    return false;
  }
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return false;
  try {
    return await postTelegram(redact(text));
  } catch {
    console.error("Telegram alert transport unavailable");
    return false;
  }
}

const commandHits = new Map<string, number[]>();

export async function allowTelegramCommand(chatId: string): Promise<boolean> {
  const now = Date.now();
  try {
    const redis = await getRedis();
    if (redis) {
      const key = `mon:cmd:${chatId}`.slice(0, 80);
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      return count <= 15;
    }
  } catch {
    // Repli mémoire.
  }
  const hits = (commandHits.get(chatId) ?? []).filter((at) => now - at < 60_000);
  if (hits.length >= 15) {
    commandHits.set(chatId, hits);
    return false;
  }
  hits.push(now);
  commandHits.set(chatId, hits);
  return true;
}

export function resetTelegramState() {
  lastSent.clear();
  alertTimes.length = 0;
  commandHits.clear();
}
