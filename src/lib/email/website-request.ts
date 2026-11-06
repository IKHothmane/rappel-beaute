import { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL } from "@/lib/email/signup-lead";
import { SITE } from "@/lib/site";

export const WEBSITE_REQUEST_NOTIFY_EMAIL = PROFESSIONAL_SIGNUP_NOTIFY_EMAIL;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function websiteRequestEmail(opts: {
  personName: string;
  institut: string;
  email: string;
  orgSlug: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const personName = escapeHtml(opts.personName);
  const institut = escapeHtml(opts.institut);
  const email = escapeHtml(opts.email);
  const orgSlug = escapeHtml(opts.orgSlug || "—");
  const message = escapeHtml(opts.message.trim() || "—");

  const subject = `Demande de création de site web — ${opts.institut}`;
  const rows: Array<[string, string]> = [
    ["Contact", opts.personName],
    ["Institut", opts.institut],
    ["E-mail", opts.email],
    ["Identifiant public", opts.orgSlug || "—"],
    ["Précisions", opts.message.trim() || "—"],
  ];

  const text = [
    `Nouvelle demande de création de site web sur ${SITE.name}.`,
    ``,
    ...rows.map(([label, value]) => `${label} : ${value}`),
    ``,
    `Répondez à cet e-mail pour écrire à ${opts.email}.`,
  ].join("\n");

  const htmlRows = [
    ["Contact", personName],
    ["Institut", institut],
    ["E-mail", email],
    ["Identifiant public", orgSlug],
    ["Précisions", message],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b635e;vertical-align:top;">${label}</td><td style="padding:6px 0;font-weight:700;">${value}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f7f4f1;font-family:Georgia,serif;color:#1f1a17;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b0894d;">${escapeHtml(SITE.name)}</p>
          <h1 style="margin:0 0 16px;font-size:22px;">Demande de création de site web</h1>
          <p style="margin:0 0 18px;line-height:1.5;color:#5a524c;">Un institut souhaite un site web. Répondez directement à cet e-mail.</p>
          <table role="presentation" cellpadding="0" cellspacing="0">${htmlRows}</table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
