import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN = /^RBLOY_[A-Z2-9]{8,32}$/;

export function walletUnavailable(kind: "apple" | "google") {
  const label = kind === "apple" ? "Apple Wallet" : "Google Wallet";
  return NextResponse.json(
    {
      configured: false,
      error: `${label} n'est pas encore activé sur ce serveur. La carte reste disponible sur cette page.`,
    },
    { status: 503 },
  );
}

export function readCardToken(request: NextRequest, token: string) {
  const normalized = token.trim().toUpperCase();
  if (!TOKEN.test(normalized)) {
    return { ok: false as const, response: NextResponse.json({ error: "Carte introuvable." }, { status: 404 }) };
  }
  return { ok: true as const, token: normalized, request };
}

export function appleWalletConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID?.trim() &&
      process.env.APPLE_TEAM_ID?.trim() &&
      process.env.APPLE_WWDR_PATH?.trim() &&
      process.env.APPLE_PASS_CERT_PATH?.trim() &&
      process.env.APPLE_PASS_KEY_PATH?.trim(),
  );
}

/** Classe générique déjà créée dans la console : 338800000023216027.rappel_beauty */
export function googleWalletClassId() {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim() || "338800000023216027";
  const suffix = process.env.GOOGLE_WALLET_CLASS_SUFFIX?.trim() || "rappel_beauty";
  return `${issuerId}.${suffix}`;
}

export function googleWalletConfigured() {
  return Boolean(
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PATH?.trim(),
  );
}
