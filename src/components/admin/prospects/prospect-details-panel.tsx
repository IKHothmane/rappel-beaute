"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import {
  CATEGORY_LABEL,
  PROSPECT_STATUSES,
  SOURCE_LABEL,
  STATUS_LABEL,
  formatDateTime,
  osmObjectHref,
  updateProspect,
  type Prospect,
  type ProspectStatus,
} from "@/lib/admin/prospects-client";
import { CategoryBadge, ProspectContactLinks, ProspectMapLink } from "./prospect-contact";
import { btnPrimary, btnSecondary, fieldCls } from "./prospect-styles";

export const PROSPECT_NOTES_MAX = 2000;

/** Panneau latéral : fiche, statut et notes éditables d'un prospect. */
export function ProspectDetailsPanel({
  open,
  prospect,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Conservé pendant l'animation de fermeture. */
  prospect: Prospect | null;
  onClose: () => void;
  onSaved: (previous: Prospect, item: Prospect) => void;
}) {
  return (
    <PremiumSidePanel
      open={open && Boolean(prospect)}
      onClose={onClose}
      title={prospect?.name ?? "Prospect"}
      description={prospect ? [CATEGORY_LABEL[prospect.category], prospect.city].filter(Boolean).join(" · ") : undefined}
      size="md"
      // Pleine largeur sur téléphone : 100vw seul ne couvre que 80 % de l'écran sous html { zoom: 0.8 }.
      className="max-sm:w-[calc(100vw/0.8)]"
    >
      {prospect ? <DetailsForm key={prospect.id} prospect={prospect} onClose={onClose} onSaved={onSaved} /> : null}
    </PremiumSidePanel>
  );
}

function DetailsForm({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: Prospect;
  onClose: () => void;
  onSaved: (previous: Prospect, item: Prospect) => void;
}) {
  const statusId = useId();
  const notesId = useId();
  const countId = useId();
  const errorId = useId();
  const [status, setStatus] = useState<ProspectStatus>(prospect.status);
  const [notes, setNotes] = useState(prospect.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const osmHref = prospect.source === "OSM" ? osmObjectHref(prospect.sourceRef) : null;
  const dirty = status !== prospect.status || notes.trim() !== (prospect.notes ?? "").trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (savingRef.current || !dirty) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const patch: { status?: ProspectStatus; notes?: string | null } = {};
      if (status !== prospect.status) patch.status = status;
      if (notes.trim() !== (prospect.notes ?? "").trim()) patch.notes = notes.trim() ? notes.trim() : null;
      const { item } = await updateProspect(prospect.id, patch);
      onSaved(prospect, item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-busy={saving || undefined}>
      <section aria-label="Fiche" className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={prospect.category} />
          <span className="text-xs text-slate-500">Source : {SOURCE_LABEL[prospect.source] ?? prospect.source}</span>
          {osmHref ? (
            <a
              href={osmHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F52B8] hover:underline"
            >
              Fiche OSM
              <ExternalLink className="h-3 w-3" aria-hidden />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          ) : null}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{prospect.city || "Ville inconnue"}</p>
          {prospect.address ? <p className="text-slate-600">{prospect.address}</p> : null}
          <ProspectMapLink prospect={prospect} className="mt-1" />
        </div>
        <ProspectContactLinks prospect={prospect} variant="card" />
        <p className="text-xs text-slate-500">
          Ajouté le {formatDateTime(prospect.createdAt)} · modifié le {formatDateTime(prospect.updatedAt)}
        </p>
      </section>

      <div>
        <label htmlFor={statusId} className="mb-1.5 block text-sm font-semibold text-slate-800">
          Statut
        </label>
        <select
          id={statusId}
          value={status}
          onChange={(e) => setStatus(e.target.value as ProspectStatus)}
          disabled={saving}
          className={fieldCls}
        >
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={notesId} className="mb-1.5 block text-sm font-semibold text-slate-800">
          Notes
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={PROSPECT_NOTES_MAX}
          rows={6}
          disabled={saving}
          autoFocus
          placeholder="Ex. : rappeler la gérante mardi, intéressée par les rappels WhatsApp…"
          aria-describedby={error ? `${countId} ${errorId}` : countId}
          className="min-h-[140px] w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[#3B63D6]/40"
        />
        <p id={countId} className="mt-1 text-right text-xs text-slate-500">
          {notes.length} / {PROSPECT_NOTES_MAX}
        </p>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
          Fermer
        </button>
        <button type="submit" className={btnPrimary} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
