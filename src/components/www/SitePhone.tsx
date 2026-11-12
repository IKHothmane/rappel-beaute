import { Phone } from "lucide-react";
import { SITE } from "@/lib/site";

export function SitePhone({
  className = "",
  iconClassName = "h-[var(--vt-size-1rem)] w-[var(--vt-size-1rem)] shrink-0",
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
      className={`inline-flex items-center gap-[var(--vt-size-0p5rem)] ${className}`}
    >
      <Phone className={iconClassName} aria-hidden />
      <span className={numberClassName}>{SITE.phone}</span>
    </a>
  );
}
