type WebsiteQuote = {
  project: string;
  name: string;
  institute: string;
  email: string;
  phone: string;
  message: string;
};

/** Prepare a draft only; the visitor reviews and sends it in their email application. */
export function websiteQuoteHref(recipient: string, quote: WebsiteQuote): string {
  const body = [
    "Demande de devis — création de site web",
    `Type de site : ${quote.project}`,
    `Nom : ${quote.name.trim()}`,
    `Institut : ${quote.institute.trim()}`,
    `E-mail : ${quote.email.trim()}`,
    `Téléphone : ${quote.phone.trim()}`,
    "",
    quote.message.trim(),
  ].join("\n");
  return `mailto:${recipient}?subject=${encodeURIComponent(`Création de site web — ${quote.project}`)}&body=${encodeURIComponent(body)}`;
}
