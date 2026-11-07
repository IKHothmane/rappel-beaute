"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Wrench } from "lucide-react";

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
  canWrite: boolean;
  onEdit: () => void;
  onMaintenance: () => void;
};

export function ResourceFocusPanel({
  resourceId,
  fallback,
  current,
  next,
  todayCount,
  canWrite,
  onEdit,
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
  const [imageFailed, setImageFailed] = useState(false);
  const blocks = useMemo(
    () => timelineBlocks(availability?.slots ?? []),
    [availability],
  );
  const enabledServices = (detail?.services ?? []).filter((s) => s.active);
  const left = current ? remainingMinutes(current.endAt) : null;

  useEffect(() => {
    setImageFailed(false);
  }, [resource.imageUrl, resourceId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 overflow-hidden rounded-[22px] border border-[#EFDCE4] bg-white shadow-lg">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#FDE3ED] via-[#F8CEDF] to-[#F0B8D0]">
          {resource.imageUrl && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resource.imageUrl}
              alt={resource.name}
              width={800}
              height={500}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain object-center"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-[#A63869]">
              <Icon size={30} strokeWidth={1.4} />
              <span className="line-clamp-2 text-center text-xs font-semibold">
                {resource.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#A71350]">
                Fiche ressource
              </p>
              <h3 className="mt-1 font-serif text-2xl font-bold text-[#54112F]">{resource.name}</h3>
              <p className="mt-1 text-[13px] text-[#765164]">
                {RESOURCE_TYPE_LABEL[resource.type]}
              </p>
            </div>
            {canWrite ? (
              <button
                type="button"
                onClick={onEdit}
                title="Modifier"
                className="rounded-xl border border-[#EFDCE4] bg-white p-2 text-[#765164] hover:bg-[#FFF0F6] hover:text-[#A71350]"
              >
                <Pencil size={16} />
              </button>
            ) : null}
          </div>

          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
              liveChipClass(status),
            )}
          >
            {LIVE_STATUS_LABEL[status]}
          </span>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-[#FFF0F6] p-4">
              <span className="block text-[11px] text-[#846A79]">Services</span>
              <span className="mt-1 block text-[13px] font-bold text-[#43182D]">{resource.serviceCount}</span>
            </div>
            <div className="rounded-2xl bg-[#FFF0F6] p-4">
              <span className="block text-[11px] text-[#846A79]">RDV j.</span>
              <span className="mt-1 block text-[13px] font-bold text-[#A71350]">{todayCount}</span>
            </div>
          </div>

          {current ? (
            <div className="rounded-2xl bg-[#FFF0F6] p-4">
              <p className="text-[11px] uppercase text-[#846A79]">
                En cours · {formatTime(current.startAt)} → {formatTime(current.endAt)}
                {left != null ? ` · reste ${left} min` : ""}
              </p>
              <p className="mt-0.5 text-[14px] font-bold text-[#43182D]">{current.serviceName}</p>
              <p className="text-[12px] text-[#765164]">
                {current.customerName} · {current.staffName}
              </p>
            </div>
          ) : next ? (
            <div className="rounded-2xl bg-[#FFF0F6] p-4 text-[13px] text-[#765164]">
              Prochain : {next.serviceName} à {formatTime(next.startAt)} · {next.staffName}
            </div>
          ) : (
            <p className="text-[13px] text-[#846A79]">Aucun rendez-vous en cours sur cette ressource.</p>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#846A79]">
                Timeline du jour
              </span>
              <span className="text-[12px] font-semibold text-[#A71350]">
                {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="relative h-10 overflow-hidden rounded-2xl bg-[#FFF0F6]">
              {loading && !availability ? (
                <p className="flex h-full items-center justify-center text-[11px] text-[#846A79]">…</p>
              ) : blocks.length === 0 ? (
                <p className="flex h-full items-center justify-center text-[11px] text-[#846A79]">
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
                          ? "bg-[#A71350] text-white"
                          : "bg-[#F0DDE9] text-[#765164]",
                    )}
                    style={{ left: `${b.left}%`, width: `${b.width}%` }}
                  >
                    {b.width > 12 ? b.label : ""}
                  </div>
                ))
              )}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#AA8F9C]">
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>20:00</span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#846A79]">
              Prestations associées
            </p>
            {loading && !detail ? (
              <p className="text-[12px] text-[#846A79]">Chargement…</p>
            ) : enabledServices.length === 0 && resource.serviceNames.length === 0 ? (
              <p className="text-[12px] text-[#846A79]">Aucune prestation liée.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(enabledServices.length
                  ? enabledServices.map((s) => s.serviceName)
                  : resource.serviceNames
                )
                  .slice(0, 8)
                  .map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-[#FFF0F6] px-2.5 py-1 text-[11px] text-[#765164]"
                    >
                      {name}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {canWrite ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#A71350] text-[13px] font-semibold text-white"
              >
                <Pencil size={15} />
                Modifier
              </button>
              <button
                type="button"
                onClick={onMaintenance}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#EFDCE4] bg-white text-[13px] font-semibold text-[#54112F]"
              >
                <Wrench size={15} />
                Planifier
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
