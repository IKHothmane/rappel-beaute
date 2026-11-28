"use client";

import { FileUp, Loader2, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_PROSPECT_FILTERS,
  PROSPECT_PAGE_SIZE,
  STATUS_LABEL,
  fetchProspects,
  formatDateTime,
  isFiltering,
  syncProspectsFromOsm,
  updateProspect,
  type Prospect,
  type ProspectFilters,
  type ProspectListResponse,
  type ProspectStatus,
} from "@/lib/admin/prospects-client";
import { cn } from "@/lib/utils";
import { ProspectCreatePanel } from "./prospect-create-panel";
import { ProspectDetailsPanel } from "./prospect-details-panel";
import { btnPrimary, btnSecondary } from "./prospect-styles";
import { ProspectsFilters } from "./prospects-filters";
import { ProspectsDownloadMenu } from "./prospects-download-menu";
import { ProspectsImportDialog } from "./prospects-import-dialog";
import { ProspectsCards, ProspectsPagination, ProspectsTable } from "./prospects-list";
import {
  ProspectsEmptyState,
  ProspectsErrorBanner,
  ProspectsLegalNote,
  ProspectsNoResults,
  ProspectsSkeleton,
} from "./prospects-states";
import { ProspectsStats } from "./prospects-stats";
import { ProspectsSyncDialog, type OsmSyncState } from "./prospects-sync-dialog";

type Notice = { tone: "success" | "error"; text: string };
const SEARCH_DEBOUNCE_MS = 300;
/** Au clavier (flèches sous Windows), chaque valeur traversée déclenche `change` : on n'envoie que la dernière. */
const STATUS_DEBOUNCE_MS = 400;
const nf = new Intl.NumberFormat("fr-FR");

/** Remplace une fiche de la page affichée et déplace son compte de statut. */
function applyItem(data: ProspectListResponse | null, item: Prospect): ProspectListResponse | null {
  const current = data?.items.find((p) => p.id === item.id);
  if (!data || !current) return data;
  const byStatus = { ...data.stats.byStatus };
  if (current.status !== item.status) {
    byStatus[current.status] = Math.max(0, (byStatus[current.status] ?? 0) - 1);
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
  }
  return {
    ...data,
    items: data.items.map((p) => (p.id === item.id ? item : p)),
    stats: { ...data.stats, byStatus },
  };
}

