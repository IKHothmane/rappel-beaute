import { SITE } from "@/lib/site";

export const PROFESSIONAL_SIGNUP_NOTIFY_EMAIL = "ikhlef.othmane@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function signupLeadEmail(opts: {
  personName: string;
  institut: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  message: string;
  website?: string | null;
  noWebsite?: boolean;
  logoName: string | null;
}): { subject: string; html: string; text: string } {
  const personName = escapeHtml(opts.personName);
  const institut = escapeHtml(opts.institut);
  const email = escapeHtml(opts.email);
  const phone = escapeHtml(opts.phone);
  const city = escapeHtml(opts.city);
  const address = escapeHtml(opts.address);
  const logo = escapeHtml(opts.logoName ? `Oui — ${opts.logoName}` : "Non");
  const message = escapeHtml(opts.message || "—");
  const websiteLabel = opts.noWebsite ? "Non" : opts.website?.trim() || "—";

  const subject = `Nouvelle inscription professionnelle — ${opts.institut}`;
  const rows: Array<[string, string]> = [
    ["Nom", opts.personName],
    ["Institut", opts.institut],
    ["E-mail", opts.email],
    ["WhatsApp", opts.phone],
    ["Ville", opts.city],
    ["Adresse", opts.address],
    ["Site web", websiteLabel],
    ["Précisions", opts.message || "—"],
    ["Logo", opts.logoName ? `Oui — ${opts.logoName}` : "Non"],
  ];

  const text = [
    `Nouvelle inscription sur ${SITE.name}.`,
    ``,
    ...rows.map(([label, value]) => `${label} : ${value}`),
    ``,
    `Répondez à cet e-mail pour écrire à ${opts.email}.`,
  ].join("\n");

  const htmlRows = [
    ["Nom", personName],
    ["Institut", institut],
    ["E-mail", email],
    ["WhatsApp", phone],
    ["Ville", city],
    ["Adresse", address],
    ["Site web", escapeHtml(websiteLabel)],
    ["Précisions", message],
    ["Logo", logo],
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
          <h1 style="margin:0 0 16px;font-size:22px;">Nouvelle inscription professionnelle</h1>
          <p style="margin:0 0 16px;line-height:1.5;">Un institut vient de remplir le formulaire /professionnel/.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;line-height:1.45;">${htmlRows}</table>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b635e;">Répondez à cet e-mail pour écrire directement à ${email}.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
