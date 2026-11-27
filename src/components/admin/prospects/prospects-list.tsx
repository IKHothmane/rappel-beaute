import { ChevronDown, ChevronLeft, ChevronRight, MapPin, NotebookPen } from "lucide-react";
import type { MouseEvent } from "react";
import {
  PROSPECT_STATUSES,
  SOURCE_LABEL,
  STATUS_LABEL,
  type Prospect,
  type ProspectStatus,
} from "@/lib/admin/prospects-client";
import { cn } from "@/lib/utils";
import { CategoryBadge, ProspectContactLinks, ProspectMapLink, STATUS_TONE } from "./prospect-contact";

type RowHandlers = {
  savingIds: ReadonlySet<string>;
  onStatusChange: (prospect: Prospect, status: ProspectStatus) => void;
  /** Le déclencheur reçoit le focus à la fermeture du panneau. */
  onOpenDetails: (prospect: Prospect, trigger: HTMLElement) => void;
};

export function ProspectStatusSelect({
  prospect,
  saving,
  onChange,
  className,
}: {
  prospect: Prospect;
  saving: boolean;
  onChange: (status: ProspectStatus) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {/* Jamais disabled pendant l'enregistrement : le focus resterait perdu au clavier (flèches sous Windows). */}
      <select
        value={prospect.status}
        aria-busy={saving || undefined}
        aria-label={`Statut de ${prospect.name}`}
        onChange={(e) => onChange(e.target.value as ProspectStatus)}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border-0 pl-3 pr-8 text-sm font-semibold outline-none ring-1 transition focus:ring-2 focus:ring-[#3B63D6] aria-busy:cursor-progress",
          STATUS_TONE[prospect.status],
        )}
      >
        {PROSPECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" aria-hidden />
    </div>
  );
}

function NotesButton({ prospect, onOpenDetails, full = false }: { prospect: Prospect; onOpenDetails: RowHandlers["onOpenDetails"]; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e: MouseEvent<HTMLButtonElement>) => onOpenDetails(prospect, e.currentTarget)}
      aria-label={`${prospect.notes ? "Modifier les notes" : "Ajouter une note"} : ${prospect.name}`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:text-[#2F52B8] hover:ring-[#3B63D6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]",
        full ? "h-11 px-4" : "h-9 px-3",
      )}
    >
      <NotebookPen className="h-4 w-4" aria-hidden />
      {prospect.notes ? "Notes" : "Ajouter"}
    </button>
  );
}

function Location({ prospect }: { prospect: Prospect }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-sm font-semibold text-slate-900">{prospect.city || "Ville inconnue"}</p>
      {prospect.address ? <p className="line-clamp-2 text-xs text-slate-500">{prospect.address}</p> : null}
      <ProspectMapLink prospect={prospect} />
    </div>
  );
}

/** Tableau (écrans larges, à partir de lg où la barre latérale apparaît). */
export function ProspectsTable({ items, savingIds, onStatusChange, onOpenDetails }: { items: Prospect[] } & RowHandlers) {
  return (
    <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <caption className="sr-only">Liste des prospects</caption>
          <thead>
            <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th scope="col" className="px-4 py-3">Prospect</th>
              <th scope="col" className="px-4 py-3">Localisation</th>
              <th scope="col" className="px-4 py-3">Contact</th>
              <th scope="col" className="w-44 px-4 py-3">Statut</th>
              <th scope="col" className="w-56 px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70">
                <th scope="row" className="max-w-[16rem] px-4 py-3 text-left font-normal">
                  <p className="font-bold text-slate-900 [overflow-wrap:anywhere]">{p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={p.category} />
                    <span className="text-[11px] text-slate-500">{SOURCE_LABEL[p.source] ?? p.source}</span>
                  </div>
                </th>
                <td className="max-w-[15rem] px-4 py-3">
                  <Location prospect={p} />
                </td>
                <td className="max-w-[18rem] px-4 py-3">
                  <ProspectContactLinks prospect={p} variant="table" />
                </td>
                <td className="px-4 py-3">
                  <ProspectStatusSelect prospect={p} saving={savingIds.has(p.id)} onChange={(s) => onStatusChange(p, s)} />
                </td>
                <td className="px-4 py-3">
                  {p.notes ? <p className="mb-1.5 line-clamp-2 whitespace-pre-line text-xs text-slate-600">{p.notes}</p> : null}
                  <NotesButton prospect={p} onOpenDetails={onOpenDetails} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Cartes (mobile et tablette). */
export function ProspectsCards({ items, savingIds, onStatusChange, onOpenDetails }: { items: Prospect[] } & RowHandlers) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:hidden" aria-label="Liste des prospects">
      {items.map((p) => (
        <li key={p.id} className="flex">
          <article className="flex w-full min-w-0 flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-base font-bold text-slate-900 [overflow-wrap:anywhere]">{p.name}</h3>
              <CategoryBadge category={p.category} />
            </div>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0">
                <span className="font-semibold text-slate-800">{p.city || "Ville inconnue"}</span>
                {p.address ? <span className="block text-xs text-slate-500">{p.address}</span> : null}
              </span>
            </p>
            <ProspectMapLink prospect={p} className="mt-1 min-h-9 self-start" />
            <div className="mt-2 border-t border-slate-100 pt-1">
              <ProspectContactLinks prospect={p} variant="card" />
            </div>
            {p.notes ? <p className="mt-2 line-clamp-3 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{p.notes}</p> : null}
            <div className="mt-auto flex items-center gap-2 pt-3">
              <ProspectStatusSelect
                prospect={p}
                saving={savingIds.has(p.id)}
                onChange={(s) => onStatusChange(p, s)}
                className="min-w-0 flex-1 [&_select]:h-11"
              />
              <NotesButton prospect={p} onOpenDetails={onOpenDetails} full />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Source : {SOURCE_LABEL[p.source] ?? p.source}</p>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function ProspectsPagination({
  page,
  pageSize,
  total,
  onPage,
  busy = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  /** Rechargement en cours : clics ignorés sans `disabled`, pour garder le focus clavier sur le bouton. */
  busy?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (total <= pageSize && page <= 1) return null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nf = new Intl.NumberFormat("fr-FR");
  const btn =
    "inline-flex h-11 items-center gap-1 rounded-xl bg-white px-3.5 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B63D6] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Pagination des prospects" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        <span className="font-bold text-slate-900">{nf.format(from)}</span>–<span className="font-bold text-slate-900">{nf.format(to)}</span> sur{" "}
        <span className="font-bold text-slate-900">{nf.format(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          disabled={page <= 1}
          aria-disabled={busy || undefined}
          onClick={() => !busy && onPage(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Précédent</span>
        </button>
        <span className="px-2 text-sm font-semibold text-slate-700">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className={btn}
          disabled={page >= totalPages}
          aria-disabled={busy || undefined}
          onClick={() => !busy && onPage(page + 1)}
          aria-label="Page suivante"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
