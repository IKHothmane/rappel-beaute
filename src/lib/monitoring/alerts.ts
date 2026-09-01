export type AlertSeverity = "critical" | "warning" | "info";

export type AlertPayload = {
  severity: AlertSeverity;
  title: string;
  source: string;
  details?: string;
  env?: string;
};

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: "🔴",
  warning: "🟠",
  info: "ℹ️",
};

/**
 * Envoie une alerte vers ALERT_WEBHOOK_URL (Slack incoming webhook, Discord, n8n…).
 * No-op si webhook absent (local dev).
 */
export async function sendAlert(payload: AlertPayload): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    console.warn("[monitoring] ALERT_WEBHOOK_URL absent — alerte loggée uniquement", payload);
    return false;
  }

  const isDiscord = url.includes("discord.com/api/webhooks");
  const isSlack = url.includes("hooks.slack.com");

  const line = `${SEVERITY_EMOJI[payload.severity]} **${payload.title}**`;
  const meta = [
    payload.details,
    `source: ${payload.source}`,
    `env: ${payload.env ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown"}`,
    new Date().toISOString(),
  ]
    .filter(Boolean)
    .join("\n");

  const body = isDiscord
    ? { content: `${line}\n\`\`\`\n${meta}\n\`\`\`` }
    : isSlack
      ? { text: `${line}\n${meta}` }
      : {
          text: line,
          severity: payload.severity,
          source: payload.source,
          env: payload.env ?? process.env.APP_ENV ?? process.env.NODE_ENV,
          details: payload.details,
          timestamp: new Date().toISOString(),
        };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[monitoring] webhook HTTP", res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[monitoring] webhook error", e);
    return false;
  }
}
