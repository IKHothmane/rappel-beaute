"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import { fetchSupportSessions } from "@/modules/admin/client";
import type { SupportSessionListItem } from "@/types/platform";

export default function SupportPage() {
  const [items, setItems] = useState<SupportSessionListItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSupportSessions()
      .then((res) => {
        setItems(res.items);
        setOpenCount(res.openCount);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Support"
        description="Sessions d'assistance journalisées (SupportSession) — pas de tickets fictifs."
        action={
          <Link href="/support/mode/" className="ac-btn-ghost">
            Mode assistance
          </Link>
        }
      />

      <div className="mb-6">
        <StatTile label="Sessions ouvertes" value={loading ? "…" : String(openCount)} />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">
          Aucune session d&apos;assistance.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/support/${t.id}/`} className="ac-card block p-5 hover:bg-[#FBF4F6]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs text-[var(--admin-accent)]">{t.id}</p>
                  <span className="text-xs text-[var(--admin-muted)]">
                    {t.open ? "Ouverte" : "Terminée"}
                  </span>
                </div>
                <p className="mt-2 font-medium">{t.organizationName}</p>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  {t.reason ? `« ${t.reason} »` : "Sans motif"} · {t.platformUserName}
                </p>
                <p className="mt-1 font-mono text-[10px] text-[var(--admin-muted)]">
                  {new Date(t.startedAt).toLocaleString("fr-FR")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
