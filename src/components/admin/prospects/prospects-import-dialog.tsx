"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, FileUp, Link2, Loader2 } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  PROSPECT_IMPORT_MAX_BYTES,
  importFileExtension,
  importProspectsFile,
  importProspectsSheet,
  isGoogleSheetUrl,
  readFileAsBase64,
  type ProspectImportResult,
} from "@/lib/admin/prospects-client";
import { cn } from "@/lib/utils";
import { ProspectDialog } from "./prospect-dialog";
import { btnPrimary, btnSecondary, fieldCls } from "./prospect-styles";

const MAX_LISTED_ERRORS = 50;
const nf = new Intl.NumberFormat("fr-FR");

type Tab = "file" | "sheet";
const TABS: { id: Tab; label: string; icon: typeof FileUp }[] = [
  { id: "file", label: "Fichier .xlsx ou .csv", icon: FileUp },
  { id: "sheet", label: "Lien Google Sheets", icon: Link2 },
];

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-[#2F52B8] hover:underline">
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden />
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  );
}

export function ImportReport({ result }: { result: ProspectImportResult }) {
  const errors = Array.isArray(result.errors) ? result.errors : [];
  const listed = errors.slice(0, MAX_LISTED_ERRORS);
  const tiles = [
    { label: "insérés", value: result.inserted, cls: "bg-emerald-50 text-emerald-800" },
    { label: "mis à jour", value: result.updated, cls: "bg-[#3B63D6]/10 text-[#2F52B8]" },
    ...(typeof result.unchanged === "number" ? [{ label: "inchangés", value: result.unchanged, cls: "bg-slate-100 text-slate-700" }] : []),
    { label: "ignorés", value: result.skipped, cls: "bg-amber-50 text-amber-800" },
  ];
  return (
    <div role="status" className="space-y-3 text-sm text-slate-700">
      <p className="flex items-center gap-2 font-semibold text-emerald-800">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
        Import terminé
      </p>
      <ul className={cn("grid grid-cols-2 gap-2 text-center", tiles.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
        {tiles.map((t) => (
          <li key={t.label} className={cn("rounded-xl p-3", t.cls)}>
            <span className="block text-xl font-bold tabular-nums">{nf.format(t.value ?? 0)}</span>
            <span className="text-xs">{t.label}</span>
          </li>
        ))}
      </ul>
      {errors.length > 0 ? (
        <div>
          <p className="font-semibold text-red-800">
            {nf.format(errors.length)} ligne{errors.length > 1 ? "s" : ""} en erreur
          </p>
          <ul className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-xl bg-red-50 p-3 text-xs text-red-900 ring-1 ring-red-100">
            {listed.map((e, i) => (
              <li key={`${e.line}-${i}`}>
                <span className="font-mono font-semibold">Ligne {e.line}</span> : {e.error}
              </li>
            ))}
            {errors.length > listed.length ? (
              <li className="font-semibold">et {nf.format(errors.length - listed.length)} autre(s) ligne(s)…</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Import : fichier .xlsx/.csv (envoyé en base64) ou lien Google Sheets partagé, avec rapport par ligne. */
export function ProspectsImportDialog({
  onClose,
  onImported,
  initialTab = "file",
}: {
  onClose: () => void;
  onImported: (result: ProspectImportResult) => void;
  initialTab?: Tab;
}) {
  const uid = useId();
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ file: null, sheet: null });
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProspectImportResult | null>(null);
  const ids = {
    tab: (t: Tab) => `${uid}-tab-${t}`,
    panel: (t: Tab) => `${uid}-panel-${t}`,
    file: `${uid}-file`,
    url: `${uid}-url`,
    error: `${uid}-error`,
    fileHint: `${uid}-file-hint`,
    urlHint: `${uid}-url-hint`,
  };

  function selectTab(next: Tab, focus = false) {
    if (busy) return;
    setTab(next);
    setError(null);
    if (focus) tabRefs.current[next]?.focus();
  }

  // Onglets ARIA : flèches gauche/droite, Début/Fin ; un seul onglet dans l'ordre de tabulation.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const order = TABS.map((t) => t.id);
    const i = order.indexOf(tab);
    let next: Tab | null = null;
    if (e.key === "ArrowRight") next = order[(i + 1) % order.length];
    else if (e.key === "ArrowLeft") next = order[(i - 1 + order.length) % order.length];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[order.length - 1];
    if (next) {
      e.preventDefault();
      selectTab(next, true);
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setResult(null);
    setError(null);
    setFile(null);
    if (!next) return;
    const reject = (message: string) => {
      setError(message);
      e.target.value = "";
    };
    if (!importFileExtension(next.name)) return reject("Choisissez un fichier .xlsx ou .csv.");
    if (next.size === 0) return reject("Ce fichier est vide.");
    if (next.size > PROSPECT_IMPORT_MAX_BYTES) return reject(`Fichier trop volumineux (${formatSize(next.size)}). La limite est de 2 Mo.`);
    setFile(next);
  }

  async function run(task: () => Promise<ProspectImportResult>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await task();
      setResult(res);
      onImported(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function submit() {
    if (tab === "file") {
      if (!file) {
        setError("Sélectionnez d'abord un fichier .xlsx ou .csv.");
        fileRef.current?.focus();
        return;
      }
      const selected = file;
      void run(async () => {
        const res = await importProspectsFile({ filename: selected.name, contentBase64: await readFileAsBase64(selected) });
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        return res;
      });
      return;
    }
    if (!isGoogleSheetUrl(url)) {
      setError("Collez le lien complet de la feuille (https://docs.google.com/spreadsheets/d/…).");
      document.getElementById(ids.url)?.focus();
      return;
    }
    void run(() => importProspectsSheet(url));
  }

  const describedBy = (hint: string) => (error ? `${hint} ${ids.error}` : hint);

  return (
    <ProspectDialog
      title="Importer des prospects"
      busy={busy}
      onClose={onClose}
      focusKey={result ? "done" : "form"}
      description="Ajoute les nouvelles fiches et met à jour celles qui existent déjà grâce à la colonne « id ». Une cellule vide n'efface jamais une valeur."
      footer={
        result ? (
          <>
            <button type="button" className={btnSecondary} onClick={() => setResult(null)}>
              Importer autre chose
            </button>
            <button type="button" className={btnPrimary} onClick={onClose} data-autofocus>
              Fermer
            </button>
          </>
        ) : (
          <>
            <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
              Annuler
            </button>
            <button type="button" className={btnPrimary} onClick={submit} disabled={busy || (tab === "file" ? !file : !url.trim())}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />}
              {busy ? "Import en cours…" : tab === "file" ? "Importer le fichier" : "Importer la feuille"}
            </button>
          </>
        )
      }
    >
      {result ? (
        <ImportReport result={result} />
      ) : (
        <div className="space-y-4">
          <div role="tablist" aria-label="Source de l'import" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  id={ids.tab(t.id)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={ids.panel(t.id)}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(t.id)}
                  onKeyDown={onTabKeyDown}
                  data-autofocus={selected ? true : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B63D6]",
                    selected ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={ids.panel("file")} aria-labelledby={ids.tab("file")} hidden={tab !== "file"} className="space-y-3">
            <div>
              <label htmlFor={ids.file} className="mb-1 block text-sm font-semibold text-slate-800">
                Fichier .xlsx ou .csv (2 Mo maximum)
              </label>
              <input
                ref={fileRef}
                id={ids.file}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={onFile}
                disabled={busy}
                aria-describedby={describedBy(ids.fileHint)}
                aria-invalid={error && tab === "file" ? true : undefined}
                className="block w-full rounded-xl text-sm text-slate-700 ring-1 ring-slate-200 file:mr-3 file:h-11 file:cursor-pointer file:rounded-l-xl file:border-0 file:bg-[#3B63D6]/10 file:px-4 file:text-sm file:font-semibold file:text-[#2F52B8] hover:file:bg-[#3B63D6]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]"
              />
              {file ? (
                <p className="mt-1 text-xs text-slate-500">
                  {file.name} · {formatSize(file.size)}
                </p>
              ) : null}
            </div>
            <div id={ids.fileHint} className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-800">Modifier la liste dans Google Sheets (recommandé)</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                <li>Téléchargez la liste : « Télécharger » → « Google Sheets / Excel (.xlsx) ».</li>
                <li>
                  Ouvrez <ExtLink href="https://drive.google.com">drive.google.com</ExtLink> → Nouveau → Importer le fichier (ou{" "}
                  <ExtLink href="https://sheets.new">sheets.new</ExtLink> → Fichier → Importer).
                </li>
                <li>Modifiez la feuille. Gardez la colonne « id » pour mettre à jour les fiches existantes.</li>
                <li>Fichier → Télécharger → Microsoft Excel (.xlsx), puis importez ce fichier ici.</li>
              </ol>
            </div>
          </div>

          <div role="tabpanel" id={ids.panel("sheet")} aria-labelledby={ids.tab("sheet")} hidden={tab !== "sheet"} className="space-y-3">
            <div>
              <label htmlFor={ids.url} className="mb-1 block text-sm font-semibold text-slate-800">
                Lien de la feuille Google Sheets
              </label>
              <input
                id={ids.url}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                disabled={busy}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                aria-describedby={describedBy(ids.urlHint)}
                aria-invalid={error && tab === "sheet" ? true : undefined}
                className={fieldCls}
              />
            </div>
            <div id={ids.urlHint} className="space-y-2 text-xs leading-relaxed text-slate-600">
              <p>
                Dans Google Sheets : Partager → Accès général → « Toute personne disposant du lien » → Lecteur, puis copiez le lien.
              </p>
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Attention : toute personne qui a le lien peut alors voir les coordonnées des instituts. Retirez le partage juste après
                  l&apos;import, ou préférez l&apos;envoi de fichier (recommandé).
                </span>
              </p>
            </div>
          </div>

          {busy ? (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin text-[#3B63D6] motion-reduce:animate-none" aria-hidden />
              {tab === "file" ? "Lecture et envoi du fichier…" : "Lecture de la feuille Google Sheets…"}
            </p>
          ) : null}
          {error ? (
            <p id={ids.error} role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </ProspectDialog>
  );
}
