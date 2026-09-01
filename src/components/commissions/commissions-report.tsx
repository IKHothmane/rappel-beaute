"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { useToast } from "@/components/ui/toast";
import { canExportCommissions } from "@/lib/rbac";
import {
  downloadCommissionsExport,
  formatMad,
  formatRate,
  listCommissions,
} from "@/modules/commissions/service";
import { listServices } from "@/modules/services/service";
import { listStaff } from "@/modules/staff/service";
import type {
  CommissionKpis,
  CommissionListItem,
  CommissionPeriodPreset,
} from "@/types/commission";

export function CommissionsReportView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canExport = canExportCommissions(user.role);

  const [preset, setPreset] = useState<CommissionPeriodPreset>("month");
  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [rows, setRows] = useState<CommissionListItem[]>([]);
  const [kpis, setKpis] = useState<CommissionKpis | null>(null);
  const [staffOpts, setStaffOpts] = useState<{ id: string; name: string }[]>([]);
  const [serviceOpts, setServiceOpts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await listCommissions({
        preset,
        staffId: staffId || undefined,
        serviceId: serviceId || undefined,
        limit: 200,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger le rapport.", "error");
    }
  }, [preset, staffId, serviceId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listStaff({ limit: 100 })
      .then((r) =>
        setStaffOpts(r.data.map((s) => ({ id: s.id, name: s.displayName }))),
      )
      .catch(() => undefined);
    listServices({ limit: 100, active: true })
      .then((r) => setServiceOpts(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, []);

  function printPdf() {
    window.print();
  }

  return (
    <div>
      <AppPageHeader
        title="Rapport commissions"
        description="CA · Prestations · Commission — snapshots figés."
        action={
          canExport ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() =>
                  downloadCommissionsExport({ preset, staffId, serviceId, format: "csv" })
                }
              >
                CSV
              </button>
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() =>
                  downloadCommissionsExport({
                    preset,
                    staffId,
                    serviceId,
                    format: "excel",
                  })
                }
              >
                Excel
              </button>
              <button type="button" className="btn-primary" onClick={printPdf}>
                PDF / Imprimer
              </button>
            </div>
          ) : undefined
        }
      />

      <p className="mb-4 text-sm">
        <Link href="/reports/" className="text-primary">
          ← Rapports
        </Link>
        {" · "}
        <Link href="/commissions/" className="text-primary">
          Module commissions
        </Link>
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["month", "Ce mois"],
            ["prev_month", "Mois précédent"],
            ["week", "Semaine"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs ${
              preset === id ? "bg-primary text-white" : "border border-line bg-white"
            }`}
            onClick={() => setPreset(id)}
          >
            {label}
          </button>
        ))}
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Toutes employées</option>
          {staffOpts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous services</option>
          {serviceOpts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {kpis ? (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Kpi label="CA" value={formatMad(kpis.baseTotal)} />
          <Kpi label="Prestations" value={String(kpis.count)} />
          <Kpi label="Commission" value={formatMad(kpis.commissionTotal)} />
        </div>
      ) : null}

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : (
        <ResponsiveTable
          headers={["Date", "Employée", "Service", "Base", "Taux", "Commission"]}
          minWidthClass="min-w-[640px]"
          cards={rows.map((c) => (
            <div key={c.id} className="surface mb-2 p-3 text-sm">
              <p className="font-medium">{c.serviceName}</p>
              <p className="text-ink/55">{c.staffName}</p>
              <p className="font-mono">{formatMad(c.netAmount)}</p>
            </div>
          ))}
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                {new Date(c.appointmentAt).toLocaleDateString("fr-FR")}
              </td>
              <td className="px-4 py-3 text-sm">{c.staffName}</td>
              <td className="px-4 py-3 text-sm">{c.serviceName}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(c.baseAmount)}</td>
              <td className="px-4 py-3 text-sm">{formatRate(c)}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(c.netAmount)}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
    </div>
  );
}
