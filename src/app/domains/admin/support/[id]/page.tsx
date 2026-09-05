"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { fetchSupportSession } from "@/modules/admin/client";
import type { SupportSessionListItem } from "@/types/platform";

export default function SupportSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [item, setItem] = useState<SupportSessionListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchSupportSession(id)
      .then((res) => setItem(res.item))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!loading && (error || !item)) {
    if (error?.includes("404") || error?.includes("introuvable")) notFound();
  }

  return (
    <>
      <Link href="/support/" className="text-sm text-[var(--admin-accent)]">
        ← Sessions
      </Link>
      <div className="mt-4">
        <AdminPageHeader
          title={item ? `Session · ${item.organizationName}` : "Session assistance"}
          description={item?.reason ?? "SupportSession PostgreSQL"}
          action={
            item ? (
              <Link href={`/organizations/${item.organizationId}/support/`} className="ac-btn">
                Mode assistance
              </Link>
            ) : undefined
          }
        />
      </div>

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}
      {error && !item ? <p className="text-sm text-red-600">{error}</p> : null}

      {item ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="ac-card space-y-3 p-5 text-sm">
            <h2 className="font-display text-lg font-semibold">Détail</h2>
            <p>
              <span className="text-[var(--admin-muted)]">Institut : </span>
              <Link
                href={`/organizations/${item.organizationId}/`}
                className="text-[var(--admin-accent)]"
              >
                {item.organizationName}
              </Link>
            </p>
            <p>
              <span className="text-[var(--admin-muted)]">Agent : </span>
              {item.platformUserName}
            </p>
            <p>
              <span className="text-[var(--admin-muted)]">Début : </span>
              {new Date(item.startedAt).toLocaleString("fr-FR")}
            </p>
            <p>
              <span className="text-[var(--admin-muted)]">Fin : </span>
              {item.endedAt ? new Date(item.endedAt).toLocaleString("fr-FR") : "En cours"}
            </p>
            <p className="text-[var(--admin-muted)]">{item.reason ?? "Sans motif"}</p>
          </section>
          <section className="ac-card p-5 text-sm">
            <h2 className="font-display text-lg font-semibold">Identifiant</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--admin-bg)] p-3 font-mono text-[11px] text-[var(--admin-muted)]">
              {item.id}
            </pre>
          </section>
        </div>
      ) : null}
    </>
  );
}
