"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import type { Organization } from "@/lib/admin-mock";

export function SupportPanel({ org }: { org: Organization }) {
  const [started, setStarted] = useState(false);
  const [reason, setReason] = useState("Ticket #1024");
  const [ended, setEnded] = useState(false);

  return (
    <>
      <AdminPageHeader
        title="Mode assistance"
        description={`${org.name} — toute session est journalisée.`}
      />

      <div className="mx-auto max-w-lg ac-card p-6 sm:p-8">
        <p className="text-sm text-[var(--admin-muted)]">
          Vous voyez l’espace institut (tableau de bord, agenda, clientes…) sans
          pouvoir contourner l’audit. Motif obligatoire.
        </p>

        <label className="mt-6 block text-sm">
          <span className="mb-1.5 block text-[var(--admin-muted)]">Motif</span>
          <input
            className="ac-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">Institut</dt>
            <dd>{org.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">Propriétaire</dt>
            <dd>{org.ownerEmail}</dd>
          </div>
        </dl>

        {!started ? (
          <button
            type="button"
            className="ac-btn mt-8 w-full"
            onClick={() => setStarted(true)}
          >
            Entrer en mode assistance
          </button>
        ) : !ended ? (
          <div className="mt-8 space-y-3">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Session active (simulée). Action journalisée :
              SUPPORT_IMPERSONATION_START
            </p>
            <div className="rounded-lg border border-line bg-paper p-3 font-mono text-[11px] text-ink/55">
              Super Admin · Osman
              <br />
              Organisation : {org.name}
              <br />
              Motif : {reason}
              <br />
              Date : 30/08/2026 21:45
            </div>
            <button type="button" className="ac-btn-ghost w-full" onClick={() => setEnded(true)}>
              Quitter le mode assistance
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-[var(--admin-ok)]">
              Session terminée et journalisée.
            </p>
            <Link href={`/organizations/${org.id}/`} className="ac-btn inline-flex w-full justify-center">
              Retour à la fiche
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
