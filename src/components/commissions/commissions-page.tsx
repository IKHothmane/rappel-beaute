"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  canCloseCommissionPeriod,
  canExportCommissions,
  canWriteCommissions,
} from "@/lib/rbac";
import {
  adjustCommission,
  closeCommissionPeriod,
  downloadCommissionsExport,
  formatMad,
  formatRate,
  listCommissions,
  markCommissionPaid,
} from "@/modules/commissions/service";
import { listServices } from "@/modules/services/service";
import { listStaff } from "@/modules/staff/service";
import type {
  CommissionKpis,
  CommissionListItem,
  CommissionPeriodPreset,
} from "@/types/commission";

const PRESETS: { id: CommissionPeriodPreset; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "prev_month", label: "Mois précédent" },
  { id: "custom", label: "Personnalisé" },
];

export function CommissionsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCommissions(user.role);
  const canClose = canCloseCommissionPeriod(user.role);
  const canExport = canExportCommissions(user.role);
  const isStaffLimited = user.role === "STAFF";

  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<CommissionPeriodPreset>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [paid, setPaid] = useState("all");
  const [rows, setRows] = useState<CommissionListItem[]>([]);
  const [kpis, setKpis] = useState<CommissionKpis | null>(null);
  const [periodMeta, setPeriodMeta] = useState<{
    year: number;
    month: number;
    status: string;
  } | null>(null);
  const [staffOpts, setStaffOpts] = useState<{ id: string; name: string }[]>([]);
  const [serviceOpts, setServiceOpts] = useState<{ id: string; name: string }[]>([]);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listCommissions({
        preset,
        from: preset === "custom" ? from || undefined : undefined,
        to: preset === "custom" ? to || undefined : undefined,
        staffId: staffId || undefined,
        serviceId: serviceId || undefined,
        paid,
        limit: 80,
      });
      setRows(res.data);
      setKpis(res.kpis);
      setPeriodMeta({
        year: res.period.year,
        month: res.period.month,
        status: res.period.status,
      });
    } catch {
      toast("Impossible de charger les commissions.", "error");
    }
  }, [preset, from, to, staffId, serviceId, paid, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (isStaffLimited) return;
    listStaff({ limit: 100 })
      .then((r) =>
        setStaffOpts(
          r.data.map((s) => ({
            id: s.id,
            name: s.displayName ?? `${s.firstName} ${s.lastName}`,
          })),
        ),
      )
      .catch(() => undefined);
    listServices({ limit: 100, active: true })
      .then((r) => setServiceOpts(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, [isStaffLimited]);

  async function handleClose() {
    if (!periodMeta || !canClose) return;
    if (!confirm(`Clôturer ${periodMeta.month}/${periodMeta.year} ?`)) return;
    setSubmitting(true);
    const result = await closeCommissionPeriod(periodMeta.year, periodMeta.month);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Période clôturée.", "success");
    refresh();
  }

  async function handleAdjust() {
    if (!adjustId) return;
    setSubmitting(true);
    const result = await adjustCommission(adjustId, {
      amount: Number(adjAmount),
      reason: adjReason,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setAdjustId(null);
    setAdjAmount("");
    setAdjReason("");
    toast("Ajustement enregistré (audit).", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Commissions"
        description="Snapshots figés au COMPLETED — corrections via ajustements uniquement."
        action={
          <div className="flex flex-wrap gap-2">
            {canExport ? (
              <>
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-xs"
                  onClick={() =>
                    downloadCommissionsExport({
                      preset,
                      from,
                      to,
                      staffId,
                      serviceId,
                      format: "csv",
                    })
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
                      from,
                      to,
                      staffId,
                      serviceId,
                      format: "excel",
                    })
                  }
                >
                  Excel
                </button>
                <Link
                  href="/reports/commissions/"
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  Rapport
                </Link>
              </>
            ) : null}
            {canClose && periodMeta?.status === "OPEN" ? (
              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={handleClose}
              >
                Clôturer la période
              </button>
            ) : null}
          </div>
        }
      />

      {periodMeta?.status === "CLOSED" ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Période {periodMeta.month}/{periodMeta.year} clôturée — pas de recalcul.
          Corrections via ajustement uniquement.
        </p>
      ) : null}

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Commissions ce mois" value={formatMad(kpis.commissionTotal)} />
          <Kpi label="CA commissionnable" value={formatMad(kpis.baseTotal)} />
          <Kpi label="Prestations" value={String(kpis.count)} />
          <Kpi
            label="Taux moyen"
            value={kpis.avgRatePct == null ? "—" : `${kpis.avgRatePct} %`}
          />
        </div>
      ) : null}

      {!isStaffLimited && kpis && kpis.byStaff.length > 0 ? (
        <div className="mb-6 surface p-4">
          <p className="mb-3 text-sm font-medium">Commissions par employée</p>
          <ul className="space-y-2">
            {kpis.byStaff.map((s) => (
              <li key={s.staffId} className="flex justify-between text-sm">
                <Link href={`/staff/${s.staffId}/`} className="text-primary">
                  {s.staffName}
                </Link>
                <span className="font-mono">{formatMad(s.commissionTotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs ${
                preset === p.id ? "bg-primary text-white" : "border border-line bg-white"
              }`}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
          </>
        ) : null}
        {!isStaffLimited ? (
          <>
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
          </>
        ) : null}
        <select
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="all">Tous statuts</option>
          <option value="unpaid">Non payées</option>
          <option value="paid">Payées</option>
        </select>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">
          Aucune commission sur cette période.
        </div>
      ) : (
        <ResponsiveTable
          headers={["Date", "Employée", "Service", "Base", "Taux", "Commission"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((c) => (
            <DataCard
              key={c.id}
              title={c.serviceName}
              subtitle={c.staffName}
              meta={
                <>
                  <span className="font-mono">{formatMad(c.netAmount)}</span>
                  <br />
                  <span>{new Date(c.appointmentAt).toLocaleDateString("fr-FR")}</span>
                </>
              }
            />
          ))}
        >
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                {new Date(c.appointmentAt).toLocaleDateString("fr-FR")}
              </td>
              <td className="px-4 py-3 text-sm">
                <Link href={`/staff/${c.staffId}/`} className="text-primary">
                  {c.staffName}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm">{c.serviceName}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(c.baseAmount)}</td>
              <td className="px-4 py-3 text-sm">{formatRate(c)}</td>
              <td className="px-4 py-3 font-mono text-sm">
                {formatMad(c.netAmount)}
                {c.adjustmentsTotal !== 0 ? (
                  <span className="ml-1 text-xs text-ink/40">
                    (brut {formatMad(c.commissionAmount)})
                  </span>
                ) : null}
                {canWrite ? (
                  <div className="mt-1 flex gap-2 text-xs">
                    <button
                      type="button"
                      className="text-primary"
                      onClick={() => setAdjustId(c.id)}
                    >
                      Ajuster
                    </button>
                    <button
                      type="button"
                      className="text-ink/50"
                      onClick={async () => {
                        const r = await markCommissionPaid(c.id, !c.paid);
                        if (!r.ok) toast(r.error, "error");
                        else refresh();
                      }}
                    >
                      {c.paid ? "Non payée" : "Marquer payée"}
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer
        open={Boolean(adjustId)}
        onClose={() => setAdjustId(null)}
        title="Ajustement commission"
      >
        <div className="space-y-4 text-sm">
          <p className="text-ink/60">
            Ne modifie pas le snapshot. Montant signé (ex. -45 pour remboursement).
          </p>
          <label className="block">
            <span className="mb-1.5 block font-medium">Montant *</span>
            <Input
              type="number"
              step={0.01}
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-medium">Motif *</span>
            <Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !adjAmount || !adjReason}
            onClick={handleAdjust}
          >
            Enregistrer
          </Button>
        </div>
      </Drawer>
    </motion.div>
  );
}
