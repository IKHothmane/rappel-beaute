"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { NOTIFICATIONS, type NotifKind } from "@/lib/admin-mock";

const FILTERS: { id: NotifKind | "ALL"; label: string }[] = [
  { id: "ALL", label: "Toutes" },
  { id: "SYSTEM", label: "Système" },
  { id: "PAYMENT", label: "Paiement" },
  { id: "SECURITY", label: "Sécurité" },
  { id: "ORG", label: "Instituts" },
  { id: "SUPPORT", label: "Assistance" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotifKind | "ALL">("ALL");

  const rows = useMemo(
    () =>
      NOTIFICATIONS.filter((n) => (filter === "ALL" ? true : n.kind === filter)),
    [filter],
  );

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description="Alertes plateforme : paiements, expirations, système."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === f.id
                ? "bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]"
                : "border border-[var(--admin-line)] text-[var(--admin-muted)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="ac-card divide-y divide-[var(--admin-line)]">
        {rows.map((n) => (
          <li key={n.id} className="flex items-start gap-3 px-5 py-4 text-sm">
            <span
              className={
                n.tone === "red"
                  ? "text-[var(--admin-bad)]"
                  : n.tone === "yellow"
                    ? "text-[var(--admin-warn)]"
                    : "text-[var(--admin-ok)]"
              }
            >
              ●
            </span>
            <div className="min-w-0 flex-1">
              <p className={n.read ? "text-[var(--admin-muted)]" : "font-medium"}>
                {n.title}
              </p>
              <p className="mt-1 font-mono text-[10px] text-[var(--admin-muted)]">
                {n.at}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
