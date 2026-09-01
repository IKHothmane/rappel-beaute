import { createClient, type RedisClientType } from "redis";
import { logger } from "@/lib/logger";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const c = createClient({ url });
        c.on("error", (err) => {
          logger.warn("Redis client error", { error: String(err) });
        });
        await c.connect();
        client = c as RedisClientType;
        return client;
      } catch (err) {
        logger.warn("Redis unavailable — fallback mémoire", { error: String(err) });
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const c = await getRedis();
    if (!c) return false;
    const pong = await c.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/** Fermeture propre (tests) */
export async function closeRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  connectPromise = null;
}
