import { createHash, randomBytes } from "crypto";
import { Pool } from "pg";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const WIDGET_SESSION_MS = 30 * 60 * 1000;
const CUSTOMER_SESSION_MS = 2 * 60 * 60 * 1000;

export class AssistantSessionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "WIDGET_NOT_FOUND"
      | "ORIGIN_DENIED"
      | "RATE_LIMITED"
      | "NOT_VERIFIED"
      | "CUSTOMER_NOT_FOUND"
      | "CLIENT_AUTHORITY",
  ) {
    super(message);
    this.name = "AssistantSessionError";
  }
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

export function normalizeWidgetOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Ouvre une session widget. organizationId vient du widget, jamais du client.
 */
export async function openWidgetSession(input: {
  publicId: string;
  origin: string;
  ip: string;
  organizationId?: string;
}): Promise<{ token: string; organizationId: string; expiresAt: Date }> {
  const origin = normalizeWidgetOrigin(input.origin);
  if (!origin) throw new AssistantSessionError("Domaine refusé.", "ORIGIN_DENIED");

  const rl = await consumeDimensions([
    { key: `assistant:widget:ip:${input.ip}`, ...RATE_POLICIES.assistantWidget.ip, sensitivity: "sensitive" },
    { key: `assistant:widget:pub:${input.publicId}`, ...RATE_POLICIES.assistantWidget.widget, sensitivity: "sensitive" },
  ]);
  if (!rl.allowed) throw new AssistantSessionError("Trop de demandes.", "RATE_LIMITED");

  const widget = await pool.query<{ id: string; organizationId: string; status: string }>(
    `SELECT id, "organizationId", status
     FROM "PublicWidget"
     WHERE "publicId" = $1`,
    [input.publicId],
  );
  const row = widget.rows[0];
  if (!row || row.status !== "ACTIVE") {
    throw new AssistantSessionError("Widget introuvable.", "WIDGET_NOT_FOUND");
  }
  if (input.organizationId && input.organizationId !== row.organizationId) {
    throw new AssistantSessionError("Institut non autorisé.", "CLIENT_AUTHORITY");
  }

  const allowed = await pool.query(
    `SELECT 1 FROM "PublicWidgetOrigin" WHERE "widgetId" = $1 AND origin = $2`,
    [row.id, origin],
  );
  if (allowed.rowCount === 0) {
    throw new AssistantSessionError("Domaine refusé.", "ORIGIN_DENIED");
  }

  const token = newToken();
  const expiresAt = new Date(Date.now() + WIDGET_SESSION_MS);
  await pool.query(
    `INSERT INTO "AssistantWidgetSession" (id, "widgetId", "organizationId", "tokenHash", "expiresAt")
     VALUES ($1, $2, $3, $4, $5)`,
    [`wss_${randomBytes(8).toString("hex")}`, row.id, row.organizationId, tokenHash(token), expiresAt],
  );
  return { token, organizationId: row.organizationId, expiresAt };
}

/**
 * Hors du parcours de réservation public. Ce parcours n'envoie pas d'OTP
 * et n'ouvre pas de session cliente : le serveur rattache le rendez-vous
 * au téléphone au moment de la confirmation.
 */
