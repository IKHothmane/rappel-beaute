import http2 from "node:http2";
import { readFileSync } from "fs";
import { APPLE_PASS_TYPE_ID } from "@/lib/loyalty/apple-passkit";
import { appleWalletConfigured } from "@/lib/loyalty/wallet-config";

function loadPem(inlineName: string, pathName: string) {
  const inline = process.env[inlineName]?.trim();
  if (inline) {
    if (inline.includes("BEGIN")) return inline.replace(/\\n/g, "\n");
    return Buffer.from(inline, "base64").toString("utf8");
  }
  const file = process.env[pathName]?.trim();
  if (!file) throw new Error("APPLE_WALLET_MATERIAL_MISSING");
  return readFileSync(file, "utf8");
}

/** Signal Wallet. Un code 200 ne garantit pas que le téléphone a reçu le pass. */
export function signalApplePassUpdate(pushToken: string): Promise<number> {
  if (!appleWalletConfigured()) return Promise.resolve(0);
  return new Promise((resolve) => {
    let settled = false;
    const client = http2.connect("https://api.push.apple.com", {
      cert: loadPem("APPLE_PASS_CERT", "APPLE_PASS_CERT_PATH"),
      key: loadPem("APPLE_PASS_KEY", "APPLE_PASS_KEY_PATH"),
    });
    const finish = (status: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(status);
      client.close();
    };
    const timer = setTimeout(() => finish(0), 8_000);
    client.on("error", () => finish(0));
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": APPLE_PASS_TYPE_ID,
    });
    request.on("response", (headers) => finish(Number(headers[":status"] ?? 0)));
    request.on("error", () => finish(0));
    request.end("{}");
  });
}
