/**
 * Logger structuré — ne jamais inclure secrets, mots de passe, tokens JWT, DATABASE_URL.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
  requestId?: string;
  organizationId?: string;
  userId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "session",
  "jwt",
  "authorization",
  "cookie",
  "secret",
  "database_url",
  "databaseurl",
  "apikey",
  "api_key",
  "s3_secret",
]);

function sanitize(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitize);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = sanitize(v);
    }
  }
  return out;
}

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(ctx ? (sanitize(ctx) as LogContext) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, ctx?: LogContext) => emit("debug", message, ctx),
  info: (message: string, ctx?: LogContext) => emit("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => emit("warn", message, ctx),
  error: (message: string, ctx?: LogContext) => emit("error", message, ctx),
};

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `***${digits.slice(-4)}`;
}
