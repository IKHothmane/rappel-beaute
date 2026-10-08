import { Phone } from "lucide-react";
import { SITE } from "@/lib/site";

export function SitePhone({
  className = "",
  iconClassName = "h-4 w-4 shrink-0",
  numberClassName = "",
}: {
  className?: string;
  iconClassName?: string;
  numberClassName?: string;
}) {
  const whatsapp = SITE.phoneInternational.replace(/\D/g, "");

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <Phone className={iconClassName} aria-hidden />
      <span className={numberClassName}>{SITE.phone}</span>
    </a>
  );
}
