"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { fetchAdminUsers } from "@/modules/admin/client";
import { ORG_USER_ROLE_LABEL, type PlatformOrgUser } from "@/types/platform";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("ALL");
  const [items, setItems] = useState<PlatformOrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchAdminUsers({
          search: q || undefined,
          role: role === "ALL" ? undefined : role,
        });
        if (!cancelled) setItems(res.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, role]);

  const rows = useMemo(() => items, [items]);

  return (
    <>
      <AdminPageHeader
        title="Utilisateurs"
        description="Comptes institut — PostgreSQL via /api/admin/users."
      />

      <div className="mb-4 flex flex-col gap-3 ac-card p-4 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          className="ac-input sm:max-w-xs"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="ac-input sm:w-auto"
        >
          <option value="ALL">Tous les rôles</option>
          <option value="OWNER">Propriétaire</option>
          <option value="MANAGER">Responsable</option>
          <option value="STAFF">Employée</option>
          <option value="CASHIER">Caisse</option>
          <option value="ACCOUNTANT">Comptable</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">Aucun utilisateur.</p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto ac-card md:block">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Institut</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Créé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-line)]">
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/organizations/${u.organizationId}/`}
                        className="text-[var(--admin-accent)]"
                      >
                        {u.organizationName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{ORG_USER_ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="px-4 py-3">
                      {u.status === "ACTIVE" ? "Actif" : "Désactivé"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((u) => (
              <div key={u.id} className="ac-card p-4 text-sm">
                <p className="font-medium">
                  {u.firstName} {u.lastName}
                </p>
                <p className="text-xs text-[var(--admin-muted)]">{u.email}</p>
                <p className="mt-2 text-xs">
                  {u.organizationName} · {ORG_USER_ROLE_LABEL[u.role] ?? u.role}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
