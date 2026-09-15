import { Pool } from "pg";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { isWhatsAppDirectSendEnabled, getMetaWhatsAppConfig } from "@/lib/whatsapp/send";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type PlatformSettingsData = {
  platform: {
    name: string;
    url: string;
    locale: string;
    timezone: string;
    currency: string;
    maintenance: boolean;
  };
  billing: {
    price: number;
    currency: string;
    vatPercent: number;
    period: "MONTHLY" | "YEARLY";
    reminderDays: number;
    suspendAfterDays: number;
  };
  notifications: {
    emailNewTicket: boolean;
    emailPaymentReceived: boolean;
    emailPaymentFailed: boolean;
    emailNewOrg: boolean;
    emailNewUser: boolean;
    internalUrgentTicket: boolean;
    internalSystemError: boolean;
    internalNewPayment: boolean;
  };
  email: {
    provider: string;
    fromEmail: string;
    fromName: string;
    transactional: boolean;
    support: boolean;
    billing: boolean;
  };
  ai: {
    marketing: boolean;
    generation: boolean;
    suggestions: boolean;
    monthlyLimit: number;
    model: string;
  };
  security: {
    secureSession: boolean;
    forceTempPasswordChange: boolean;
    sessionExpiry: boolean;
    bruteForceProtection: boolean;
    twoFactorEnabled: boolean;
  };
  whatsapp: {
    preferManualSend: boolean;
  };
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsData = {
  platform: {
    name: "Rappel Beauty",
    url: "app.rappelbeauty.com",
    locale: "fr",
    timezone: "Africa/Casablanca",
    currency: "MAD",
    maintenance: false,
  },
  billing: {
    price: 400,
    currency: "MAD",
    vatPercent: 20,
    period: "MONTHLY",
    reminderDays: 7,
    suspendAfterDays: 3,
  },
  notifications: {
    emailNewTicket: true,
    emailPaymentReceived: true,
    emailPaymentFailed: true,
    emailNewOrg: true,
    emailNewUser: true,
    internalUrgentTicket: true,
    internalSystemError: true,
    internalNewPayment: true,
  },
  email: {
    provider: "resend",
    fromEmail: "support@rappelbeauty.com",
    fromName: "Rappel Beauty",
    transactional: true,
    support: true,
    billing: true,
  },
  ai: {
    marketing: true,
    generation: true,
    suggestions: true,
    monthlyLimit: 1000,
    model: "gpt",
  },
  security: {
    secureSession: true,
    forceTempPasswordChange: true,
    sessionExpiry: true,
    bruteForceProtection: true,
    twoFactorEnabled: false,
  },
  whatsapp: {
    preferManualSend: true,
  },
};

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[key];
    const bv = base[key];
    if (
      pv &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      out[key] = deepMerge(
        bv as Record<string, unknown>,
        pv as Record<string, unknown>,
      ) as T[keyof T];
    } else if (pv !== undefined) {
      out[key] = pv as T[keyof T];
    }
  }
  return out;
}

function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}

export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  try {
    const { rows } = await pool.query<{ data: PlatformSettingsData }>(
      `SELECT data FROM "PlatformConfig" WHERE id = 'default' LIMIT 1`,
    );
    if (!rows[0]?.data) return DEFAULT_PLATFORM_SETTINGS;
    return deepMerge(
      DEFAULT_PLATFORM_SETTINGS as unknown as Record<string, unknown>,
      rows[0].data as unknown as Record<string, unknown>,
    ) as unknown as PlatformSettingsData;
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

export async function updatePlatformSettings(input: {
  patch: Partial<PlatformSettingsData>;
  platformUserId: string;
  platformUserName: string;
}): Promise<PlatformSettingsData> {
  const current = await getPlatformSettings();
  const next = deepMerge(
    current as unknown as Record<string, unknown>,
    input.patch as unknown as Record<string, unknown>,
  ) as unknown as PlatformSettingsData;

  await pool.query(
    `INSERT INTO "PlatformConfig" (id, data, "updatedAt", "updatedBy")
     VALUES ('default', $1::jsonb, NOW(), $2)
     ON CONFLICT (id) DO UPDATE
     SET data = EXCLUDED.data, "updatedAt" = NOW(), "updatedBy" = EXCLUDED."updatedBy"`,
    [JSON.stringify(next), input.platformUserId],
  );

  await writePlatformAuditLog({
    platformUserId: input.platformUserId,
    platformUserName: input.platformUserName,
    entityType: "PlatformConfig",
    entityId: "default",
    action: "UPDATE",
    before: current,
    after: next,
  }).catch(() => undefined);

  return next;
}

export type PlatformProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: string;
  timezone: string;
  role: string;
};

