"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ServiceForm } from "@/components/services/service-form";
import ServicesCatalogPremium from "@/components/services/services-catalog-premium";
import { ServicesMobile } from "@/components/services/services-mobile";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canEditServicePrice, canWriteFeature } from "@/lib/rbac";
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
    getAnalyticsOverview({ preset: "month", compare: true })
      .then(setOverview)
      .catch(() => setOverview(null));
    getAnalyticsServices({ preset: "month" })
      .then((res) => setServiceStats(res.items))
      .catch(() => setServiceStats([]));
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

  async function openCreate() {
    try {
      await ensureOptions();
    } catch {
      toast("Impossible de charger les options.", "error");
      return;
    }
    setEditing(null);
    setDrawerOpen(true);
  }

  async function openEdit(id: string) {
    try {
      const [detail, opts] = await Promise.all([
        getService(id),
        options ? Promise.resolve(options) : getServiceFormOptions(),
      ]);
      setOptions(opts);
      setEditing(detail);
      setDrawerOpen(true);
      setMenuId(null);
    } catch {
      toast("Impossible de charger le service.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createService>[0]) {
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
    void refresh();
  }

  async function toggleActive(row: ServiceListItem) {
    if (!canWrite) return;
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
    if (!canWrite) return;
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

  return (
    <div className="flex flex-col gap-5 pb-8">
      <ServicesMobile
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
        />
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier le service" : "Nouveau service"}
        side="right"
        preserveHeader
      >
        {options ? (
          <ServiceForm
            key={editing?.id ?? "new"}
            initial={editing ?? { active: true }}
            options={options}
            extraCategories={categories}
            canEditPrice={canPrice}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDrawerOpen(false);
              setEditing(null);
            }}
          />
        ) : (
          <p className="text-sm text-ink/50">Chargement…</p>
        )}
      </Drawer>
    </div>
  );
}
