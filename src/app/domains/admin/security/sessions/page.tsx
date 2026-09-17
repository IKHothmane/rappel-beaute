"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import { fetchAdminAudit } from "@/modules/admin/client";
import { platformAuditActionLabel } from "@/types/platform";

type AuditRow = Awaited<ReturnType<typeof fetchAdminAudit>>["items"][number];

const LOGIN_ACTIONS = new Set([
  "PLATFORM_LOGIN",
  "LOGIN",
  "USER_SESSIONS_INVALIDATED",
  "SUPPORT_SESSION_STARTED",
  "SUPPORT_SESSION_ENDED",
]);

export default function SecuritySessionsPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAudit(120)
      .then((res) =>
        setItems(res.items.filter((i) => LOGIN_ACTIONS.has(i.action))),
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Connexions"
        description="Connexions plateforme, sessions assistance et invalidations (extrait du journal d'audit)."
      />

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">
          Aucune connexion récente dans le journal.
        </p>
      ) : (
        <ul className="ac-card divide-y divide-[var(--admin-line)]">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-5 py-4 text-sm">
              <span className="font-mono text-[11px] text-[var(--admin-muted)]">
                {new Date(n.createdAt).toLocaleString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{platformAuditActionLabel(n.action)}</p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {n.platformUserName ?? "Système"}
                  {n.organizationId ? (
                    <>
                      {" · "}
                      <Link
                        href={adminHref(`/organizations/${n.organizationId}/`)}
                        className="text-[var(--admin-accent)]"
                      >
                        {n.organizationName ?? n.organizationId}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-[var(--admin-muted)]">
        Journal complet :{" "}
        <Link href={adminHref("/audit/")} className="text-[var(--admin-accent)] underline">
          Sécurité → Journal d&apos;audit
        </Link>
      </p>
    </>
  );
}
