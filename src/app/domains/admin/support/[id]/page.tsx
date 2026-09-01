import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { TICKETS, getTicket } from "@/lib/admin-mock";

type Props = { params: { id: string } };

export function generateStaticParams() {
  return TICKETS.map((t) => ({ id: t.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const t = getTicket(params.id);
  return { title: t ? `Ticket #${t.number}` : "Ticket" };
}

export default function TicketDetailPage({ params }: Props) {
  const t = getTicket(params.id);
  if (!t) notFound();

  return (
    <>
      <Link href="/support/" className="text-sm text-[var(--admin-accent)]">
        ← Tickets
      </Link>
      <div className="mt-4">
        <AdminPageHeader
          title={`#${t.number} — ${t.subject}`}
          description={t.orgName}
          action={
            <Link href={`/organizations/${t.orgId}/support/`} className="ac-btn">
              Mode assistance
            </Link>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ac-card space-y-3 p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">Détail</h2>
          <p>
            <span className="text-[var(--admin-muted)]">Institut : </span>
            {t.orgName}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Créé : </span>
            {t.createdAt}
          </p>
          <p className="text-[var(--admin-muted)]">{t.preview}</p>
        </section>
        <section className="ac-card p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">Journal technique</h2>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--admin-bg)] p-3 font-mono text-[11px] text-[var(--admin-muted)]">
{`ERROR appointment.create
code=EXCLUDE_VIOLATION
org=${t.orgId}
at=${t.createdAt}`}
          </pre>
        </section>
      </div>
    </>
  );
}
