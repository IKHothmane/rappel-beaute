"use client";

import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import type { OsmSyncResult } from "@/lib/admin/prospects-client";
import { ProspectDialog } from "./prospect-dialog";
import { btnPrimary, btnSecondary } from "./prospect-styles";

export type OsmSyncState =
  | { phase: "confirm" }
  | { phase: "running" }
  | { phase: "done"; result: OsmSyncResult }
  | { phase: "error"; message: string };

const nf = new Intl.NumberFormat("fr-FR");

function duration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

/** Confirmation, attente (jusqu'à ~2 min) puis bilan de la synchronisation OpenStreetMap. */
export function ProspectsSyncDialog({
  state,
  onConfirm,
  onClose,
}: {
  state: OsmSyncState;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const running = state.phase === "running";

  return (
    <ProspectDialog
      alert={state.phase === "confirm"}
      title="Synchroniser OpenStreetMap"
      focusKey={state.phase}
      onClose={onClose}
      description={
        state.phase === "confirm"
          ? "Récupère depuis OpenStreetMap les salons de coiffure, barbiers, instituts, spas et ongleries du Maroc. Les fiches OSM déjà présentes sont mises à jour."
          : undefined
      }
      footer={
        state.phase === "confirm" ? (
          <>
            <button type="button" className={btnSecondary} onClick={onClose}>
              Annuler
            </button>
            <button type="button" className={btnPrimary} onClick={onConfirm} data-autofocus>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Lancer la synchronisation
            </button>
          </>
        ) : state.phase === "error" ? (
          <>
            <button type="button" className={btnSecondary} onClick={onClose}>
              Fermer
            </button>
            <button type="button" className={btnPrimary} onClick={onConfirm} data-autofocus>
              Réessayer
            </button>
          </>
        ) : state.phase === "done" ? (
          <button type="button" className={btnPrimary} onClick={onClose} data-autofocus>
            Fermer
          </button>
        ) : (
          <button type="button" className={btnSecondary} onClick={onClose} data-autofocus>
            Continuer en arrière-plan
          </button>
        )
      }
    >
      <div aria-live="polite">
        {state.phase === "confirm" ? (
          <p className="text-sm text-slate-600">
            L&apos;opération interroge le service public Overpass et peut durer jusqu&apos;à 2 minutes.
          </p>
        ) : null}
        {running ? (
          <p role="status" className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#3B63D6] motion-reduce:animate-none" aria-hidden />
            Synchronisation en cours… cela peut prendre jusqu&apos;à 2 minutes.
          </p>
        ) : null}
        {running ? (
          <p className="mt-2 text-xs text-slate-500">
            Vous pouvez fermer cette fenêtre : le bilan s&apos;affichera sur la page. Ne rechargez pas la page avant la fin.
          </p>
        ) : null}
        {state.phase === "done" ? (
          <div role="status" className="space-y-2 text-sm text-slate-700">
            <p className="flex items-center gap-2 font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              Synchronisation terminée
            </p>
            <ul className="grid grid-cols-3 gap-2 text-center">
              <li className="rounded-xl bg-emerald-50 p-3">
                <span className="block text-xl font-bold tabular-nums text-emerald-800">{nf.format(state.result.inserted)}</span>
                <span className="text-xs text-emerald-800">insérés</span>
              </li>
              <li className="rounded-xl bg-[#3B63D6]/10 p-3">
                <span className="block text-xl font-bold tabular-nums text-[#2F52B8]">{nf.format(state.result.updated)}</span>
                <span className="text-xs text-[#2F52B8]">mis à jour</span>
              </li>
              <li className="rounded-xl bg-slate-100 p-3">
                <span className="block text-xl font-bold tabular-nums text-slate-800">{nf.format(state.result.total)}</span>
                <span className="text-xs text-slate-600">au total</span>
              </li>
            </ul>
            {duration(state.result.durationMs) ? (
              <p className="text-xs text-slate-500">Durée : {duration(state.result.durationMs)}</p>
            ) : null}
          </div>
        ) : null}
        {state.phase === "error" ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
            {state.message}
          </p>
        ) : null}
      </div>
    </ProspectDialog>
  );
}
