import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/logger";
import { apnsDeviceResult } from "@/lib/loyalty/apple-passkit";
import { pushTokensForPass, removeAppleDevice } from "@/lib/loyalty/apple-wallet-store";
import { signalApplePassUpdate } from "@/lib/loyalty/apple-wallet-updates";
import { appleWalletConfigured } from "@/lib/loyalty/wallet-config";

const globalForApple = globalThis as unknown as { appleWalletUpdates?: boolean };

type ChangedPass = { id: string; changedAt: Date };

export async function publishApplePassUpdates() {
  if (!appleWalletConfigured()) return { updated: 0 };
  const changed = await pool.query<ChangedPass>(
    `SELECT p.id,
            GREATEST(
              p."updatedAt",
              COALESCE((SELECT MAX(e."validatedAt") FROM "LoyaltyEvent" e WHERE e."loyaltyCardId" = p."loyaltyCardId"), p."updatedAt"),
              COALESCE((SELECT MAX(r."earnedAt") FROM "LoyaltyVisitReward" r WHERE r."loyaltyCardId" = p."loyaltyCardId"), p."updatedAt"),
              COALESCE((SELECT MAX(r."usedAt") FROM "LoyaltyVisitReward" r WHERE r."loyaltyCardId" = p."loyaltyCardId"), p."updatedAt")
            ) AS "changedAt"
     FROM "AppleWalletPass" p
     WHERE EXISTS (SELECT 1 FROM "AppleWalletRegistration" r WHERE r."passId" = p.id)
     LIMIT 50`,
  );
  let updated = 0;
  for (const pass of changed.rows) {
    const marked = await pool.query(
      `UPDATE "AppleWalletPass" SET "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1 AND "updatedAt" < $2
       RETURNING id`,
      [pass.id, pass.changedAt],
    );
    if (marked.rows.length === 0) continue;
    updated += 1;
    const devices = await pushTokensForPass(pass.id);
    for (const device of devices) {
      try {
        const status = await signalApplePassUpdate(device.pushToken);
        if (apnsDeviceResult(status) === "remove") await removeAppleDevice(device.deviceId);
      } catch (error) {
        logger.warn("apple wallet update signal failed", {
          error: error instanceof Error ? error.message : "push",
        });
      }
    }
  }
  return { updated };
}

export function startAppleWalletUpdates() {
  if (globalForApple.appleWalletUpdates) return;
  globalForApple.appleWalletUpdates = true;
  const tick = () => {
    void publishApplePassUpdates().catch((error) => {
      logger.warn("apple wallet update scan failed", {
        error: error instanceof Error ? error.message : "scan",
      });
    });
  };
  const first = setTimeout(tick, 25_000);
  const timer = setInterval(tick, 60_000);
  first.unref?.();
  timer.unref?.();
}
