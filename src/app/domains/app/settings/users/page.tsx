"use client";

import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, ListRow } from "@/components/app/AppUi";
import { ROLE_LABEL } from "@/lib/rbac";
import { listOrgUsers } from "@/modules/users/service";
import type { OrgUserListItem } from "@/lib/db/users";

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<OrgUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listOrgUsers();
      setUsers(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AppPageHeader
        title="Utilisateurs & permissions"
        description="Comptes de votre institut — données PostgreSQL via session."
      />

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : users.length === 0 ? (
        <p className="surface p-6 text-sm text-ink/55">Aucun utilisateur.</p>
      ) : (
        <ul className="surface divide-y divide-line text-sm">
          {users.map((u) => (
            <ListRow
              key={u.id}
              left={
                <span className="font-medium">
                  {u.firstName} {u.lastName}
                  <span className="mt-0.5 block text-xs font-normal text-ink/45">
                    {u.email}
                  </span>
                </span>
              }
              right={
                <span className="text-right">
                  {ROLE_LABEL[u.role] ?? u.role}
                  {u.status === "DISABLED" ? (
                    <span className="mt-0.5 block text-xs text-red-600">Désactivé</span>
                  ) : null}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}
