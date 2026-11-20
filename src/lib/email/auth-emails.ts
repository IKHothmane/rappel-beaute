import { SITE } from "@/lib/site";

/**
 * Modèles d'e-mails d'authentification : sobres, en français, sans image. Toute valeur variable (prénom, lien)
 * est échappée pour le HTML ; la version texte porte le même contenu.
 */
export type AuthEmail = { subject: string; text: string; html: string };

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const greeting = (name?: string | null) => {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  // Le nom est saisi librement : seul un prénom fait de lettres, apostrophes et traits d'union est repris.
  if (!/^[\p{L}\p{M}'’-]{1,60}$/u.test(first)) return "Bonjour,";
  return first ? `Bonjour ${first},` : "Bonjour,";
};

function layout(opts: { name?: string | null; intro: string; cta?: { label: string; href: string }; outro: string; ttl?: string }) {
  const hello = greeting(opts.name);
  const text = [
    hello,
    "",
    opts.intro,
    ...(opts.cta ? ["", `${opts.cta.label} :`, opts.cta.href, ...(opts.ttl ? ["", opts.ttl] : [])] : []),
    "",
    opts.outro,
    "",
    `L'équipe ${SITE.name}`,
    "",
  ].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;max-width:520px">
<p>${escapeHtml(hello)}</p>
<p>${escapeHtml(opts.intro)}</p>
${
  opts.cta
    ? `<p><a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px">${escapeHtml(opts.cta.label)}</a></p>
<p style="font-size:13px;color:#6b7280">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${escapeHtml(opts.cta.href)}">${escapeHtml(opts.cta.href)}</a></p>${
        opts.ttl ? `\n<p style="font-size:13px;color:#6b7280">${escapeHtml(opts.ttl)}</p>` : ""
      }`
    : ""
}
<p>${escapeHtml(opts.outro)}</p>
<p style="color:#6b7280">L'équipe ${escapeHtml(SITE.name)}</p>
</div>`;
  return { text, html };
}

/** Lien de vérification de l'adresse d'inscription (valable 24 h). */
export function signupVerificationEmail(opts: { name?: string | null; link: string }): AuthEmail {
  return {
    subject: `Confirmez votre adresse e-mail - ${SITE.name}`,
    ...layout({
      name: opts.name,
      intro: `Pour créer votre espace ${SITE.name}, confirmez votre adresse e-mail.`,
      cta: { label: "Confirmer mon adresse e-mail", href: opts.link },
      ttl: "Ce lien est valable 24 heures et ne peut être utilisé qu'une seule fois.",
      outro: "Si vous n'avez pas demandé cette inscription, ignorez simplement cet e-mail : aucun compte ne sera créé.",
    }),
  };
}

/** Envoyé quand quelqu'un tente de s'inscrire avec une adresse qui possède déjà un compte (rien n'est créé). */
export function alreadyHaveAccountEmail(opts: { loginLink: string; resetLink: string }): AuthEmail {
  return {
    subject: `Vous avez déjà un compte - ${SITE.name}`,
    ...layout({
      intro: `Une inscription a été demandée avec cette adresse, mais elle possède déjà un compte ${SITE.name}. Aucun nouveau compte n'a été créé.`,
      cta: { label: "Me connecter", href: opts.loginLink },
      outro: `Mot de passe oublié ? Vous pouvez en choisir un nouveau ici : ${opts.resetLink}. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    }),
  };
}

/** Lien envoyé à la NOUVELLE adresse d'un compte connecté (valable 24 h). */
export function emailChangeVerificationEmail(opts: { name?: string | null; link: string; sameAddress: boolean }): AuthEmail {
  return {
    subject: `Confirmez votre adresse e-mail - ${SITE.name}`,
    ...layout({
      name: opts.name,
      intro: opts.sameAddress
        ? `Confirmez que cette adresse est bien la vôtre pour sécuriser votre compte ${SITE.name}.`
        : `Confirmez que cette adresse sera désormais celle de votre compte ${SITE.name}.`,
      cta: { label: "Confirmer cette adresse", href: opts.link },
      ttl: "Ce lien est valable 24 heures et ne peut être utilisé qu'une seule fois. Vous resterez connecté(e) sur vos appareils.",
      outro: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre compte ne sera pas modifié.",
    }),
  };
}
