"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { StaffForm } from "@/components/staff/staff-form";
import { StaffScheduleForm } from "@/components/staff/staff-schedule-form";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  canEditStaffLeaves,
  canViewStaffCommissions,
  canViewStaffPerformanceFull,
  canWriteStaff,
} from "@/lib/rbac";
import {
  createStaffLeave,
  formatStaffRevenue,
  getStaff,
  updateStaff,
  updateStaffLeave,
  updateStaffSchedule,
} from "@/modules/staff/service";
import {
  formatMad,
  formatRate,
  getStaffCommissions,
} from "@/modules/commissions/service";
import type { StaffDetail, StaffStatus } from "@/types/staff";
import type { StaffCommissionSummary } from "@/types/commission";
import {
  DAY_LABELS,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  STAFF_STATUS_LABEL,
} from "@/types/staff";

const TABS = ["Profil", "Planning", "Services", "Commissions", "Congés", "Performance"];

export function StaffDetailView({ staffId }: { staffId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStaff(user.role);
  const canLeaves = canEditStaffLeaves(user.role);
  const canCommissions = canViewStaffCommissions(user.role);
  const canPerfFull = canViewStaffPerformanceFull(user.role);

  const [tab, setTab] = useState("Profil");
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStaff(await getStaff(staffId));
    } catch {
      toast("Employée introuvable.", "error");
      setStaff(null);
    }
  }, [staffId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }

  if (!staff) {
    return (
      <div className="surface p-8 text-center">
        <p className="text-sm text-ink/60">Employée introuvable.</p>
        <Link href="/staff/" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Retour aux employées
        </Link>
      </div>
    );
  }

  async function handleUpdateProfile(data: Parameters<typeof updateStaff>[1]) {
    setSubmitting(true);
    const result = await updateStaff(staffId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setEditOpen(false);
    toast("Profil mis à jour.", "success");
    refresh();
  }

  async function handleSchedule(data: Parameters<typeof updateStaffSchedule>[1]) {
    setSubmitting(true);
    const result = await updateStaffSchedule(staffId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Planning enregistré.", "success");
    refresh();
  }

  return (
    <div>
      <Link href="/staff/" className="mb-4 inline-block text-sm text-primary">
        ← Employées
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{staff.displayName}</h1>
          <p className="text-sm text-ink/55">{staff.position ?? "—"}</p>
          <StatusBadge status={staff.status} />
        </div>
        <div className="flex gap-4 text-sm">
          <Kpi label="RDV" value={String(staff.appointmentCount)} />
          {canPerfFull ? (
            <Kpi label="CA" value={formatStaffRevenue(staff.revenue)} />
          ) : null}
          {staff.rating != null ? <Kpi label="Note" value={`${staff.rating}/10`} /> : null}
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="surface p-5">
        {tab === "Profil" ? (
          <ProfileTab staff={staff} canWrite={canWrite} onEdit={() => setEditOpen(true)} />
        ) : null}
        {tab === "Planning" ? (
          canWrite ? (
            <StaffScheduleForm
              initialSchedules={staff.schedules}
              initialBreaks={staff.breaks}
              submitting={submitting}
              onSubmit={handleSchedule}
            />
          ) : (
            <PlanningReadOnly staff={staff} />
          )
        ) : null}
        {tab === "Services" ? <ServicesTab staff={staff} /> : null}
        {tab === "Commissions" ? (
          canCommissions ? (
            <CommissionsTab staffId={staff.id} />
          ) : (
            <p className="text-sm text-ink/50">Accès refusé.</p>
          )
        ) : null}
        {tab === "Congés" ? (
          <LeavesTab
            staff={staff}
            canEdit={canLeaves}
            onRefresh={refresh}
            submitting={submitting}
            setSubmitting={setSubmitting}
          />
        ) : null}
        {tab === "Performance" ? (
          <PerformanceTab staff={staff} full={canPerfFull} />
        ) : null}
      </div>

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le profil">
        <StaffForm
          initial={staff}
          submitting={submitting}
          onSubmit={handleUpdateProfile}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line px-4 py-2 text-center">
      <p className="font-mono text-lg font-semibold">{value}</p>
      <p className="text-xs text-ink/45">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: StaffStatus }) {
  return (
    <span className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {STAFF_STATUS_LABEL[status]}
    </span>
  );
}

function ProfileTab({
  staff,
  canWrite,
  onEdit,
}: {
  staff: StaffDetail;
  canWrite: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      {canWrite ? (
        <button type="button" className="btn-primary mb-4" onClick={onEdit}>
          Modifier
        </button>
      ) : null}
      <Row label="Téléphone" value={staff.phone ?? "—"} />
      <Row label="E-mail" value={staff.email ?? "—"} />
      <Row
        label="Embauche"
        value={staff.hireDate ? new Date(staff.hireDate).toLocaleDateString("fr-FR") : "—"}
      />
      <Row label="Notes" value={staff.notes ?? "—"} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-ink/45">{label} · </span>
      <span>{value}</span>
    </p>
  );
}

function PlanningReadOnly({ staff }: { staff: StaffDetail }) {
  const byDay = new Map(staff.schedules.map((s) => [s.dayOfWeek, s]));
  return (
    <ul className="space-y-2 text-sm">
      {DAY_LABELS.map((label, day) => {
        const s = byDay.get(day);
        return (
          <li key={day}>
            <span className="font-medium">{label}</span>
            {" · "}
            {s?.active ? `${s.startTime} → ${s.endTime}` : "OFF"}
          </li>
        );
      })}
      {staff.breaks.length > 0 ? (
        <li className="mt-4 border-t border-line pt-3">
          <span className="font-medium">Pauses</span>
          <ul className="mt-1 space-y-1 text-ink/70">
            {staff.breaks.map((b, i) => (
              <li key={i}>
                {DAY_LABELS[b.dayOfWeek]} · {b.startTime} → {b.endTime}
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
}

function ServicesTab({ staff }: { staff: StaffDetail }) {
  if (staff.services.length === 0) {
    return <p className="text-sm text-ink/50">Aucun service assigné — configurez via le module Services.</p>;
  }
  return (
    <ul className="space-y-2">
      {staff.services.map((s) => (
        <li key={s.serviceId} className="flex items-center gap-2 text-sm">
          <span className="text-emerald-600">✓</span>
          <span>{s.serviceName}</span>
          {s.category ? <span className="text-xs text-ink/40">({s.category})</span> : null}
          {!s.active ? <span className="text-xs text-ink/40">inactif</span> : null}
        </li>
      ))}
    </ul>
  );
}

function CommissionsTab({ staffId }: { staffId: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StaffCommissionSummary | null>(null);
  const [rules, setRules] = useState<StaffDetail["commissions"]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sum, detail] = await Promise.all([
          getStaffCommissions(staffId),
          getStaff(staffId),
        ]);
        if (!cancelled) {
          setSummary(sum);
          setRules(detail.commissions);
        }
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  if (loading) {
    return <p className="text-sm text-ink/50">Chargement des commissions…</p>;
  }

  return (
    <div className="space-y-6">
      {summary ? (
        <div>
          <p className="mb-2 text-sm font-medium">{summary.periodLabel}</p>
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-ink/45">CA prestations</p>
              <p className="font-mono font-medium">{formatMad(summary.baseTotal)}</p>
            </div>
            <div>
              <p className="text-ink/45">Prestations</p>
              <p className="font-medium">{summary.count}</p>
            </div>
            <div>
              <p className="text-ink/45">Commission nette</p>
              <p className="font-mono font-medium">{formatMad(summary.netTotal)}</p>
            </div>
          </div>
          {summary.items.length === 0 ? (
            <p className="text-sm text-ink/50">Aucune commission figée ce mois.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-ink/45">
                    <th className="py-2 pr-2 font-medium">Date</th>
                    <th className="py-2 pr-2 font-medium">Service</th>
                    <th className="py-2 pr-2 font-medium">Base</th>
                    <th className="py-2 pr-2 font-medium">Taux</th>
                    <th className="py-2 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.items.map((c) => (
                    <tr key={c.id} className="border-b border-line/60">
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {new Date(c.appointmentAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-2">{c.serviceName}</td>
                      <td className="py-2 pr-2 font-mono">{formatMad(c.baseAmount)}</td>
                      <td className="py-2 pr-2">{formatRate(c)}</td>
                      <td className="py-2 font-mono">{formatMad(c.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium">Règles actuelles (services)</p>
        <p className="mb-3 text-xs text-ink/45">
          Les taux ci-dessous ne recalculent jamais les commissions historiques.
        </p>
        {rules.length === 0 ? (
          <p className="text-sm text-ink/50">Aucune règle — configurez via Services.</p>
        ) : (
          <ul className="space-y-2">
            {rules.map((c) => (
              <li key={c.id} className="rounded-lg border border-line p-3 text-sm">
                <p className="font-medium">{c.serviceName}</p>
                <p className="text-ink/60">
                  {c.type === "PERCENTAGE"
                    ? `${c.percentage ?? 0} %`
                    : `${c.fixedAmount ?? 0} MAD fixe`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LeavesTab({
  staff,
  canEdit,
  onRefresh,
  submitting,
  setSubmitting,
}: {
  staff: StaffDetail;
  canEdit: boolean;
  onRefresh: () => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [type, setType] = useState<"CONGE" | "MALADIE" | "ABSENCE" | "AUTRE">("CONGE");
  const [reason, setReason] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!startAt || !endAt) return;
    setSubmitting(true);
    const result = await createStaffLeave(staff.id, {
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      type,
      reason: reason || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Congé enregistré.", "success");
    setStartAt("");
    setEndAt("");
    setReason("");
    onRefresh();
  }

  async function cancelLeave(leaveId: string) {
    setSubmitting(true);
    const result = await updateStaffLeave(staff.id, leaveId, { status: "CANCELLED" });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Congé annulé.", "info");
    onRefresh();
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-line p-4">
          <p className="text-sm font-medium">Nouveau congé / absence</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-ink/50">Début</span>
              <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-ink/50">Fin</span>
              <Input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </label>
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {Object.entries(LEAVE_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif (optionnel)"
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            Enregistrer
          </Button>
        </form>
      ) : null}

      {staff.leaves.length === 0 ? (
        <p className="text-sm text-ink/50">Aucun congé enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {staff.leaves.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm">
              <div>
                <p className="font-medium">
                  {LEAVE_TYPE_LABEL[l.type]} · {LEAVE_STATUS_LABEL[l.status]}
                </p>
                <p className="text-ink/60">
                  {new Date(l.startAt).toLocaleDateString("fr-FR")} →{" "}
                  {new Date(l.endAt).toLocaleDateString("fr-FR")}
                </p>
                {l.reason ? <p className="text-xs text-ink/45">{l.reason}</p> : null}
              </div>
              {canEdit && l.status === "APPROVED" ? (
                <button
                  type="button"
                  onClick={() => cancelLeave(l.id)}
                  className="text-xs text-red-600 hover:underline"
                  disabled={submitting}
                >
                  Annuler
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PerformanceTab({ staff, full }: { staff: StaffDetail; full: boolean }) {
  const p = staff.performance;
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Terminés" value={String(p.completedCount)} />
        <Kpi label="Annulés" value={String(p.cancelledCount)} />
        <Kpi label="Absents" value={String(p.noShowCount)} />
        {full ? <Kpi label="Panier moy." value={formatStaffRevenue(p.averageTicket)} /> : null}
      </div>
      {full && p.monthlyRevenue.length > 0 ? (
        <div>
          <p className="mb-2 font-medium">CA mensuel (6 mois)</p>
          <ul className="space-y-1">
            {p.monthlyRevenue.map((m) => (
              <li key={m.month} className="flex justify-between text-ink/70">
                <span>{m.month}</span>
                <span className="font-mono">{formatStaffRevenue(m.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!full ? (
        <p className="text-xs text-ink/45">Vue limitée — CA masqué pour votre rôle.</p>
      ) : null}
    </div>
  );
}