export async function getPlatformProfile(id: string): Promise<PlatformProfile | null> {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    locale: string | null;
    timezone: string | null;
    role: string;
  }>(
    `SELECT id, email, "firstName", "lastName", phone, locale, timezone, role::text AS role
     FROM "PlatformUser" WHERE id = $1 LIMIT 1`,
    [id],
  );
  const u = rows[0];
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    locale: u.locale ?? "fr",
    timezone: u.timezone ?? "Africa/Casablanca",
    role: u.role,
  };
}

export async function updatePlatformProfile(input: {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  locale?: string;
  timezone?: string;
  platformUserName: string;
}): Promise<PlatformProfile> {
  const existing = await getPlatformProfile(input.id);
  if (!existing) throw new Error("NOT_FOUND");

  const firstName = (input.firstName ?? existing.firstName).trim().slice(0, 80);
  const lastName = (input.lastName ?? existing.lastName).trim().slice(0, 80);
  const email = (input.email ?? existing.email).trim().toLowerCase().slice(0, 160);
  const phone =
    input.phone !== undefined ? (input.phone?.trim().slice(0, 40) || null) : existing.phone;
  const locale = input.locale ?? existing.locale;
  const timezone = input.timezone ?? existing.timezone;

  if (!firstName || !lastName || !email) throw new Error("INVALID_INPUT");

  try {
    await pool.query(
      `UPDATE "PlatformUser"
       SET "firstName" = $1, "lastName" = $2, email = $3, phone = $4,
           locale = $5, timezone = $6, "updatedAt" = NOW()
       WHERE id = $7`,
      [firstName, lastName, email, phone, locale, timezone, input.id],
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) throw new Error("EMAIL_TAKEN");
    throw e;
  }

  await writePlatformAuditLog({
    platformUserId: input.id,
    platformUserName: input.platformUserName,
    entityType: "PlatformUser",
    entityId: input.id,
    action: "UPDATE",
    before: existing,
    after: { firstName, lastName, email, phone, locale, timezone },
  }).catch(() => undefined);

  return (await getPlatformProfile(input.id))!;
}

export async function changePlatformPassword(input: {
  id: string;
  currentPassword: string;
  newPassword: string;
  platformUserName: string;
}): Promise<void> {
  if (input.newPassword.length < 8) throw new Error("WEAK_PASSWORD");
  const { rows } = await pool.query<{ passwordHash: string | null }>(
    `SELECT "passwordHash" FROM "PlatformUser" WHERE id = $1 LIMIT 1`,
    [input.id],
  );
  const hash = rows[0]?.passwordHash;
  if (!hash || !verifyPassword(input.currentPassword, hash)) {
    throw new Error("BAD_PASSWORD");
  }
  await pool.query(
    `UPDATE "PlatformUser" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2`,
    [hashPassword(input.newPassword), input.id],
  );
  await writePlatformAuditLog({
    platformUserId: input.id,
    platformUserName: input.platformUserName,
    entityType: "PlatformUser",
    entityId: input.id,
    action: "UPDATE",
    after: { passwordChanged: true },
  }).catch(() => undefined);
}

export function getIntegrationsStatus() {
  const wa = getMetaWhatsAppConfig();
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim() || null;
  const aiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || null;
  const resendKey = process.env.RESEND_API_KEY || null;

  return {
    whatsapp: {
      autoSendEnabled: isWhatsAppDirectSendEnabled(),
      webhookConfigured: Boolean(wa.phoneNumberId && verifyToken),
      phoneNumberIdMasked: maskSecret(wa.phoneNumberId),
      verifyTokenMasked: maskSecret(verifyToken),
      hasAccessToken: Boolean(wa.accessToken),
      mode: isWhatsAppDirectSendEnabled() ? "auto" : "manual",
    },
    ai: {
      configured: Boolean(aiKey),
      provider: process.env.AI_PROVIDER || (aiKey ? "openai" : "mock"),
      model: process.env.AI_MODEL || "gpt-4o-mini",
      keyMasked: maskSecret(aiKey),
    },
    email: {
      resendConfigured: Boolean(resendKey),
      keyMasked: maskSecret(resendKey),
    },
  };
}
