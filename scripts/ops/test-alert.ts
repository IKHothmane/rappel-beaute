/**
 * Envoie une alerte test vers ALERT_WEBHOOK_URL (Discord / Slack / n8n).
 * Usage: ALERT_WEBHOOK_URL=https://... npx tsx scripts/ops/test-alert.ts
 */
import { sendAlert } from "../../src/lib/monitoring/alerts";

async function main() {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    console.error("ALERT_WEBHOOK_URL requis — créez un webhook Discord ou Slack");
    process.exit(1);
  }

  const ok = await sendAlert({
    severity: "warning",
    title: "Test alerte Rappel Beauté",
    source: "scripts/ops/test-alert",
    details: "Si vous voyez ce message, le monitoring est correctement branché.",
    env: process.env.APP_ENV ?? "staging-test",
  });

  if (ok) {
    console.log("✓ Alerte envoyée — vérifiez Discord/Slack");
  } else {
    console.error("✗ Échec envoi webhook");
    process.exit(1);
  }
}

main();
