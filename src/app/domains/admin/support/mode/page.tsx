import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { ORGANIZATIONS } from "@/lib/admin-mock";

export const metadata: Metadata = { title: "Mode assistance" };

export default function SupportModePickerPage() {
  return (
    <>
      <AdminPageHeader
        title="Mode assistance"
        description="Choisissez un institut. Toute session est journalisée."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {ORGANIZATIONS.filter((o) => o.status !== "SUSPENDED").map((org) => (
          <li key={org.id}>
            <Link
              href={`/organizations/${org.id}/support/`}
              className="ac-card block p-5 hover:bg-[#FBF4F6]"
            >
              <p className="font-medium">{org.name}</p>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                {org.city} · {org.ownerName}
              </p>
              <p className="mt-3 text-sm text-[var(--admin-accent)]">
                Entrer en mode assistance →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