/** `initialData` : première page déjà chargée (rendu serveur, tests) ; la liste est quand même rechargée au montage. */
export function AdminProspectsView({ initialData = null }: { initialData?: ProspectListResponse | null } = {}) {
  const [filters, setFilters] = useState<ProspectFilters>(EMPTY_PROSPECT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<ProspectListResponse | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(new Set());
  const [details, setDetails] = useState<Prospect | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sync, setSync] = useState<OsmSyncState | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const syncingRef = useRef(false);
  const syncDialogOpenRef = useRef(false);
  syncDialogOpenRef.current = syncDialogOpen;
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  // Statuts : dernière valeur demandée, fiche confirmée par le serveur, envois en cours et minuteries par fiche.
  const pendingStatusRef = useRef(new Map<string, ProspectStatus>());
  const confirmedRef = useRef(new Map<string, Prospect>());
  const inflightRef = useRef(new Set<string>());
  const statusTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = statusTimersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Recherche différée : une requête par pause de frappe.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (filtersRef.current.search === searchInput) return;
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true);
    fetchProspects(filters, page, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil((res.total ?? 0) / Math.max(1, res.pageSize || PROSPECT_PAGE_SIZE)));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setData(res);
        setError(null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Chargement impossible.");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => controller.abort();
  }, [filters, page, reloadKey]);

  // Tout changement de filtre revient à la page 1 (même lot de rendu : une seule requête).
  const updateFilters = useCallback((patch: Partial<ProspectFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setFilters(EMPTY_PROSPECT_FILTERS);
    setPage(1);
  }, []);

  const goToPage = useCallback((next: number) => {
    setPage(next);
    listTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  function setSaving(id: string, saving: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Envoie la dernière valeur demandée pour une fiche, une requête à la fois. */
  async function flushStatus(id: string) {
    if (inflightRef.current.has(id)) return;
    inflightRef.current.add(id);
    setSaving(id, true);
    try {
      let status = pendingStatusRef.current.get(id);
      while (status) {
        pendingStatusRef.current.delete(id);
        const base = confirmedRef.current.get(id);
        if (base && base.status !== status) {
          try {
            const { item } = await updateProspect(id, { status });
            confirmedRef.current.set(id, item);
            setAnnouncement(`${item.name} : statut « ${STATUS_LABEL[item.status]} » enregistré.`);
          } catch (e) {
            setNotice({
              tone: "error",
              text: `Statut non enregistré pour ${base.name} : ${e instanceof Error ? e.message : "erreur inconnue."}`,
            });
          }
        }
        status = pendingStatusRef.current.get(id);
      }
      // Plus rien en attente : la ligne reflète l'état confirmé (ou revient à l'ancien statut après une erreur).
      const confirmed = confirmedRef.current.get(id);
      if (confirmed && !statusTimersRef.current.has(id)) {
        setData((d) => applyItem(d, confirmed));
        confirmedRef.current.delete(id);
      }
    } finally {
      inflightRef.current.delete(id);
      setSaving(id, false);
    }
  }

  function changeStatus(prospect: Prospect, status: ProspectStatus) {
    if (prospect.status === status && !pendingStatusRef.current.has(prospect.id)) return;
    if (!confirmedRef.current.has(prospect.id)) confirmedRef.current.set(prospect.id, prospect);
    setData((d) => applyItem(d, { ...prospect, status }));
    pendingStatusRef.current.set(prospect.id, status);
    setSaving(prospect.id, true);
    const timers = statusTimersRef.current;
    window.clearTimeout(timers.get(prospect.id));
    timers.set(
      prospect.id,
      window.setTimeout(() => {
        timers.delete(prospect.id);
        if (inflightRef.current.has(prospect.id)) return; // la boucle en cours enverra la dernière valeur
        void flushStatus(prospect.id);
      }, STATUS_DEBOUNCE_MS),
    );
  }

  function restoreFocus() {
    const el = returnFocusRef.current;
    returnFocusRef.current = null;
    window.setTimeout(() => {
      if (el?.isConnected) el.focus();
    }, 0);
  }

  function openDetails(prospect: Prospect, trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setDetails(prospect);
    setDetailsOpen(true);
  }

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    restoreFocus();
  }, []);

  function openSync(trigger?: HTMLElement) {
    returnFocusRef.current = trigger ?? null;
    if (!syncingRef.current) setSync({ phase: "confirm" });
    setSyncDialogOpen(true);
  }

  function closeSync() {
    setSyncDialogOpen(false);
    // Une synchronisation terminée ou échouée est oubliée ; en cours, elle continue en arrière-plan.
    if (!syncingRef.current) setSync(null);
    restoreFocus();
  }

  function openCreate(e: { currentTarget: HTMLElement }) {
    returnFocusRef.current = e.currentTarget;
    setCreateOpen(true);
  }

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    restoreFocus();
  }, []);

  async function runSync() {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSync({ phase: "running" });
    try {
      const result = await syncProspectsFromOsm();
      setSync({ phase: "done", result });
      if (!syncDialogOpenRef.current) {
        setNotice({
          tone: "success",
          text: `Synchronisation OpenStreetMap terminée : ${nf.format(result.inserted)} insérés, ${nf.format(result.updated)} mis à jour.`,
        });
      }
      reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Synchronisation impossible.";
      setSync({ phase: "error", message });
      if (!syncDialogOpenRef.current) setNotice({ tone: "error", text: `Synchronisation OpenStreetMap : ${message}` });
    } finally {
      syncingRef.current = false;
    }
  }

  const syncing = sync?.phase === "running";
  const filtering = isFiltering(filters) || searchInput.trim() !== "";
  const items = data?.items ?? [];
  const nothingYet = Boolean(data) && data!.stats.total === 0 && !filtering;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / Math.max(1, data.pageSize || PROSPECT_PAGE_SIZE))) : 1;

  const actions = (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end xl:shrink-0 xl:flex-nowrap">
      <button
        type="button"
        className={cn(btnPrimary, "col-span-2 sm:col-span-1")}
        onClick={(e) => openSync(e.currentTarget)}
        aria-busy={syncing || undefined}
      >
        {syncing ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        {syncing ? "Synchronisation…" : "Synchroniser OpenStreetMap"}
      </button>
      <button
        type="button"
        className={btnSecondary}
        onClick={(e) => {
          returnFocusRef.current = e.currentTarget;
          setImportOpen(true);
        }}
      >
        <FileUp className="h-4 w-4 text-[#3B63D6]" aria-hidden />
        Importer
      </button>
      <button type="button" className={btnSecondary} onClick={openCreate}>
        <Plus className="h-4 w-4 text-[#3B63D6]" aria-hidden />
        Ajouter un prospect
      </button>
      <ProspectsDownloadMenu
        filters={filters}
        filtering={filtering}
        disabled={!data?.total}
        className="col-span-2 sm:col-span-1"
        onDownloaded={(filename) => setAnnouncement(`Fichier ${filename} téléchargé.`)}
        onError={(message) => setNotice({ tone: "error", text: `Téléchargement impossible : ${message}` })}
      />
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-[1400px] space-y-5">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 xl:flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Prospects</h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-500">
              Instituts et salons de beauté du Maroc à démarcher : importés d&apos;OpenStreetMap, d&apos;un CSV ou ajoutés à la main.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Dernière synchronisation OpenStreetMap :{" "}
              <span className="font-semibold text-slate-700">{data?.lastSyncedAt ? formatDateTime(data.lastSyncedAt) : data ? "jamais" : "—"}</span>
            </p>
          </div>
          {actions}
        </header>

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {/* Bilans des actions (ajout, import, synchronisation) et erreurs d'enregistrement. */}
        <div aria-live="polite" className="empty:hidden">
          {notice ? (
            <div
              role={notice.tone === "error" ? "alert" : "status"}
              className={cn(
                "flex items-start justify-between gap-3 rounded-2xl p-3 text-sm ring-1",
                notice.tone === "error" ? "bg-red-50 text-red-800 ring-red-100" : "bg-emerald-50 text-emerald-800 ring-emerald-100",
              )}
            >
              <span>{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="shrink-0 rounded-md px-2 text-xs font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
              >
                Masquer
              </button>
            </div>
          ) : null}
        </div>

        {data && !nothingYet ? (
          <ProspectsStats
            stats={data.stats}
            activeHas={filters.has}
            activeStatus={filters.status}
            onHas={(has) => updateFilters({ has })}
            onStatus={(status) => updateFilters({ status })}
          />
        ) : null}

        {!nothingYet ? (
          <ProspectsFilters
            searchInput={searchInput}
            onSearchInput={setSearchInput}
            filters={filters}
            cities={data?.cities ?? []}
            onChange={updateFilters}
            onReset={resetFilters}
            canReset={filtering}
          />
        ) : null}

        {error ? <ProspectsErrorBanner message={error} onRetry={reload} /> : null}

        <div ref={listTopRef} className="scroll-mt-24 space-y-3">
          {data && !nothingYet ? (
            <p className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
              <span>
                <span className="font-bold text-slate-900">{nf.format(data.total)}</span> prospect{data.total > 1 ? "s" : ""}
                {filtering ? " correspondant aux filtres" : ""}
                {totalPages > 1 ? ` · page ${page} / ${totalPages}` : ""}
              </span>
              {refreshing ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                  Mise à jour…
                </span>
              ) : null}
            </p>
          ) : null}

          {loading && !data ? (
            <ProspectsSkeleton />
          ) : nothingYet ? (
            <ProspectsEmptyState
              syncing={syncing}
              onSync={() => openSync()}
              onImport={() => setImportOpen(true)}
              onCreate={() => setCreateOpen(true)}
            />
          ) : data && items.length === 0 ? (
            <ProspectsNoResults onReset={resetFilters} />
          ) : data ? (
            <div className={cn("space-y-4 transition-opacity", refreshing && "opacity-70")}>
              <ProspectsTable items={items} savingIds={savingIds} onStatusChange={changeStatus} onOpenDetails={openDetails} />
              <ProspectsCards items={items} savingIds={savingIds} onStatusChange={changeStatus} onOpenDetails={openDetails} />
              <ProspectsPagination page={page} pageSize={data.pageSize || PROSPECT_PAGE_SIZE} total={data.total} onPage={goToPage} busy={refreshing} />
            </div>
          ) : null}
        </div>

        <ProspectsLegalNote />
      </div>

      {/* Hors du conteneur space-y : sinon la marge haute décale les overlays fixed (bug visible à 390 px). */}

      <ProspectDetailsPanel
        open={detailsOpen}
        prospect={details}
        onClose={closeDetails}
        onSaved={(_previous, item) => {
          setData((d) => applyItem(d, item));
          setNotice({ tone: "success", text: `Fiche « ${item.name} » enregistrée.` });
          closeDetails();
        }}
      />

      <ProspectCreatePanel
        open={createOpen}
        onClose={closeCreate}
        onCreated={(item) => {
          setNotice({ tone: "success", text: `Prospect « ${item.name} » ajouté.` });
          closeCreate();
          reload();
        }}
      />

      {importOpen ? (
        <ProspectsImportDialog
          onClose={() => {
            setImportOpen(false);
            restoreFocus();
          }}
          onImported={(res) => {
            setNotice({
              tone: "success",
              text: `Import : ${nf.format(res.inserted)} insérés, ${nf.format(res.updated)} mis à jour${
                typeof res.unchanged === "number" ? `, ${nf.format(res.unchanged)} inchangés` : ""
              }, ${nf.format(res.skipped)} ignorés${
                res.errors?.length ? `, ${nf.format(res.errors.length)} ligne(s) en erreur` : ""
              }.`,
            });
            reload();
          }}
        />
      ) : null}

      {sync && syncDialogOpen ? <ProspectsSyncDialog state={sync} onConfirm={() => void runSync()} onClose={closeSync} /> : null}
    </>
  );
}
