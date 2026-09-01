"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { ROLE_LABEL, USERS, type UserRole } from "@/lib/admin-mock";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");

  const rows = useMemo(() => {
    return USERS.filter((u) => {
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.orgName}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (role !== "ALL" && u.role !== role) return false;
      return true;
    });
  }, [q, role]);

  return (
    <>
      <AdminPageHeader
        title="Utilisateurs"
        description="Tous les comptes institut de la plateforme."
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
          onChange={(e) => setRole(e.target.value as UserRole | "ALL")}
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

      <div className="hidden overflow-x-auto ac-card md:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Institut</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Dernière connexion</th>
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
                  <Link href={`/organizations/${u.orgId}/`} className="text-[var(--admin-accent)]">
                    {u.orgName}
                  </Link>
                </td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3">
                  {u.status === "ACTIVE" ? "Actif" : "Désactivé"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                  {u.lastLogin}
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
              {u.orgName} · {ROLE_LABEL[u.role]}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button type="button" className="ac-btn-ghost px-2 py-1">Voir</button>
              <button type="button" className="ac-btn-ghost px-2 py-1">Désactiver</button>
              <button type="button" className="ac-btn-ghost px-2 py-1">Réinitialiser</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
