"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ServiceForm } from "@/components/services/service-form";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canEditServicePrice, canWriteFeature } from "@/lib/rbac";
import {
  createService,
  formatDuration,
  formatPrice,
  getService,
  getServiceFormOptions,
  listServices,
  updateService,
} from "@/modules/services/service";
import type { ServiceDetail, ServiceFormOptions, ServiceListItem } from "@/types/service";

type ActiveFilter = "all" | "active" | "inactive";

export function ServicesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeature(user.role, "services");
  const canPrice = canEditServicePrice(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [rows, setRows] = useState<ServiceListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [options, setOptions] = useState<ServiceFormOptions | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listServices({
        search,
        category: category || undefined,
        active: activeFilter === "all" ? null : activeFilter === "active",
        limit: 50,
      });
      setRows(res.data);
      setCategories(res.categories);
    } catch {
      toast("Impossible de charger les services.", "error");
    }
  }, [search, category, activeFilter, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function openCreate() {
    if (!options) {
      try {
        setOptions(await getServiceFormOptions());
      } catch {
        toast("Impossible de charger les options.", "error");
        return;
      }
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
    } catch {
      toast("Impossible de charger le service.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createService>[0]) {
    setSubmitting(true);
    const result = editing
      ? await updateService(editing.id, data)
      : await createService(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast(editing ? "Service mis à jour." : "Service créé.", "success");
    refresh();
  }

  async function toggleActive(row: ServiceListItem) {
    if (!canWrite) return;
    const result = await updateService(row.id, { active: !row.active });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(row.active ? "Service désactivé." : "Service réactivé.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Services"
        description="Gérez vos prestations, prix, durée et ressources."
        action={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              + Nouveau
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary sm:max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
          <option value="all">Tous</option>
        </select>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucun service trouvé.</div>
      ) : (
        <ResponsiveTable
          headers={["Service", "Durée", "Prix", "Employées", "Statut"]}
          minWidthClass="min-w-[640px]"
          cards={rows.map((s) => (
            <DataCard
              key={s.id}
              onClick={canWrite ? () => openEdit(s.id) : undefined}
              title={
                <span className="flex items-center gap-2">
                  <span>✨</span>
                  {s.name}
                </span>
              }
              subtitle={s.category ?? undefined}
              meta={
                <>
                  <span>{formatDuration(s.durationMin)}</span>
                  <span className="font-mono">{formatPrice(s.price)}</span>
                  <span>{s.staffCount} employée{s.staffCount !== 1 ? "s" : ""}</span>
                  <StatusBadge active={s.active} />
                </>
              }
            />
          ))}
        >
          {rows.map((s) => (
            <tr
              key={s.id}
              className={`hover:bg-[#FBF4F6]/50 ${canWrite ? "cursor-pointer" : ""}`}
              onClick={canWrite ? () => openEdit(s.id) : undefined}
            >
              <td className="px-4 py-3">
                <span className="font-medium">{s.name}</span>
                {s.category ? (
                  <span className="ml-2 text-xs text-ink/45">{s.category}</span>
                ) : null}
              </td>
              <td className="px-4 py-3">{formatDuration(s.durationMin)}</td>
              <td className="px-4 py-3 font-mono">{formatPrice(s.price)}</td>
              <td className="px-4 py-3">{s.staffCount}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive(s);
                  }}
                  disabled={!canWrite}
                  className="disabled:cursor-default"
                >
                  <StatusBadge active={s.active} />
                </button>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Modifier le service" : "Nouveau service"}
      >
        {options ? (
          <ServiceForm
            initial={editing ?? undefined}
            options={options}
            canEditPrice={canPrice}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => setDrawerOpen(false)}
          />
        ) : (
          <p className="text-sm text-ink/50">Chargement…</p>
        )}
      </Drawer>
    </motion.div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        active ? "text-emerald-700" : "text-ink/40"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-ink/25"}`} />
      {active ? "Actif" : "Inactif"}
    </span>
  );
}
