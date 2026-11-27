import { FileUp, Plus, RefreshCw, SearchX, ShieldAlert, Target } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { btnPrimary, btnSecondary } from "./prospect-styles";

/** Attribution ODbL obligatoire et rappel loi 09-08, toujours visibles sur la page. */
export function ProspectsLegalNote() {
  return (
    <footer className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-xs leading-relaxed text-slate-600 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-start sm:gap-6">
      <p className="shrink-0">
        Données ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#2F52B8] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]"
        >
          contributeurs OpenStreetMap
        </a>{" "}
        (ODbL)
      </p>
      <p className="flex items-start gap-1.5 text-slate-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Prospection : la loi 09-08 impose le consentement préalable pour les e-mails/WhatsApp commerciaux aux personnes
          physiques et un droit d&apos;opposition.
        </span>
      </p>
    </footer>
  );
}

/** Aucune fiche enregistrée : inviter à synchroniser OSM ou importer un CSV. */
export function ProspectsEmptyState({
  onSync,
  onImport,
  onCreate,
  syncing = false,
}: {
  onSync: () => void;
  onImport: () => void;
  onCreate: () => void;
  syncing?: boolean;
}) {
  return (
    <EmptyState
      icon={<Target size={22} aria-hidden />}
      title="Aucun prospect pour l'instant"
      description="Synchronisez OpenStreetMap pour récupérer les instituts et salons de beauté du Maroc, ou importez un fichier .xlsx / .csv ou une feuille Google Sheets. Vous pouvez aussi ajouter un prospect à la main."
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={btnPrimary} onClick={onSync} disabled={syncing}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Synchroniser OpenStreetMap
          </button>
          <button type="button" className={btnSecondary} onClick={onImport}>
            <FileUp className="h-4 w-4" aria-hidden />
            Importer un fichier
          </button>
          <button type="button" className={btnSecondary} onClick={onCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter un prospect
          </button>
        </div>
      }
    />
  );
}

/** Des fiches existent mais aucune ne correspond aux filtres. */
export function ProspectsNoResults({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      icon={<SearchX size={22} aria-hidden />}
      title="Aucun prospect ne correspond"
      description="Modifiez la recherche ou les filtres pour voir d'autres fiches."
      action={
        <button type="button" className={btnSecondary} onClick={onReset}>
          Réinitialiser les filtres
        </button>
      }
    />
  );
}

export function ProspectsErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-100 sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-3 font-semibold text-red-800 shadow-sm ring-1 ring-red-200 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Réessayer
      </button>
    </div>
  );
}

export function ProspectsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span className="sr-only">Chargement des prospects…</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
      ))}
    </div>
  );
}
