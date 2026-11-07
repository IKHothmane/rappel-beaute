"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Pencil,
  Wrench,
} from "lucide-react";
import type { LiveStatus } from "@/components/resources/resource-helpers";
import {
  LIVE_STATUS_LABEL,
  resourceTypeIcon,
} from "@/components/resources/resource-helpers";
import type { ResourceListItem } from "@/types/resource";
import { RESOURCE_TYPE_LABEL } from "@/types/resource";

type Props = {
  resource: ResourceListItem;
  status: LiveStatus;
  selected: boolean;
  canWrite: boolean;
  onSelect: () => void;
  onEdit: () => void;
};

export function ResourcePremiumCard({
  resource,
  status,
  selected,
  canWrite,
  onSelect,
  onEdit,
}: Props) {
  const Icon = resourceTypeIcon(resource.type);
  const [imageFailed, setImageFailed] = useState(false);

  const statusStyle =
    status === "available"
      ? "bg-[#D5F6DF] text-[#126A3C]"
      : status === "occupied" || status === "soon"
        ? "bg-[#FFF0CD] text-[#98600A]"
        : "bg-[#FFE1E5] text-[#B42348]";

  return (
    <article
      className={`group overflow-hidden rounded-[20px] border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
        selected
          ? "border-[#A71350] bg-[#FFE8F1] shadow-[0_12px_28px_rgba(167,19,80,0.18)] ring-2 ring-[#A71350]/35"
          : "border-[#EFDCE4] bg-white shadow-[0_8px_24px_rgba(75,18,45,0.06)]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
        aria-label={`Consulter ${resource.name}`}
        aria-pressed={selected}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#FDE3ED] via-[#F8CEDF] to-[#F0B8D0]">
          {resource.imageUrl && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resource.imageUrl}
              alt={resource.name}
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

          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm ${statusStyle}`}
          >
            {status === "available" ? (
              <CheckCircle2 size={13} />
            ) : status === "maintenance" ? (
              <Wrench size={13} />
            ) : (
              <Clock3 size={13} />
            )}
            {LIVE_STATUS_LABEL[status]}
          </span>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                selected ? "bg-[#A71350] text-white" : "bg-[#FCE5EE] text-[#A71350]"
              }`}
            >
              <Icon size={20} />
            </span>

            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold text-[#41192D]">{resource.name}</h3>
              <p className="mt-1 text-xs text-[#A22A59]">{RESOURCE_TYPE_LABEL[resource.type]}</p>
            </div>
          </div>

          <div
            className={`flex items-center justify-between border-t pt-3 ${
              selected ? "border-[#F0C5D5]" : "border-[#F2E5EA]"
            }`}
          >
            <span className="text-xs text-[#846A79]">
              {resource.serviceCount} service{resource.serviceCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs font-semibold text-[#A71350]">
              {selected ? "Sélectionnée" : "Voir les détails"}
            </span>
          </div>
        </div>
      </button>

      {canWrite ? (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onEdit}
            className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${
              selected
                ? "bg-[#A71350] text-white hover:bg-[#801037]"
                : "bg-[#FCE5EE] text-[#A71350] hover:bg-[#F6CDDE]"
            }`}
          >
            <Pencil size={15} />
            Modifier
          </button>
        </div>
      ) : null}
    </article>
  );
}
