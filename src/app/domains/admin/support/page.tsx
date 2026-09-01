import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import { TICKETS, platformStats } from "@/lib/admin-mock";

export const metadata: Metadata = { title: "Support" };

const STATUS_FR = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
} as const;

export default function SupportPage() {
  const s = platformStats();

  return (
    <>
      <AdminPageHeader
        title="Support"
        description="Tickets des instituts — démonstration."
        action={
          <Link href="/support/mode/" className="ac-btn-ghost">
            Mode assistance
          </Link>
        }
      />

      <div className="mb-6">
        <StatTile label="Tickets ouverts" value={String(s.openTickets)} />
      </div>

      <ul className="space-y-3">
        {TICKETS.map((t) => (
          <li key={t.id}>
            <Link href={`/support/${t.id}/`} className="ac-card block p-5 hover:bg-[#FBF4F6]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-[var(--admin-accent)]">
                  #{t.number}
                </p>
                <span className="text-xs text-[var(--admin-muted)]">
                  {STATUS_FR[t.status]}
                </span>
              </div>
              <p className="mt-2 font-medium">{t.orgName}</p>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">« {t.subject} »</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
