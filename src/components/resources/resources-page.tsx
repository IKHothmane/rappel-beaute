"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ResourceForm } from "@/components/resources/resource-form";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canWriteResources } from "@/lib/rbac";
import { listServices } from "@/modules/services/service";
import { createResource, listResources } from "@/modules/resources/service";
import type { ResourceListItem, ResourceType } from "@/types/resource";
import { RESOURCE_TYPE_LABEL, RESOURCE_TYPES } from "@/types/resource";

type ActiveFilter = "all" | "active" | "inactive";

export function ResourcesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteResources(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ResourceType | "">("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [serviceId, setServiceId] = useState("");
  const [serviceOptions, setServiceOptions] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<ResourceListItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listResources({
        search,
        type: type || undefined,
        serviceId: serviceId || undefined,
        active: activeFilter === "all" ? null : activeFilter === "active",
        limit: 50,
      });
      setRows(res.data);
    } catch {
      toast("Impossible de charger les ressources.", "error");
    }
  }, [search, type, serviceId, activeFilter, toast]);

  useEffect(() => {
    listServices({ limit: 100, active: true })
      .then((r) => setServiceOptions(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleCreate(data: Parameters<typeof createResource>[0]) {
    setSubmitting(true);
    const result = await createResource(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast("Ressource créée.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Ressources"
        description="Cabines, salles et équipements — un créneau, une ressource."
        action={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Nouvelle
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
          value={type}
          onChange={(e) => setType(e.target.value as ResourceType | "")}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous types</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {RESOURCE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="active">Actives</option>
          <option value="inactive">Inactives</option>
          <option value="all">Toutes</option>
        </select>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous services</option>
          {serviceOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucune ressource trouvée.</div>
      ) : (
        <ResponsiveTable
          headers={["Ressource", "Type", "Capacité", "Services", "Statut"]}
          minWidthClass="min-w-[680px]"
          cards={rows.map((r) => (
            <DataCard
              key={r.id}
              href={`/resources/${r.id}/`}
              title={r.name}
              subtitle={RESOURCE_TYPE_LABEL[r.type]}
              meta={
                <>
                  <span>Capacité {r.capacity}</span>
                  <span>{r.serviceCount} service{r.serviceCount !== 1 ? "s" : ""}</span>
                  {r.upcomingMaintenance ? <span className="text-amber-700">Maintenance</span> : null}
                  <StatusBadge active={r.active} />
                </>
              }
            />
          ))}
        >
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3">
                <Link href={`/resources/${r.id}/`} className="font-medium text-primary">
                  {r.name}
                </Link>
                {r.location ? <span className="ml-2 text-xs text-ink/45">{r.location}</span> : null}
              </td>
              <td className="px-4 py-3">{RESOURCE_TYPE_LABEL[r.type]}</td>
              <td className="px-4 py-3">{r.capacity}</td>
              <td className="px-4 py-3 text-xs text-ink/60">
                {r.serviceNames.slice(0, 3).join(" · ") || "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <StatusBadge active={r.active} />
                  {r.upcomingMaintenance ? (
                    <span className="text-xs text-amber-700">Maintenance à venir</span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle ressource">
        <ResourceForm
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </motion.div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${active ? "text-emerald-700" : "text-ink/40"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-ink/25"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
