"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { fetchAdminAudit } from "@/modules/admin/client";
import { platformAuditActionLabel } from "@/types/platform";

type AuditRow = Awaited<ReturnType<typeof fetchAdminAudit>>["items"][number];

export default function NotificationsPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAudit(40)
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Activité plateforme"
        description="Flux basé sur PlatformAuditLog (pas de notifications fictives)."
      />

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">Aucune activité récente.</p>
      ) : (
        <ul className="ac-card divide-y divide-[var(--admin-line)]">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-5 py-4 text-sm">
              <span className="text-[var(--admin-accent)]">●</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{platformAuditActionLabel(n.action)}</p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {n.platformUserName ?? "Système"}
                  {n.organizationId ? (
                    <>
                      {" · "}
                      <Link
                        href={`/organizations/${n.organizationId}/`}
                        className="text-[var(--admin-accent)]"
                      >
                        {n.organizationName ?? n.organizationId}
                      </Link>
                    </>
                  ) : null}
                </p>
                <p className="mt-1 font-mono text-[10px] text-[var(--admin-muted)]">
                  {new Date(n.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
