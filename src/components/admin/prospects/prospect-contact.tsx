import { ExternalLink, Globe, Mail, MapPinned, MessageCircle, Phone } from "lucide-react";
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  formatProspectPhone,
  mailtoHref,
  osmMapHref,
  safeWebsiteHref,
  telHref,
  websiteLabel,
  whatsappHref,
  type Prospect,
  type ProspectCategory,
  type ProspectStatus,
} from "@/lib/admin/prospects-client";
import { cn } from "@/lib/utils";

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

export const STATUS_TONE: Record<ProspectStatus, string> = {
  TO_CONTACT: "bg-slate-100 text-slate-700 ring-slate-200",
  CONTACTED: "bg-amber-50 text-amber-800 ring-amber-200",
  CUSTOMER: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  DECLINED: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function CategoryBadge({ category }: { category: ProspectCategory }) {
  return (
    <span className="inline-flex shrink-0 rounded-md bg-[#3B63D6]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2F52B8]">
      {CATEGORY_LABEL[category] ?? CATEGORY_LABEL.other}
    </span>
  );
}

export function StatusText({ status }: { status: ProspectStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Lien carte OpenStreetMap (coordonnées numériques valides uniquement). */
export function ProspectMapLink({ prospect, className }: { prospect: Prospect; className?: string }) {
  const href = osmMapHref(prospect.latitude, prospect.longitude);
  if (!href) return null;
  return (
    <a
      href={href}
      {...EXTERNAL}
      aria-label={`Voir ${prospect.name} sur la carte OpenStreetMap (nouvel onglet)`}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold text-[#2F52B8] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]",
        className,
      )}
    >
      <MapPinned className="h-3.5 w-3.5" aria-hidden />
      Voir sur la carte
    </a>
  );
}

const linkCls =
  "rounded-sm text-slate-800 hover:text-[#2F52B8] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]";

/** WhatsApp : ouvre seulement la conversation (aucun message prérempli). */
export function WhatsAppLink({ prospect, compact = false }: { prospect: Prospect; compact?: boolean }) {
  const href = whatsappHref(prospect.phone);
  if (!href) return null;
  return (
    <a
      href={href}
      {...EXTERNAL}
      aria-label={`Ouvrir la conversation WhatsApp avec ${prospect.name} (nouvel onglet)`}
      title="Ouvre la conversation WhatsApp, sans message prérempli"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
        compact ? "h-7 px-2 text-[11px]" : "h-11 px-3 text-sm",
      )}
    >
      <MessageCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      WhatsApp
    </a>
  );
}

/**
 * Coordonnées d'un prospect. Données issues d'OSM/CSV : seuls des liens tel:, mailto: et http(s) sûrs sont rendus,
 * le reste s'affiche en texte brut.
 */
export function ProspectContactLinks({ prospect, variant }: { prospect: Prospect; variant: "table" | "card" }) {
  const tel = telHref(prospect.phone);
  const mail = mailtoHref(prospect.email);
  const site = safeWebsiteHref(prospect.website);
  const card = variant === "card";
  const row = cn("flex min-w-0 items-center gap-2", card ? "min-h-11" : "min-h-7");
  const icon = "h-4 w-4 shrink-0 text-slate-400";

  if (!prospect.phone && !prospect.email && !prospect.website) {
    return <p className="text-xs text-slate-400">Aucune coordonnée</p>;
  }

  return (
    <ul className={cn("min-w-0", card ? "divide-y divide-slate-100" : "space-y-0.5")} aria-label={`Coordonnées de ${prospect.name}`}>
      {prospect.phone ? (
        <li className={cn(row, "justify-between")}>
          <span className="flex min-w-0 items-center gap-2">
            <Phone className={icon} aria-hidden />
            {tel ? (
              <a href={tel} className={cn(linkCls, "truncate font-mono text-[13px]")} aria-label={`Appeler ${prospect.name} au ${formatProspectPhone(prospect.phone)}`}>
                {formatProspectPhone(prospect.phone)}
              </a>
            ) : (
              <span className="truncate font-mono text-[13px] text-slate-600">{prospect.phone}</span>
            )}
          </span>
          <WhatsAppLink prospect={prospect} compact={!card} />
        </li>
      ) : null}
      {prospect.email ? (
        <li className={row}>
          <Mail className={icon} aria-hidden />
          {mail ? (
            <a href={mail} className={cn(linkCls, "truncate text-[13px]")} title={prospect.email}>
              {prospect.email}
            </a>
          ) : (
            <span className="truncate text-[13px] text-slate-600" title="Adresse e-mail non valide">
              {prospect.email}
            </span>
          )}
        </li>
      ) : null}
      {prospect.website ? (
        <li className={row}>
          <Globe className={icon} aria-hidden />
          {site ? (
            <a
              href={site}
              {...EXTERNAL}
              className={cn(linkCls, "inline-flex min-w-0 items-center gap-1 text-[13px]")}
              aria-label={`Site de ${prospect.name} : ${websiteLabel(site)} (nouvel onglet)`}
            >
              <span className="truncate">{websiteLabel(site)}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          ) : (
            <span className="truncate text-[13px] text-slate-600" title="Lien non valide">
              {prospect.website}
            </span>
          )}
        </li>
      ) : null}
    </ul>
  );
}
