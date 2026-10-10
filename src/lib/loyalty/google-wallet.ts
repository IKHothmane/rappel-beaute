import { createSign } from "crypto";
import { readFileSync } from "fs";
import { logger } from "@/lib/logger";
import type { CardProgress } from "@/lib/loyalty/cards";
import { getPublicCardByToken } from "@/lib/loyalty/cards";
import { publicAppOrigin, SITE } from "@/lib/site";
import { googleWalletClassId, googleWalletConfigured, googleWalletIssuerId } from "@/lib/loyalty/wallet-config";

type ServiceAccount = { client_email: string; private_key: string };

type Localized = { defaultValue: { language: "fr-FR"; value: string } };

function fr(value: string): Localized {
  return { defaultValue: { language: "fr-FR", value } };
}

function loadServiceAccount(): ServiceAccount | null {
  try {
    const inline = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON?.trim();
    const file = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PATH?.trim();
    const raw = inline || (file ? readFileSync(file, "utf8") : "");
    if (!raw) return null;
    const text = raw.trim().startsWith("{") ? raw.trim() : Buffer.from(raw.trim(), "base64").toString("utf8");
    const parsed = JSON.parse(text) as { client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function signRs256(payload: Record<string, unknown>, privateKey: string) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  return `${data}.${signer.sign(privateKey).toString("base64url")}`;
}

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

function expiryLabel(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Africa/Casablanca" });
}

function walletOrigins(requestOrigin?: string) {
  const values = [requestOrigin, publicAppOrigin(), SITE.url, "https://www.rappelbeauty.com"].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  return [...new Set(values.map((value) => value.replace(/\/$/, "")))];
}

function genericObject(token: string, card: CardProgress) {
  const issuerId = googleWalletIssuerId();
  const name = `${card.firstName} ${card.lastName}`.trim();
  const progress = `${card.cycle} / ${card.visitsPerReward}`;
  const available = card.rewards.find((reward) => reward.status === "AVAILABLE");
  const rewardName = available?.name || card.rewardLabel;
  const header = card.rewardsAvailable > 0 ? "Récompense disponible" : progress;
  const remaining =
    card.rewardsAvailable > 0
      ? rewardName
      : `Encore ${card.remaining} passage${card.remaining > 1 ? "s" : ""}`;

  return {
    id: `${issuerId}.${token}`,
    classId: googleWalletClassId(),
    state: "ACTIVE",
    cardTitle: fr(card.organizationName),
    subheader: fr("Carte fidélité"),
    header: fr(header),
    hexBackgroundColor: "#ba0049",
    textModulesData: [
      { id: "client", header: "Cliente", body: name },
      { id: "carte", header: "Carte", body: token },
      { id: "progress", header: "Passages", body: progress },
      { id: "reward", header: "Récompense", body: rewardName },
      { id: "value", header: "Valeur", body: available?.value != null ? money(available.value) : "—" },
      {
        id: "expires",
        header: "Expiration",
        body: available?.expiresAt ? expiryLabel(available.expiresAt) : "—",
      },
      { id: "remaining", header: "État", body: remaining },
    ],
    barcode: {
      type: "QR_CODE",
      value: token,
      alternateText: name,
    },
  };
}

/** Lien officiel d'ajout. La classe est créée au premier scan si elle n'existe pas encore. */
export async function createGoogleWalletSaveUrl(token: string, requestOrigin?: string): Promise<string | null> {
  if (!googleWalletConfigured()) return null;
  const account = loadServiceAccount();
  if (!account) return null;
  const normalized = token.trim().toUpperCase();
  const card = await getPublicCardByToken(normalized);
  if (!card) return null;

  const object = genericObject(normalized, card);
  try {
    await upsertGenericObject(account, object);
  } catch (error) {
    const message = error instanceof Error ? error.message : "objet";
    console.error("[google-wallet]", message);
    return null;
  }

  const claims = {
    iss: account.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: walletOrigins(requestOrigin),
    payload: {
      genericObjects: [object],
    },
  };
  return `https://pay.google.com/gp/v/save/${signRs256(claims, account.private_key)}`;
}

async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signRs256(
    {
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    account.private_key,
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await response.json()) as { access_token?: string };
  if (!response.ok || !body.access_token) throw new Error("GOOGLE_WALLET_AUTH");
  return body.access_token;
}

async function walletFetch(
  account: ServiceAccount,
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
) {
  const bearer = await accessToken(account);
  return fetch(`https://walletobjects.googleapis.com/walletobjects/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function walletFailure(response: Response, step: string) {
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  const detail = payload?.error?.message?.replace(/\s+/g, " ").slice(0, 180) || "";
  throw new Error(detail ? `${step}_${response.status} ${detail}` : `${step}_${response.status}`);
}

async function ensureGenericClass(account: ServiceAccount, classId: string) {
  const existing = await walletFetch(account, `genericClass/${encodeURIComponent(classId)}`, "GET");
  if (existing.ok) return;
  if (existing.status !== 404) await walletFailure(existing, "GOOGLE_WALLET_CLASS");
  const missing = (await existing.json().catch(() => null)) as { error?: { message?: string } } | null;
  const message = missing?.error?.message || "";
  if (/issuer/i.test(message)) await walletFailure(new Response(JSON.stringify(missing), { status: 404 }), "GOOGLE_WALLET_CLASS");
  const created = await walletFetch(account, "genericClass", "POST", {
    id: classId,
    reviewStatus: "UNDER_REVIEW",
  });
  if (!created.ok && created.status !== 409) await walletFailure(created, "GOOGLE_WALLET_CLASS");
}

async function upsertGenericObject(account: ServiceAccount, object: ReturnType<typeof genericObject>) {
  await ensureGenericClass(account, object.classId);
  const created = await walletFetch(account, "genericObject", "POST", object);
  if (created.ok) return;
  if (created.status !== 409) await walletFailure(created, "GOOGLE_WALLET_SYNC");
  const patched = await walletFetch(account, `genericObject/${object.id}`, "PATCH", {
    cardTitle: object.cardTitle,
    subheader: object.subheader,
    header: object.header,
    textModulesData: object.textModulesData,
    barcode: object.barcode,
  });
  if (!patched.ok) await walletFailure(patched, "GOOGLE_WALLET_SYNC");
}

async function syncGoogleWalletCard(token: string) {
  const account = loadServiceAccount();
  if (!account) return;
  const normalized = token.trim().toUpperCase();
  const card = await getPublicCardByToken(normalized);
  if (!card) return;
  await upsertGenericObject(account, genericObject(normalized, card));
  const { deliverWalletMessagesForToken } = await import("@/lib/loyalty/google-wallet-notify");
  await deliverWalletMessagesForToken(normalized);
}

/** Après un passage déjà enregistré. Sans compte de service, ne fait rien. */
export function notifyGoogleWallet(token: string) {
  if (!googleWalletConfigured()) return;
  void syncGoogleWalletCard(token).catch((error) => {
    const message = error instanceof Error ? error.message : "sync";
    console.error("[google-wallet]", message.slice(0, 180));
  });
}

let classStatusCache: { at: number; status: string | null } | null = null;

export async function googleWalletClassReviewStatus(): Promise<string | null> {
  const account = loadServiceAccount();
  const classId = googleWalletClassId();
  if (!account || !classId) {
    logger.warn("google wallet class unread", { status: account ? 0 : -1 });
    return null;
  }
  if (classStatusCache && Date.now() - classStatusCache.at < 10 * 60 * 1000) return classStatusCache.status;
  const response = await walletFetch(account, `genericClass/${encodeURIComponent(classId)}`, "GET");
  if (!response.ok) {
    logger.warn("google wallet class unread", { status: response.status });
    classStatusCache = { at: Date.now(), status: null };
    return null;
  }
  const body = (await response.json()) as { reviewStatus?: string };
  const status = body.reviewStatus ?? null;
  classStatusCache = { at: Date.now(), status };
  return status;
}

export async function addGoogleWalletTextMessage(
  token: string,
  message: { id: string; header: string; body: string },
): Promise<number> {
  const account = loadServiceAccount();
  const issuerId = googleWalletIssuerId();
  if (!account || !issuerId) return 0;
  const objectId = `${issuerId}.${token.trim().toUpperCase()}`;
  const response = await walletFetch(account, `genericObject/${encodeURIComponent(objectId)}/addMessage`, "POST", {
    message: {
      header: message.header.slice(0, 80),
      body: message.body.slice(0, 240),
      id: message.id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64),
      messageType: "TEXT_AND_NOTIFY",
    },
  });
  return response.status;
}
