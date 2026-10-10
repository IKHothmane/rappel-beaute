export const APPLE_PASS_TYPE_ID = "pass.com.rappelbeauty.loyalty";

const SERIAL = /^RBLOY_[A-Z2-9]{8,32}$/;
const DEVICE = /^[A-Za-z0-9_-]{8,128}$/;
const PUSH_TOKEN = /^[A-Fa-f0-9]{32,200}$/;

export function appleSerial(value: string): string | null {
  const serial = value.trim().toUpperCase();
  return SERIAL.test(serial) ? serial : null;
}

export function appleDeviceId(value: string): string | null {
  const id = value.trim();
  return DEVICE.test(id) ? id : null;
}

export function applePushToken(value: unknown): string | null {
  if (typeof value !== "string" || !PUSH_TOKEN.test(value)) return null;
  return value.toLowerCase();
}

export function appleAuthorizationToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^ApplePass\s+(\S+)$/.exec(header.trim());
  const token = match?.[1] ?? "";
  if (token.length < 16 || token.length > 128) return null;
  return token;
}

export function passTypeMatches(value: string) {
  return value === APPLE_PASS_TYPE_ID;
}

export function appleChangeMessage(rewardsAvailable: number) {
  return rewardsAvailable > 0 ? "Récompense disponible : %@" : null;
}

export function passChangedSince(updatedAt: Date, since: string | null) {
  if (!since) return true;
  const time = Date.parse(since);
  if (!Number.isFinite(time)) return true;
  return updatedAt.getTime() > time;
}

export function apnsDeviceResult(status: number): "ok" | "remove" | "retry" {
  if (status === 200) return "ok";
  if (status === 410) return "remove";
  return "retry";
}

export function appleWebServiceUrl(origin: string) {
  if (!origin.startsWith("https://")) return null;
  return `${origin.replace(/\/$/, "")}/api/apple-wallet`;
}
