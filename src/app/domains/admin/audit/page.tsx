"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { AUDIT_LOG, auditActionLabel } from "@/lib/admin-mock";

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(AUDIT_LOG[0]?.id ?? "");

  const rows = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return AUDIT_LOG;
    return AUDIT_LOG.filter((a) =>
      `${auditActionLabel(a.action)} ${a.target} ${a.actor} ${a.orgName ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [q]);

  const detail = AUDIT_LOG.find((a) => a.id === selected) ?? rows[0];

  return (
    <>
      <AdminPageHeader
        title="Audit et activité"
        description="Journal de sécurité de toute la plateforme."
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrer…"
        className="ac-input mb-4 w-full max-w-md"
      />

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
                      {a.at.slice(11, 16)}
                    </td>
                    <td className="px-4 py-3">{a.actor}</td>
                    <td className="px-4 py-3">{auditActionLabel(a.action)}</td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">
                      {a.orgName ?? "—"}
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
                <p className="text-sm font-medium">{auditActionLabel(a.action)}</p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {a.actor} · {a.orgName ?? "Plateforme"} · {a.at.slice(11, 16)}
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
              {auditActionLabel(detail.action)}
            </p>
            <p>
              <span className="text-[var(--admin-muted)]">Utilisateur : </span>
              {detail.actor}
            </p>
            <p>
              <span className="text-[var(--admin-muted)]">Institut : </span>
              {detail.orgId ? (
                <Link
                  href={`/organizations/${detail.orgId}/`}
                  className="text-[var(--admin-accent)]"
                >
                  {detail.orgName}
                </Link>
              ) : (
                "—"
              )}
            </p>
            {detail.before ? (
              <div>
                <p className="text-[var(--admin-muted)]">Avant</p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--admin-bg)] p-2 font-mono text-[11px]">
                  {detail.before}
                </pre>
              </div>
            ) : null}
            {detail.after ? (
              <div>
                <p className="text-[var(--admin-muted)]">Après</p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--admin-bg)] p-2 font-mono text-[11px]">
                  {detail.after}
                </pre>
              </div>
            ) : null}
            {detail.ip ? (
              <p className="font-mono text-xs text-[var(--admin-muted)]">
                IP : {detail.ip}
              </p>
            ) : null}
            <p className="font-mono text-xs text-[var(--admin-muted)]">
              {detail.at.replace("T", " ")}
            </p>
          </aside>
        ) : null}
      </div>
    </>
  );
}
