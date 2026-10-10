import { readFileSync } from "fs";
import { PKPass } from "passkit-generator";
import { applePassImages } from "@/lib/loyalty/apple-pass-png";
import { getPublicCardByToken, type CardProgress } from "@/lib/loyalty/cards";
import { APPLE_PASS_TYPE_ID, appleChangeMessage, appleWebServiceUrl } from "@/lib/loyalty/apple-passkit";
import { ensureApplePass } from "@/lib/loyalty/apple-wallet-store";
import { appleWalletConfigured } from "@/lib/loyalty/wallet-config";
import { publicAppOrigin } from "@/lib/site";

function loadPem(inlineName: string, pathName: string) {
  const inline = process.env[inlineName]?.trim();
  if (inline) {
    if (inline.includes("BEGIN")) return inline.replace(/\\n/g, "\n");
    return Buffer.from(inline, "base64").toString("utf8");
  }
  const file = process.env[pathName]?.trim();
  if (!file) throw new Error(`APPLE_WALLET_MISSING_${pathName}`);
  return readFileSync(file, "utf8");
}

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

function passFields(token: string, card: CardProgress) {
  const name = `${card.firstName} ${card.lastName}`.trim();
  const progress = `${card.cycle} / ${card.visitsPerReward}`;
  const available = card.rewards.find((reward) => reward.status === "AVAILABLE");
  const rewardName = available?.name || card.rewardLabel;
  const state =
    card.rewardsAvailable > 0
      ? rewardName
      : `Encore ${card.remaining} passage${card.remaining > 1 ? "s" : ""}`;
  return { name, progress, rewardName, state, available };
}

/** .pkpass signé. Le numéro de série est le jeton public de la carte. */
export async function createAppleWalletPass(token: string): Promise<Buffer | null> {
  if (!appleWalletConfigured()) return null;
  const normalized = token.trim().toUpperCase();
  const card = await getPublicCardByToken(normalized);
  if (!card) return null;

  const fields = passFields(normalized, card);
  const record = await ensureApplePass(normalized).catch(() => null);
  const webServiceURL = record ? appleWebServiceUrl(publicAppOrigin()) : null;
  const pass = new PKPass(
    applePassImages(),
    {
      wwdr: loadPem("APPLE_WWDR", "APPLE_WWDR_PATH"),
      signerCert: loadPem("APPLE_PASS_CERT", "APPLE_PASS_CERT_PATH"),
      signerKey: loadPem("APPLE_PASS_KEY", "APPLE_PASS_KEY_PATH"),
    },
    {
      formatVersion: 1,
      description: "Carte fidélité",
      organizationName: card.organizationName,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: process.env.APPLE_TEAM_ID!.trim(),
      serialNumber: normalized,
      logoText: card.organizationName,
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(186, 0, 73)",
      labelColor: "rgb(255, 222, 236)",
      ...(webServiceURL && record
        ? { webServiceURL, authenticationToken: record.authenticationToken }
        : {}),
    },
  );

  pass.type = "storeCard";
  pass.headerFields.push({ key: "progress", label: "PASSAGES", value: fields.progress });
  pass.primaryFields.push({ key: "client", label: "CLIENTE", value: fields.name });
  const changeMessage = appleChangeMessage(card.rewardsAvailable);
  pass.secondaryFields.push({
    key: "state",
    label: "ÉTAT",
    value: fields.state,
    ...(changeMessage ? { changeMessage } : {}),
  });
  pass.auxiliaryFields.push({
    key: "reward",
    label: "RÉCOMPENSE",
    value: fields.available?.value != null ? `${fields.rewardName} · ${money(fields.available.value)}` : fields.rewardName,
  });
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: normalized,
    messageEncoding: "iso-8859-1",
    altText: fields.name,
  });

  return pass.getAsBuffer();
}
