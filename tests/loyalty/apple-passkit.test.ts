import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { pool } from "@/lib/db/pool";
import {
  apnsDeviceResult,
  appleAuthorizationToken,
  appleChangeMessage,
  appleDeviceId,
  applePushToken,
  appleSerial,
  appleWebServiceUrl,
  APPLE_PASS_TYPE_ID,
  passChangedSince,
  passTypeMatches,
} from "@/lib/loyalty/apple-passkit";
import {
  ensureApplePass,
  listUpdatedSerials,
  registerAppleDevice,
  unregisterAppleDevice,
} from "@/lib/loyalty/apple-wallet-store";
import { createAppleWalletPass } from "@/lib/loyalty/apple-wallet";
import { publishApplePassUpdates } from "@/lib/loyalty/apple-wallet-sync";

describe("service PassKit", () => {
  it("reconnaît le jeton ApplePass et refuse un en-tête incomplet", () => {
    expect(appleAuthorizationToken("ApplePass abcdefghijklmnop")).toBe("abcdefghijklmnop");
    expect(appleAuthorizationToken("Bearer abcdefghijklmnop")).toBeNull();
    expect(appleAuthorizationToken("ApplePass court")).toBeNull();
  });

  it("n'accepte que le Pass Type ID de la carte", () => {
    expect(passTypeMatches("pass.com.rappelbeauty.loyalty")).toBe(true);
    expect(passTypeMatches("pass.com.autre")).toBe(false);
  });

  it("ignore un organizationId client et un numéro de série invalide", () => {
    expect(appleSerial("rbloy_ABCDEFGH")).toBe("RBLOY_ABCDEFGH");
    expect(appleSerial("org_123")).toBeNull();
    expect(appleDeviceId("device-library-1")).toBe("device-library-1");
    expect(applePushToken("a".repeat(64))).toHaveLength(64);
    expect(applePushToken("pas-un-jeton")).toBeNull();
  });

  it("prépare un message seulement quand une récompense est disponible", () => {
    expect(appleChangeMessage(1)).toBe("Récompense disponible : %@");
    expect(appleChangeMessage(0)).toBeNull();
  });

  it("signale les cartes modifiées depuis le dernier contrôle", () => {
    const updated = new Date("2026-10-10T12:00:00.000Z");
    expect(passChangedSince(updated, "2026-10-10T11:00:00.000Z")).toBe(true);
    expect(passChangedSince(updated, "2026-10-10T12:00:00.000Z")).toBe(false);
    expect(passChangedSince(updated, null)).toBe(true);
  });

  it("retire un appareil invalide et ne traite pas un envoi comme une réception", () => {
    expect(apnsDeviceResult(200)).toBe("ok");
    expect(apnsDeviceResult(410)).toBe("remove");
    expect(apnsDeviceResult(500)).toBe("retry");
  });

  it("n'annonce le service web que sur une origine https", () => {
    expect(appleWebServiceUrl("https://rappelbeauty.com")).toBe("https://rappelbeauty.com/api/apple-wallet");
    expect(appleWebServiceUrl("http://localhost:3000")).toBeNull();
  });

  it("ne branche pas les mises à jour dans le moteur de fidélité", () => {
    const source = readFileSync("src/lib/loyalty/validation.ts", "utf8");
    expect(source).not.toContain("apple-wallet");
    expect(source).not.toContain("signalApplePassUpdate");
  });

  it("enregistre, refuse un mauvais jeton, puis désinscrit", async () => {
    const card = await pool.query<{ publicToken: string }>(
      `SELECT "publicToken" FROM "LoyaltyCard" WHERE status = 'ACTIVE' LIMIT 1`,
    );
    const serial = card.rows[0]?.publicToken;
    expect(serial?.startsWith("RBLOY_")).toBe(true);
    const pass = await ensureApplePass(serial!);
    const again = await ensureApplePass(serial!);
    expect(Boolean(pass && again && pass.authenticationToken === again.authenticationToken)).toBe(true);
    expect(again?.serialNumber).toBe(serial);

    const device = "device-phase4-test";
    const push = "ab".repeat(32);
    const input = {
      deviceLibraryIdentifier: device,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      serialNumber: serial!,
      pushToken: push,
    };
    expect(await registerAppleDevice({ ...input, authenticationToken: "jeton-invalide-trop-long" })).toBe(401);
    expect(await registerAppleDevice({ ...input, authenticationToken: pass!.authenticationToken })).toBe(201);
    expect(await registerAppleDevice({ ...input, authenticationToken: pass!.authenticationToken })).toBe(200);

    const listed = await listUpdatedSerials(device, APPLE_PASS_TYPE_ID, null);
    expect(listed?.serialNumbers).toContain(serial);
    const future = new Date(Date.now() + 60_000).toISOString();
    const unchanged = await listUpdatedSerials(device, APPLE_PASS_TYPE_ID, future);
    expect(unchanged?.serialNumbers).toEqual([]);

    expect(await unregisterAppleDevice({ ...input, authenticationToken: pass!.authenticationToken })).toBe(200);
    expect(await unregisterAppleDevice({ ...input, authenticationToken: "jeton-invalide-trop-long" })).toBe(401);
    const scan = await publishApplePassUpdates();
    expect(scan.updated).toBe(0);

    const file = await createAppleWalletPass(serial!);
    expect(file?.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(file?.includes(Buffer.from(APPLE_PASS_TYPE_ID))).toBe(true);
  });
});
