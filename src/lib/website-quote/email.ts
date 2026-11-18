import { SITE } from "@/lib/site";
import type { WebsiteQuoteInput } from "./validation";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Message envoyé au propriétaire. Toutes les valeurs saisies sont échappées dans le HTML ;
 * le sujet ne contient que l'institut, déjà validé sans retour à la ligne.
 */
export function websiteQuoteEmail(input: WebsiteQuoteInput): { subject: string; html: string; text: string } {
  const subject = `Demande de site web — ${input.institute}`;
  const rows: Array<[string, string]> = [
    ["Nom", input.name],
    ["Institut", input.institute],
    ["E-mail", input.email],
    ["Téléphone", input.phone || "Non renseigné"],
    ["Type de site", input.project],
  ];

  const text = [
    `Nouvelle demande de devis pour un site web (${SITE.name}).`,
    "",
    ...rows.map(([label, value]) => `${label} : ${value}`),
    "",
    "Message :",
    input.message || "Non renseigné",
    "",
    `Répondez à cet e-mail pour écrire à ${input.email}.`,
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b635e;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const htmlMessage = escapeHtml(input.message || "Non renseigné").replace(/\n/g, "<br>");

  const html = `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f7f4f1;font-family:Georgia,serif;color:#1f1a17;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b0894d;">${escapeHtml(SITE.name)}</p>
          <h1 style="margin:0 0 16px;font-size:22px;">Demande de site web</h1>
          <p style="margin:0 0 16px;line-height:1.5;">Une demande de devis vient d'être envoyée depuis la page Création de site web.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;line-height:1.45;">${htmlRows}</table>
          <p style="margin:20px 0 6px;color:#6b635e;font-size:13px;">Message</p>
          <p style="margin:0;line-height:1.55;font-size:15px;">${htmlMessage}</p>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b635e;">Répondez à cet e-mail pour écrire directement à ${escapeHtml(input.email)}.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
