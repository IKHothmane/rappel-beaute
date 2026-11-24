"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ServiceForm } from "@/components/services/service-form";
import ServicesCatalogPremium from "@/components/services/services-catalog-premium";
import { ServicesGuide } from "@/components/services/services-guide";
import { ServicesMobile } from "@/components/services/services-mobile";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import { useToast } from "@/components/ui/toast";
import { canEditServicePrice, canWriteFeature } from "@/lib/rbac";
import { notifyTutorialRefresh } from "@/lib/tutorial-events";
import { formatMad, getAnalyticsOverview, getAnalyticsServices } from "@/modules/analytics/service";
import {
  createService,
  deleteService,
  getService,
  getServiceFormOptions,
  listServices,
  updateService,
} from "@/modules/services/service";
import type { AnalyticsOverview, ServiceAnalyticsRow } from "@/types/analytics";
import type { ServiceDetail, ServiceFormOptions, ServiceListItem } from "@/types/service";

type ActiveFilter = "all" | "active" | "inactive";

export function ServicesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeature(user.role, "services");
  const canPrice = canEditServicePrice(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [catalog, setCatalog] = useState<ServiceListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [options, setOptions] = useState<ServiceFormOptions | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [serviceStats, setServiceStats] = useState<ServiceAnalyticsRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  // Formulaire de création ouvert en démonstration par le tutoriel (aucune écriture) ; piloté par ServicesGuide.
  const [demo, setDemo] = useState(false);
  const demoRef = useRef(false);
  // Visite guidée active (dès son démarrage, y compris pendant ses chargements) : aucune écriture ni tiroir réel.
  const tourActiveRef = useRef(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await listServices({ limit: 200 });
      setCatalog(res.data);
      setCategories(res.categories);
    } catch {
      toast("Impossible de charger les services.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const overviewDone = getAnalyticsOverview({ preset: "month", compare: true })
      .then(setOverview)
      .catch(() => setOverview(null));
    const statsDone = getAnalyticsServices({ preset: "month" })
      .then((res) => setServiceStats(res.items))
      .catch(() => setServiceStats([]));
    // Le tutoriel attend (au plus quelques secondes) que les indicateurs soient chargés avant de les mettre en avant.
    void Promise.all([overviewDone, statsDone]).then(() => {
      if (!cancelled) setAnalyticsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const statsById = useMemo(() => {
    const map = new Map<string, ServiceAnalyticsRow>();
    for (const row of serviceStats) map.set(row.serviceId, row);
    return map;
  }, [serviceStats]);

  const activeCount = catalog.filter((s) => s.active).length;
  const inactiveCount = catalog.length - activeCount;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return catalog.filter((s) => {
      if (activeFilter === "active" && !s.active) return false;
      if (activeFilter === "inactive" && s.active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.staffNames.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [catalog, search, activeFilter]);

  const topByAppointments = useMemo(() => {
    if (!serviceStats.length) return null;
    return serviceStats.reduce((best, row) => (row.appointments > best.appointments ? row : best), serviceStats[0]);
  }, [serviceStats]);

  async function ensureOptions() {
    if (options) return options;
    const opts = await getServiceFormOptions();
    setOptions(opts);
    return opts;
  }

  /** Tutoriel : charge les options du formulaire (lecture seule) ; faux si le formulaire ne peut pas être présenté. */
  async function prepareDemoForm() {
    try {
      await ensureOptions();
      return true;
    } catch {
      return false;
    }
  }

  /** Vrai pendant toute la visite guidée (étapes de page comprises) : écritures et tiroirs réels refusés. */
  const tutorialBusy = () => demoRef.current || tourActiveRef.current;

  function handleDemoChange(open: boolean) {
    demoRef.current = open;
    if (open) setMenuId(null);
    setDemo(open);
  }

  function handleActiveChange(active: boolean) {
    tourActiveRef.current = active;
    if (active) setMenuId(null);
  }

  async function openCreate() {
    if (tutorialBusy()) return;
    try {
      await ensureOptions();
    } catch {
      toast("Impossible de charger les options.", "error");
      return;
    }
    // La visite a pu démarrer pendant le chargement des options.
    if (tutorialBusy()) return;
    setEditing(null);
    setDrawerOpen(true);
  }

  async function openEdit(id: string) {
    if (tutorialBusy()) return;
    try {
      const [detail, opts] = await Promise.all([
        getService(id),
        options ? Promise.resolve(options) : getServiceFormOptions(),
      ]);
      setOptions(opts);
      // La visite a pu démarrer pendant le chargement : on n'ouvre pas le tiroir réel sous la démonstration.
      if (tutorialBusy()) return;
      setEditing(detail);
      setDrawerOpen(true);
      setMenuId(null);
    } catch {
      toast("Impossible de charger le service.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createService>[0]) {
    if (tutorialBusy()) return;
    setSubmitting(true);
    const result = editing ? await updateService(editing.id, data) : await createService(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    setEditing(null);
    toast(editing ? "Service mis à jour." : "Service créé.", "success");
    if (!editing) notifyTutorialRefresh();
    void refresh();
  }

  async function toggleActive(row: ServiceListItem) {
    if (!canWrite || tutorialBusy()) return;
    const result = await updateService(row.id, { active: !row.active });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(row.active ? "Service désactivé." : "Service réactivé.", "success");
    setMenuId(null);
    void refresh();
  }

  async function confirmDelete(row: ServiceListItem) {
    if (!canWrite || tutorialBusy()) return;
    const ok = window.confirm(
      `Supprimer « ${row.name} » ? Le service disparaît du catalogue. Les rendez-vous déjà pris conservent le nom du soin.`,
    );
    if (!ok) {
      setMenuId(null);
      return;
    }
    const result = await deleteService(row.id);
    if (!result.ok) {
      toast(result.error, "error");
      setMenuId(null);
      return;
    }
    toast("Service supprimé.", "success");
    setMenuId(null);
    void refresh();
  }

  const insight =
    topByAppointments && topByAppointments.appointments > 0
      ? `${topByAppointments.serviceName} est la prestation la plus demandée ce mois (${topByAppointments.appointments} RDV${
          !financeHidden ? ` • ${formatMad(topByAppointments.revenue)}` : ""
        }).`
      : overview && overview.appointments.value > 0
        ? "Des rendez-vous sont prévus ce mois, mais aucun n’est encore terminé — le classement ventes s’affiche après réalisation."
        : "Pas encore assez de rendez-vous ce mois pour un classement.";

  const bestSellerName =
    topByAppointments && topByAppointments.appointments > 0
      ? topByAppointments.serviceName
      : overview && overview.appointments.value > 0
        ? "Aucun soin terminé"
        : null;

  const guide = (
    <ServicesGuide
      canWrite={canWrite}
      prepareForm={prepareDemoForm}
      onDemoChange={handleDemoChange}
      onActiveChange={handleActiveChange}
      dataReady={analyticsReady}
    />
  );

  return (
    <div
      className="flex flex-col gap-5 pb-8"
      data-services-tour="svc-root"
      data-loading={loading ? "true" : "false"}
    >
      <ServicesMobile
        guide={guide}
        orgName={user.orgName}
        catalogCount={catalog.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        canWrite={canWrite}
        financeHidden={financeHidden}
        overview={overview}
        insight={insight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        filtered={filtered}
        statsById={statsById}
        loading={loading}
        topByAppointments={topByAppointments}
        menuId={menuId}
        onMenu={setMenuId}
        onCreate={() => void openCreate()}
        onEdit={(id) => void openEdit(id)}
        onToggle={(s) => void toggleActive(s)}
        onDelete={(s) => void confirmDelete(s)}
      />

      <div className="hidden lg:block">
        <ServicesCatalogPremium
          services={catalog}
          loading={loading}
          canWrite={canWrite}
          monthlyAppointments={overview?.appointments.value}
          monthlyRevenue={financeHidden ? undefined : overview?.revenue.value}
          averageBasket={financeHidden ? undefined : overview?.averageTicket.value}
          bestSellerName={bestSellerName}
          onCreate={() => void openCreate()}
          onEdit={(id) => void openEdit(id)}
          onToggle={(id) => {
            const row = catalog.find((s) => s.id === id);
            if (row) void toggleActive(row);
          }}
          onDelete={(id) => {
            const row = catalog.find((s) => s.id === id);
            if (row) void confirmDelete(row);
          }}
          onRefresh={refresh}
          guide={guide}
        />
      </div>

      <PremiumSidePanel
        open={drawerOpen || demo}
        onClose={() => {
          // Pendant la visite guidée, c'est elle qui ferme le formulaire.
          if (demoRef.current) return;
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing && !demo ? "Modifier le service" : "Nouveau service"}
        description={
          demo
            ? "Mode tutoriel : aucun service ne sera enregistré."
            : editing
              ? "Mettez à jour la prestation de votre catalogue."
              : "Ajoutez une prestation à votre catalogue."
        }
      >
        {options ? (
          <ServiceForm
            key={demo ? "tutorial" : editing?.id ?? "new"}
            initial={demo ? { active: true } : editing ?? { active: true }}
            options={options}
            extraCategories={categories}
            canEditPrice={canPrice}
            submitting={submitting}
            tutorialMode={demo}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDrawerOpen(false);
              setEditing(null);
            }}
          />
        ) : (
          <p className="text-sm text-[#887787]">Chargement…</p>
        )}
      </PremiumSidePanel>
    </div>
  );
}
