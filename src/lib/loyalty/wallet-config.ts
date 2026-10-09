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

function appleMaterial(inlineName: string, pathName: string) {
  return Boolean(process.env[inlineName]?.trim() || process.env[pathName]?.trim());
}

export function appleWalletConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID?.trim() &&
      process.env.APPLE_TEAM_ID?.trim() &&
      appleMaterial("APPLE_WWDR", "APPLE_WWDR_PATH") &&
      appleMaterial("APPLE_PASS_CERT", "APPLE_PASS_CERT_PATH") &&
      appleMaterial("APPLE_PASS_KEY", "APPLE_PASS_KEY_PATH"),
  );
}

export function googleWalletIssuerId() {
  return process.env.GOOGLE_WALLET_ISSUER_ID?.trim() || "";
}

/** Classe créée automatiquement au premier scan : {issuer}.rappel_beauty */
export function googleWalletClassId() {
  const issuerId = googleWalletIssuerId();
  const suffix = process.env.GOOGLE_WALLET_CLASS_SUFFIX?.trim() || "rappel_beauty";
  if (!issuerId) return "";
  return `${issuerId}.${suffix}`;
}

export function googleWalletConfigured() {
  return Boolean(
    googleWalletIssuerId() &&
      (process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON?.trim() ||
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PATH?.trim()),
  );
}
