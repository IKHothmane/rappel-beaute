"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ResourceForm } from "@/components/resources/resource-form";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canWriteResources } from "@/lib/rbac";
import {
  createResourceMaintenance,
  getResource,
  getResourceAvailability,
  updateResource,
  updateResourceMaintenance,
} from "@/modules/resources/service";
import type {
  MaintenanceType,
  ResourceAvailability,
  ResourceDetail,
} from "@/types/resource";
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
  RESOURCE_TYPE_LABEL,
} from "@/types/resource";

const TABS = ["Profil", "Services", "Maintenance", "Disponibilité", "Historique"];

export function ResourceDetailView({ resourceId }: { resourceId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteResources(user.role);

  const [tab, setTab] = useState("Profil");
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availDate, setAvailDate] = useState("2026-08-30");
  const [availability, setAvailability] = useState<ResourceAvailability | null>(null);

  const refresh = useCallback(async () => {
    try {
      setResource(await getResource(resourceId));
    } catch {
      toast("Ressource introuvable.", "error");
      setResource(null);
    }
  }, [resourceId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (tab !== "Disponibilité") return;
    getResourceAvailability(resourceId, availDate)
      .then(setAvailability)
      .catch(() => toast("Impossible de charger la disponibilité.", "error"));
  }, [tab, availDate, resourceId, toast]);

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }

  if (!resource) {
    return (
      <div className="surface p-8 text-center">
        <p className="text-sm text-ink/60">Ressource introuvable.</p>
        <Link href="/resources/" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Retour aux ressources
        </Link>
      </div>
    );
  }

  async function handleUpdate(data: Parameters<typeof updateResource>[1]) {
    setSubmitting(true);
    const result = await updateResource(resourceId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setEditOpen(false);
    toast("Ressource mise à jour.", "success");
    refresh();
  }

  return (
    <div>
      <Link href="/resources/" className="mb-4 inline-block text-sm text-primary">
        ← Ressources
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{resource.name}</h1>
          <p className="text-sm text-ink/55">{RESOURCE_TYPE_LABEL[resource.type]}</p>
          <span
            className={`mt-2 inline-flex items-center gap-1 text-sm ${
              resource.active ? "text-emerald-700" : "text-ink/40"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${resource.active ? "bg-emerald-500" : "bg-ink/25"}`} />
            {resource.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="rounded-lg border border-line px-4 py-2 text-center">
            <p className="font-mono text-lg font-semibold">{resource.capacity}</p>
            <p className="text-xs text-ink/45">Capacité</p>
          </div>
          <div className="rounded-lg border border-line px-4 py-2 text-center">
            <p className="font-mono text-lg font-semibold">{resource.serviceCount}</p>
            <p className="text-xs text-ink/45">Services</p>
          </div>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="surface p-5">
        {tab === "Profil" ? (
          <div className="space-y-3 text-sm">
            {canWrite ? (
              <button type="button" className="btn-primary mb-4" onClick={() => setEditOpen(true)}>
                Modifier
              </button>
            ) : null}
            <p>
              <span className="text-ink/45">Emplacement · </span>
              {resource.location ?? "—"}
            </p>
            <p>
              <span className="text-ink/45">Notes · </span>
              {resource.notes ?? "—"}
            </p>
            {canWrite ? (
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={async () => {
                  const result = await updateResource(resourceId, { active: !resource.active });
                  if (!result.ok) toast(result.error, "error");
                  else {
                    toast(resource.active ? "Ressource désactivée." : "Ressource réactivée.", "success");
                    refresh();
                  }
                }}
              >
                {resource.active ? "Désactiver" : "Réactiver"}
              </button>
            ) : null}
          </div>
        ) : null}

        {tab === "Services" ? (
          resource.services.length === 0 ? (
            <p className="text-sm text-ink/50">
              Aucun service lié — assignez cette ressource depuis le module Services.
            </p>
          ) : (
            <ul className="space-y-2">
              {resource.services.map((s) => (
                <li key={s.serviceId} className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-600">✓</span>
                  {s.serviceName}
                  {s.category ? <span className="text-xs text-ink/40">({s.category})</span> : null}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "Maintenance" ? (
          <MaintenanceTab
            resource={resource}
            canWrite={canWrite}
            submitting={submitting}
            setSubmitting={setSubmitting}
            onRefresh={refresh}
          />
        ) : null}

        {tab === "Disponibilité" ? (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-ink/50">Date</span>
              <Input type="date" value={availDate} onChange={(e) => setAvailDate(e.target.value)} />
            </label>
            {!availability || availability.slots.length === 0 ? (
              <p className="text-sm text-ink/50">Aucun créneau occupé ce jour.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {availability.slots.map((s, i) => (
                  <li key={i} className="rounded-lg border border-line p-3">
                    <span className={s.kind === "maintenance" ? "text-amber-700" : "text-ink"}>
                      {s.kind === "maintenance" ? "🔧 " : "📅 "}
                      {new Date(s.startAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      →{" "}
                      {new Date(s.endAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="ml-2 text-ink/50">{s.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "Historique" ? (
          resource.reservations.length === 0 ? (
            <p className="text-sm text-ink/50">Aucune réservation.</p>
          ) : (
            <ul className="space-y-2">
              {resource.reservations.map((r) => (
                <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="font-medium">{r.serviceName}</p>
                  <p className="text-ink/60">
                    {new Date(r.startAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {r.customerName} · {r.staffName}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la ressource">
        <ResourceForm
          initial={resource}
          submitting={submitting}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </div>
  );
}

function MaintenanceTab({
  resource,
  canWrite,
  submitting,
  setSubmitting,
  onRefresh,
}: {
  resource: ResourceDetail;
  canWrite: boolean;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [type, setType] = useState<MaintenanceType>("PREVENTIVE");
  const [reason, setReason] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!startAt || !endAt) return;
    setSubmitting(true);
    const result = await createResourceMaintenance(resource.id, {
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
    toast("Maintenance planifiée.", "success");
    setStartAt("");
    setEndAt("");
    setReason("");
    onRefresh();
  }

  return (
    <div className="space-y-6">
      {canWrite ? (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-line p-4">
          <p className="text-sm font-medium">Planifier une maintenance</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-ink/50">Début</span>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-ink/50">Fin</span>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </label>
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value as MaintenanceType)}>
            {Object.entries(MAINTENANCE_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (optionnel)" />
          <Button type="submit" variant="primary" disabled={submitting}>
            Enregistrer
          </Button>
        </form>
      ) : null}

      {resource.maintenances.length === 0 ? (
        <p className="text-sm text-ink/50">Aucune maintenance.</p>
      ) : (
        <ul className="space-y-2">
          {resource.maintenances.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {MAINTENANCE_TYPE_LABEL[m.type]} · {MAINTENANCE_STATUS_LABEL[m.status]}
                </p>
                <p className="text-ink/60">
                  {new Date(m.startAt).toLocaleString("fr-FR")} → {new Date(m.endAt).toLocaleString("fr-FR")}
                </p>
                {m.reason ? <p className="text-xs text-ink/45">{m.reason}</p> : null}
              </div>
              {canWrite && (m.status === "SCHEDULED" || m.status === "IN_PROGRESS") ? (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    const result = await updateResourceMaintenance(resource.id, m.id, {
                      status: "CANCELLED",
                    });
                    setSubmitting(false);
                    if (!result.ok) toast(result.error, "error");
                    else {
                      toast("Maintenance annulée.", "info");
                      onRefresh();
                    }
                  }}
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
