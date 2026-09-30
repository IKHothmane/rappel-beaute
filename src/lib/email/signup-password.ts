import { SITE } from "@/lib/site";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function signupPasswordEmail(opts: {
  firstName: string;
  institut: string;
  email: string;
  password: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const firstName = escapeHtml(opts.firstName);
  const institut = escapeHtml(opts.institut);
  const email = escapeHtml(opts.email);
  const password = escapeHtml(opts.password);
  const loginUrl = escapeHtml(opts.loginUrl);

  const subject = `Votre mot de passe ${SITE.name}`;

  const text = [
    `Bonjour ${opts.firstName},`,
    ``,
    `Votre institut « ${opts.institut} » est prêt.`,
    `Connectez-vous avec :`,
    `E-mail : ${opts.email}`,
    `Mot de passe temporaire (6 chiffres) : ${opts.password}`,
    ``,
    `Lien de connexion : ${opts.loginUrl}`,
    `Vous serez invité(e) à changer ce mot de passe à la première connexion.`,
    ``,
    `— L'équipe ${SITE.name}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f7f4f1;font-family:Georgia,serif;color:#1f1a17;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b0894d;">${escapeHtml(SITE.name)}</p>
          <h1 style="margin:0 0 16px;font-size:22px;">Votre accès est prêt</h1>
          <p style="margin:0 0 16px;line-height:1.5;">Bonjour ${firstName}, le compte de <strong>${institut}</strong> a été créé.</p>
          <p style="margin:0 0 8px;line-height:1.5;">Identifiant : <strong>${email}</strong></p>
          <p style="margin:0 0 20px;line-height:1.5;">Mot de passe temporaire (6 chiffres) : <strong style="font-family:Consolas,monospace;letter-spacing:.2em;font-size:20px;">${password}</strong></p>
          <p style="margin:0 0 24px;">
            <a href="${loginUrl}" style="display:inline-block;background:#8b3a4a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Se connecter</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6b635e;">À la première connexion, vous changerez ce mot de passe. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
