"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  PauseCircle,
  Pencil,
  Shield,
  Sparkles,
  Timer,
  Wrench,
} from "lucide-react";
import {
  formatTime,
  liveChipClass,
  liveStatus,
  LIVE_STATUS_LABEL,
  remainingMinutes,
  resourceTypeIcon,
  timelineBlocks,
  todayISO,
} from "@/components/resources/resource-helpers";
import { cn } from "@/lib/utils";
import { getResource, getResourceAvailability } from "@/modules/resources/service";
import type { Appointment } from "@/types/appointment";
import type {
  ResourceAvailability,
  ResourceDetail,
  ResourceListItem,
} from "@/types/resource";
import { RESOURCE_TYPE_LABEL } from "@/types/resource";

type ResourceFocusPanelProps = {
  resourceId: string;
  fallback: ResourceListItem;
  current?: Appointment;
  next?: Appointment;
  todayCount: number;
  insight: string;
  canWrite: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onMaintenance: () => void;
};

export function ResourceFocusPanel({
  resourceId,
  fallback,
  current,
  next,
  todayCount,
  insight,
  canWrite,
  onEdit,
  onToggle,
  onMaintenance,
}: ResourceFocusPanelProps) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [availability, setAvailability] = useState<ResourceAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    const day = todayISO();
    (async () => {
      try {
        const [res, avail] = await Promise.all([
          getResource(resourceId),
          getResourceAvailability(resourceId, day).catch(() => null),
        ]);
        if (cancelled) return;
        setDetail(res);
        setAvailability(avail);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const resource = detail ?? fallback;
  const status = liveStatus(resource, current, next);
  const Icon = resourceTypeIcon(resource.type);
  const blocks = useMemo(
    () => timelineBlocks(availability?.slots ?? []),
    [availability],
  );
  const enabledServices = (detail?.services ?? []).filter((s) => s.active);
  const left = current ? remainingMinutes(current.endAt) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Shield size={16} />
          Anti-collision agenda
        </div>
        <h4 className="text-[16px] font-bold text-ink">Une cabine, un créneau</h4>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">
          L’agenda refuse les doubles réservations sur cette ressource et bloque les plages en
          maintenance. Aucun incident à afficher pour le moment.
        </p>
        <Link
          href="/planning/"
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary"
        >
          <CalendarDays size={14} />
          Ouvrir le planning
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFD9DE] text-primary">
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Fiche ressource
              </p>
              <h3 className="truncate text-[18px] font-bold text-ink">{resource.name}</h3>
              <p className="text-[13px] text-ink/50">
                {RESOURCE_TYPE_LABEL[resource.type]}
                {resource.location ? ` · ${resource.location}` : ""}
              </p>
            </div>
          </div>
          {canWrite ? (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={onEdit}
                title="Modifier"
                className="rounded-lg bg-[#FCE9F4] p-2 text-ink/50 hover:text-primary"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={onToggle}
                title={resource.active ? "Désactiver" : "Réactiver"}
                className="rounded-lg bg-[#FCE9F4] p-2 text-ink/50 hover:text-amber-700"
              >
                <PauseCircle size={16} />
              </button>
            </div>
          ) : null}
        </div>

        <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold", liveChipClass(status))}>
          {LIVE_STATUS_LABEL[status]}
        </span>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-[#FFEFF8] p-2">
            <span className="block text-[11px] text-ink/40">Capacité</span>
            <span className="text-[13px] font-bold text-ink">{resource.capacity}</span>
          </div>
          <div className="rounded-lg bg-[#FFEFF8] p-2">
            <span className="block text-[11px] text-ink/40">Services</span>
            <span className="text-[13px] font-bold text-ink">{resource.serviceCount}</span>
          </div>
          <div className="rounded-lg bg-[#FFEFF8] p-2">
            <span className="block text-[11px] text-ink/40">RDV aujourd’hui</span>
            <span className="text-[13px] font-bold text-primary">{todayCount}</span>
          </div>
        </div>

        {current ? (
          <div className="rounded-lg bg-[#FFEFF8] p-3">
            <p className="text-[11px] uppercase text-ink/40">
              En cours · {formatTime(current.startAt)} → {formatTime(current.endAt)}
              {left != null ? ` · reste ${left} min` : ""}
            </p>
            <p className="mt-0.5 text-[14px] font-bold text-ink">{current.serviceName}</p>
            <p className="text-[12px] text-ink/55">
              {current.customerName} · {current.staffName}
            </p>
          </div>
        ) : next ? (
          <div className="rounded-lg bg-[#FFEFF8] p-3 text-[13px] text-ink/70">
            Prochain : {next.serviceName} à {formatTime(next.startAt)} · {next.staffName}
          </div>
        ) : (
          <p className="text-[13px] text-ink/45">Aucun rendez-vous en cours sur cette ressource.</p>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
              Timeline du jour
            </span>
            <span className="text-[12px] font-semibold text-primary">
              {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="relative h-10 overflow-hidden rounded-lg bg-[#FFEFF8]">
            {loading && !availability ? (
              <p className="flex h-full items-center justify-center text-[11px] text-ink/40">…</p>
            ) : blocks.length === 0 ? (
              <p className="flex h-full items-center justify-center text-[11px] text-ink/45">
                Journée libre
              </p>
            ) : (
              blocks.map((b, i) => (
                <div
                  key={`${b.label}-${i}`}
                  title={b.label}
                  className={cn(
                    "absolute top-1 bottom-1 overflow-hidden rounded px-0.5 text-center text-[9px] font-semibold leading-8",
                    b.kind === "maintenance"
                      ? "bg-amber-200 text-amber-900"
                      : b.current
                        ? "bg-primary text-white"
                        : "bg-[#F0DDE9] text-ink/55",
                  )}
                  style={{ left: `${b.left}%`, width: `${b.width}%` }}
                >
                  {b.width > 12 ? b.label : ""}
                </div>
              ))
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink/35">
            <span>09:00</span>
            <span>12:00</span>
            <span>15:00</span>
            <span>18:00</span>
            <span>20:00</span>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/40">
            Prestations associées
          </p>
          {loading && !detail ? (
            <p className="text-[12px] text-ink/40">Chargement…</p>
          ) : enabledServices.length === 0 && resource.serviceNames.length === 0 ? (
            <p className="text-[12px] text-ink/45">Aucune prestation liée.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(enabledServices.length ? enabledServices.map((s) => s.serviceName) : resource.serviceNames)
                .slice(0, 8)
                .map((name) => (
                  <span key={name} className="rounded bg-[#FCE9F4] px-2 py-0.5 text-[11px] text-ink/60">
                    {name}
                  </span>
                ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-[#FFEFF8] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Sparkles size={14} />
            Insight espaces
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink">{insight}</p>
        </div>

        {canWrite ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onMaintenance}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#FCE9F4] text-[13px] font-semibold text-ink"
            >
              <Wrench size={15} className="text-[#7B5900]" />
              Maintenance
            </button>
            <Link
              href={`/resources/${resourceId}/`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F0DDE9] text-[13px] font-semibold text-primary"
            >
              <Timer size={15} />
              Fiche complète
            </Link>
          </div>
        ) : (
          <Link
            href={`/resources/${resourceId}/`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#F0DDE9] text-[13px] font-semibold text-primary"
          >
            Fiche complète
          </Link>
        )}
      </div>
    </div>
  );
}
