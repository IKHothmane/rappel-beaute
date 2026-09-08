"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppPageHeader } from "@/components/app/AppUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createClosureApi,
  createOvertimeApi,
  createReplacementApi,
  deletePlanningItemApi,
  loadPlanningApi,
} from "@/modules/planning/service";
import { listStaffForAgenda } from "@/modules/staff/service";
import type {
  OrganizationClosureItem,
  StaffOvertimeItem,
  StaffReplacementItem,
} from "@/types/planning";
import type { StaffAgendaContext } from "@/types/staff";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlanningPageView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffAgendaContext[]>([]);
  const [closures, setClosures] = useState<OrganizationClosureItem[]>([]);
  const [overtimes, setOvertimes] = useState<StaffOvertimeItem[]>([]);
  const [replacements, setReplacements] = useState<StaffReplacementItem[]>([]);

  const [closureStart, setClosureStart] = useState("");
  const [closureEnd, setClosureEnd] = useState("");
  const [closureReason, setClosureReason] = useState("");

  const [otStaff, setOtStaff] = useState("");
  const [otStart, setOtStart] = useState("");
  const [otEnd, setOtEnd] = useState("");
  const [otReason, setOtReason] = useState("");

  const [repAbsent, setRepAbsent] = useState("");
  const [repSub, setRepSub] = useState("");
  const [repStart, setRepStart] = useState("");
  const [repEnd, setRepEnd] = useState("");
  const [repReason, setRepReason] = useState("");

  const refresh = useCallback(async () => {
    const [plan, staffList] = await Promise.all([loadPlanningApi(), listStaffForAgenda()]);
    setClosures(plan.closures);
    setOvertimes(plan.overtimes);
    setReplacements(plan.replacements);
    setStaff(staffList);
    if (!otStaff && staffList[0]) setOtStaff(staffList[0].id);
    if (!repAbsent && staffList[0]) setRepAbsent(staffList[0].id);
    if (!repSub && staffList[1]) setRepSub(staffList[1].id);
  }, [otStaff, repAbsent, repSub]);

  useEffect(() => {
    refresh()
      .catch(() => toast("Impossible de charger le planning.", "error"))
      .finally(() => setLoading(false));
  }, [refresh, toast]);

  async function addClosure() {
    try {
      await createClosureApi({
        startAt: new Date(closureStart).toISOString(),
        endAt: new Date(closureEnd).toISOString(),
        reason: closureReason || null,
      });
      toast("Fermeture enregistrée.", "success");
      setClosureReason("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function addOt() {
    try {
      await createOvertimeApi({
        staffId: otStaff,
        startAt: new Date(otStart).toISOString(),
        endAt: new Date(otEnd).toISOString(),
        reason: otReason || null,
      });
      toast("Heures supplémentaires enregistrées.", "success");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function addRep() {
    try {
      await createReplacementApi({
        absentStaffId: repAbsent,
        substituteStaffId: repSub,
        startAt: new Date(repStart).toISOString(),
        endAt: new Date(repEnd).toISOString(),
        reason: repReason || null,
      });
      toast("Remplacement enregistré.", "success");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/50">Chargement…</p>;
  }

  return (
    <>
      <AppPageHeader
        title="Planning avancé"
        description="Fermetures, heures supp., remplacements — même source que l’agenda et /book/."
      />
      <p className="mb-6 text-sm text-ink/55">
        <Link href="/agenda/" className="underline">
          Retour agenda
        </Link>
        {" · "}
        Les RDV hors dispo sont refusés côté serveur (pas seulement à l’écran).
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface space-y-3 p-4">
          <h2 className="font-medium">Fermeture institut</h2>
          <Input type="datetime-local" value={closureStart} onChange={(e) => setClosureStart(e.target.value)} />
          <Input type="datetime-local" value={closureEnd} onChange={(e) => setClosureEnd(e.target.value)} />
          <Input placeholder="Motif" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} />
          <Button type="button" onClick={addClosure} disabled={!closureStart || !closureEnd}>
            Ajouter
          </Button>
          <ul className="space-y-2 text-sm">
            {closures.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                <span>
                  {fmt(c.startAt)} → {fmt(c.endAt)}
                  {c.reason ? ` · ${c.reason}` : ""}
                </span>
                <button
                  type="button"
                  className="text-xs text-ink/45 underline"
                  onClick={() =>
                    deletePlanningItemApi("closure", c.id)
                      .then(refresh)
                      .catch((e) => toast(e.message, "error"))
                  }
                >
                  Suppr.
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface space-y-3 p-4">
          <h2 className="font-medium">Heures supplémentaires</h2>
          <select
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={otStaff}
            onChange={(e) => setOtStaff(e.target.value)}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
          <Input type="datetime-local" value={otStart} onChange={(e) => setOtStart(e.target.value)} />
          <Input type="datetime-local" value={otEnd} onChange={(e) => setOtEnd(e.target.value)} />
          <Input placeholder="Motif" value={otReason} onChange={(e) => setOtReason(e.target.value)} />
          <Button type="button" onClick={addOt} disabled={!otStaff || !otStart || !otEnd}>
            Ajouter
          </Button>
          <ul className="space-y-2 text-sm">
            {overtimes.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                <span>
                  {staff.find((s) => s.id === o.staffId)?.displayName ?? o.staffId}
                  <br />
                  {fmt(o.startAt)} → {fmt(o.endAt)}
                </span>
                <button
                  type="button"
                  className="text-xs text-ink/45 underline"
                  onClick={() =>
                    deletePlanningItemApi("overtime", o.id)
                      .then(refresh)
                      .catch((e) => toast(e.message, "error"))
                  }
                >
                  Suppr.
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface space-y-3 p-4">
          <h2 className="font-medium">Remplacement</h2>
          <label className="block text-xs text-ink/50">Absente</label>
          <select
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={repAbsent}
            onChange={(e) => setRepAbsent(e.target.value)}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
          <label className="block text-xs text-ink/50">Remplaçante</label>
          <select
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={repSub}
            onChange={(e) => setRepSub(e.target.value)}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
          <Input type="datetime-local" value={repStart} onChange={(e) => setRepStart(e.target.value)} />
          <Input type="datetime-local" value={repEnd} onChange={(e) => setRepEnd(e.target.value)} />
          <Input placeholder="Motif" value={repReason} onChange={(e) => setRepReason(e.target.value)} />
          <Button type="button" onClick={addRep} disabled={!repAbsent || !repSub || !repStart || !repEnd}>
            Ajouter
          </Button>
          <ul className="space-y-2 text-sm">
            {replacements.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                <span>
                  {r.absentName} → {r.substituteName}
                  <br />
                  {fmt(r.startAt)} → {fmt(r.endAt)}
                </span>
                <button
                  type="button"
                  className="text-xs text-ink/45 underline"
                  onClick={() =>
                    deletePlanningItemApi("replacement", r.id)
                      .then(refresh)
                      .catch((e) => toast(e.message, "error"))
                  }
                >
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
