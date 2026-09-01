import type { Metadata } from "next";
import { AppPageHeader, ListRow } from "@/components/app/AppUi";
import { ROLE_LABEL } from "@/lib/app-mock";

export const metadata: Metadata = { title: "Utilisateurs" };

const USERS = [
  { name: "Nadia", role: "OWNER" as const },
  { name: "Sara", role: "MANAGER" as const },
  { name: "Chaimae", role: "STAFF" as const },
  { name: "Fatima", role: "CASHIER" as const },
];

export default function SettingsUsersPage() {
  return (
    <>
      <AppPageHeader
        title="Utilisateurs & permissions"
        description="Rôles fixes V1 — matrice côté backend."
        action={
          <button type="button" className="btn-primary">
            + Utilisateur
          </button>
        }
      />
      <ul className="surface divide-y divide-line text-sm">
        {USERS.map((u) => (
          <ListRow
            key={u.name}
            left={<span className="font-medium">{u.name}</span>}
            right={ROLE_LABEL[u.role]}
          />
        ))}
      </ul>
    </>
  );
}