export async function openCustomerSession(input: {
  widgetToken: string;
  phone: string;
  customerId?: string;
}): Promise<{ token: string; customerId: string; organizationId: string; expiresAt: Date }> {
  const session = await pool.query<{ id: string; organizationId: string }>(
    `SELECT id, "organizationId"
     FROM "AssistantWidgetSession"
     WHERE "tokenHash" = $1 AND "expiresAt" > NOW()`,
    [tokenHash(input.widgetToken)],
  );
  const widgetSession = session.rows[0];
  if (!widgetSession) throw new AssistantSessionError("Session widget expirée.", "NOT_VERIFIED");

  const challenge = await pool.query(
    `SELECT 1 FROM "AssistantVerificationChallenge"
     WHERE "widgetSessionId" = $1
       AND phone = $2
       AND "consumedAt" IS NOT NULL
       AND "expiresAt" > "consumedAt"`,
    [widgetSession.id, input.phone.trim()],
  );
  if (challenge.rowCount === 0) {
    throw new AssistantSessionError("Numéro non vérifié.", "NOT_VERIFIED");
  }

  const customer = await pool.query<{ id: string }>(
    `SELECT id FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,
    [widgetSession.organizationId, input.phone.trim()],
  );
  const found = customer.rows[0];
  if (!found) throw new AssistantSessionError("Cliente introuvable.", "CUSTOMER_NOT_FOUND");
  if (input.customerId && input.customerId !== found.id) {
    throw new AssistantSessionError("Cliente non autorisée.", "CLIENT_AUTHORITY");
  }

  const token = newToken();
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_MS);
  await pool.query(
    `INSERT INTO "AssistantCustomerSession"
      (id, "widgetSessionId", "organizationId", "customerId", "tokenHash", "verifiedAt", "expiresAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
    [
      `css_${randomBytes(8).toString("hex")}`,
      widgetSession.id,
      widgetSession.organizationId,
      found.id,
      tokenHash(token),
      expiresAt,
    ],
  );
  return {
    token,
    customerId: found.id,
    organizationId: widgetSession.organizationId,
    expiresAt,
  };
}

export async function readWidgetSession(token: string): Promise<{
  id: string;
  organizationId: string;
  organizationName: string;
} | null> {
  const found = await pool.query<{ id: string; organizationId: string; organizationName: string }>(
    `SELECT s.id, s."organizationId", o.name AS "organizationName"
     FROM "AssistantWidgetSession" s
     JOIN "Organization" o ON o.id = s."organizationId"
     WHERE s."tokenHash" = $1 AND s."expiresAt" > NOW()`,
    [tokenHash(token)],
  );
  return found.rows[0] ?? null;
}

export async function listWidgetFrameAncestors(publicId: string): Promise<string[]> {
  const found = await pool.query<{ origin: string }>(
    `SELECT o.origin
     FROM "PublicWidgetOrigin" o
     JOIN "PublicWidget" w ON w.id = o."widgetId"
     WHERE w."publicId" = $1 AND w.status = 'ACTIVE'`,
    [publicId],
  );
  return found.rows.map((row) => row.origin);
}

export const ASSISTANT_PREVIEW_PUBLIC_ID = "pub_preview";

export async function ensurePreviewWidget(): Promise<void> {
  const org = await pool.query<{ id: string }>(
    `SELECT id FROM "Organization" WHERE slug = 'institut-royal' LIMIT 1`,
  );
  const organizationId = org.rows[0]?.id;
  if (!organizationId) return;
  await pool.query(
    `INSERT INTO "PublicWidget" (id, "organizationId", "publicId", name, status, "updatedAt")
     VALUES ('wdg_preview', $1, $2, 'Aperçu assistant', 'ACTIVE', NOW())
     ON CONFLICT ("publicId") DO UPDATE SET status = 'ACTIVE', "updatedAt" = NOW()`,
    [organizationId, ASSISTANT_PREVIEW_PUBLIC_ID],
  );
  const widget = await pool.query<{ id: string }>(
    `SELECT id FROM "PublicWidget" WHERE "publicId" = $1`,
    [ASSISTANT_PREVIEW_PUBLIC_ID],
  );
  const widgetId = widget.rows[0]?.id;
  if (!widgetId) return;
  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://rappelbeauty.com",
    "https://www.rappelbeauty.com",
  ]) {
    await pool.query(
      `INSERT INTO "PublicWidgetOrigin" (id, "widgetId", origin)
       VALUES ($1, $2, $3)
       ON CONFLICT ("widgetId", origin) DO NOTHING`,
      [`ori_${origin.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`, widgetId, origin],
    );
  }
}
