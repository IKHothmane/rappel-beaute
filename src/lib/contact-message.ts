import { SITE } from "@/lib/site";

type ContactMessage = { name: string; email: string; phone: string; institute: string; subject: string; message: string };

export function contactEmailHref(data: ContactMessage): string {
  const details = [
    `Nom : ${data.name.trim()}`,
    `E-mail : ${data.email.trim()}`,
    data.phone.trim() ? `Téléphone : ${data.phone.trim()}` : "",
    data.institute.trim() ? `Institut : ${data.institute.trim()}` : "",
  ].filter(Boolean).join("\n");
  const body = `${details}\n\n${data.message.trim()}`;
  return `mailto:${SITE.email}?subject=${encodeURIComponent(data.subject.trim())}&body=${encodeURIComponent(body)}`;
}
