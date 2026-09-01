"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { StaffForm } from "@/components/staff/staff-form";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canWriteStaff } from "@/lib/rbac";
import { listServices } from "@/modules/services/service";
import {
  createStaff,
  formatStaffRevenue,
  listStaff,
} from "@/modules/staff/service";
import type { StaffListItem, StaffStatus } from "@/types/staff";
import { STAFF_STATUS_LABEL } from "@/types/staff";

const STATUSES: (StaffStatus | "")[] = ["", "ACTIVE", "ON_LEAVE", "INACTIVE"];

export function StaffPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStaff(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StaffStatus | "">("");
  const [serviceId, setServiceId] = useState("");
  const [serviceOptions, setServiceOptions] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<StaffListItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listStaff({
        search,
        status: status || undefined,
        serviceId: serviceId || undefined,
        limit: 50,
      });
      setRows(res.data);
    } catch {
      toast("Impossible de charger les employées.", "error");
    }
  }, [search, status, serviceId, toast]);

  useEffect(() => {
    listServices({ limit: 100, active: true })
      .then((r) => setServiceOptions(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleCreate(data: Parameters<typeof createStaff>[0]) {
    setSubmitting(true);
    const result = await createStaff(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast("Employée créée.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Employées"
        description="Gérez votre équipe, horaires et commissions."
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
          value={status}
          onChange={(e) => setStatus(e.target.value as StaffStatus | "")}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {STAFF_STATUS_LABEL[s as StaffStatus]}
            </option>
          ))}
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
        <div className="surface p-8 text-center text-sm text-ink/50">Aucune employée trouvée.</div>
      ) : (
        <ResponsiveTable
          headers={["Employée", "Statut", "RDV", "CA", "Services"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((s) => (
            <DataCard
              key={s.id}
              href={`/staff/${s.id}/`}
              title={
                <span className="flex items-center gap-2">
                  <span>👩</span>
                  {s.displayName}
                </span>
              }
              subtitle={s.position ?? undefined}
              meta={
                <>
                  <StatusBadge status={s.status} />
                  <span>{s.appointmentCount} RDV</span>
                  <span className="font-mono">{formatStaffRevenue(s.revenue)}</span>
                  <span className="truncate max-w-[140px]">{s.serviceNames.slice(0, 3).join(" · ") || "—"}</span>
                </>
              }
            />
          ))}
        >
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3">
                <Link href={`/staff/${s.id}/`} className="font-medium text-primary">
                  {s.displayName}
                </Link>
                {s.position ? (
                  <span className="ml-2 text-xs text-ink/45">{s.position}</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-3">{s.appointmentCount}</td>
              <td className="px-4 py-3 font-mono">{formatStaffRevenue(s.revenue)}</td>
              <td className="px-4 py-3 text-xs text-ink/60">
                {s.serviceNames.slice(0, 3).join(" · ") || "—"}
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle employée">
        <StaffForm
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: StaffStatus }) {
  const colors: Record<StaffStatus, string> = {
    ACTIVE: "text-emerald-700",
    INACTIVE: "text-ink/40",
    ON_LEAVE: "text-amber-700",
    ARCHIVED: "text-ink/35",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${colors[status]}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ACTIVE"
            ? "bg-emerald-500"
            : status === "ON_LEAVE"
              ? "bg-amber-500"
              : "bg-ink/25"
        }`}
      />
      {STAFF_STATUS_LABEL[status]}
    </span>
  );
}
