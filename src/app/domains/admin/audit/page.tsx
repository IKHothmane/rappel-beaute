"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { fetchAdminAudit } from "@/modules/admin/client";
import { platformAuditActionLabel } from "@/types/platform";

type AuditRow = Awaited<ReturnType<typeof fetchAdminAudit>>["items"][number];

function fmtJson(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AuditRow[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAdminAudit(100);
        if (cancelled) return;
        setItems(res.items);
        setSelected(res.items[0]?.id ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return items;
    return items.filter((a) =>
      `${platformAuditActionLabel(a.action)} ${a.entityId} ${a.platformUserName ?? ""} ${a.organizationName ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [q, items]);

  const detail = items.find((a) => a.id === selected) ?? rows[0];

  return (
    <>
      <AdminPageHeader
        title="Audit et activité"
        description="Journal PostgreSQL PlatformAuditLog."
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrer…"
        className="ac-input mb-4 w-full max-w-md"
      />

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">Aucun événement d&apos;audit.</p>
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="ac-card">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Utilisateur</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Institut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-line)]">
                  {rows.map((a) => (
                    <tr
                      key={a.id}
                      className={`cursor-pointer hover:bg-[#FBF4F6] ${
                        selected === a.id ? "bg-[var(--admin-accent-dim)]" : ""
                      }`}
                      onClick={() => setSelected(a.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                        {new Date(a.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">{a.platformUserName ?? "—"}</td>
                      <td className="px-4 py-3">{platformAuditActionLabel(a.action)}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">
                        {a.organizationName ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 p-3 md:hidden">
              {rows.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected === a.id
                      ? "border-[var(--admin-accent)] bg-[var(--admin-accent-dim)]"
                      : "border-[var(--admin-line)] bg-[var(--admin-bg)]"
                  }`}
                >
                  <p className="text-sm font-medium">{platformAuditActionLabel(a.action)}</p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {a.platformUserName ?? "—"} · {a.organizationName ?? "Plateforme"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {detail ? (
            <aside className="ac-card space-y-3 p-4 text-sm sm:p-5">
              <h2 className="font-display text-lg font-semibold">Détail</h2>
              <p>
                <span className="text-[var(--admin-muted)]">Action : </span>
                {platformAuditActionLabel(detail.action)}
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Utilisateur : </span>
                {detail.platformUserName ?? "—"}
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Institut : </span>
                {detail.organizationId ? (
                  <Link
                    href={`/organizations/${detail.organizationId}/`}
                    className="text-[var(--admin-accent)]"
                  >
                    {detail.organizationName}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
              {detail.before != null ? (
                <div>
                  <p className="text-[var(--admin-muted)]">Avant</p>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--admin-bg)] p-2 font-mono text-[11px]">
                    {fmtJson(detail.before)}
                  </pre>
                </div>
              ) : null}
              {detail.after != null ? (
                <div>
                  <p className="text-[var(--admin-muted)]">Après</p>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--admin-bg)] p-2 font-mono text-[11px]">
                    {fmtJson(detail.after)}
                  </pre>
                </div>
              ) : null}
              <p className="font-mono text-xs text-[var(--admin-muted)]">
                {new Date(detail.createdAt).toLocaleString("fr-FR")}
              </p>
            </aside>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
