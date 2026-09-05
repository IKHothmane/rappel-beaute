"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import {
  endSupportSessionApi,
  startSupportSessionApi,
} from "@/modules/admin/client";
import type { OrganizationDetail } from "@/types/platform";

export function SupportPanel({ org }: { org: OrganizationDetail }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [ended, setEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  async function start() {
    if (!reason.trim()) {
      setError("Motif obligatoire.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await startSupportSessionApi(org.id, reason.trim());
      setSessionId(res.sessionId);
      setStartedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      await endSupportSessionApi(sessionId);
      setEnded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Mode assistance"
        description={`${org.name} — session journalisée en PostgreSQL.`}
      />

      <div className="mx-auto max-w-lg ac-card p-6 sm:p-8">
        <p className="text-sm text-[var(--admin-muted)]">
          Démarre une SupportSession auditée (SUPPORT_SESSION_STARTED).
        </p>

        <label className="mt-6 block text-sm">
          <span className="mb-1.5 block text-[var(--admin-muted)]">Motif</span>
          <input
            className="ac-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={Boolean(sessionId)}
            placeholder="Ex. diagnostic agenda"
          />
        </label>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">Institut</dt>
            <dd>{org.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">Propriétaire</dt>
            <dd>{org.ownerEmail ?? "—"}</dd>
          </div>
        </dl>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {!sessionId ? (
          <button
            type="button"
            className="ac-btn mt-8 w-full"
            onClick={() => void start()}
            disabled={busy}
          >
            {busy ? "Démarrage…" : "Entrer en mode assistance"}
          </button>
        ) : !ended ? (
          <div className="mt-8 space-y-3">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Session active · journalisée
            </p>
            <div className="rounded-lg border border-line bg-paper p-3 font-mono text-[11px] text-ink/55">
              Session : {sessionId}
              <br />
              Organisation : {org.name}
              <br />
              Motif : {reason}
              <br />
              Date : {startedAt ? new Date(startedAt).toLocaleString("fr-FR") : "—"}
            </div>
            <button
              type="button"
              className="ac-btn-ghost w-full"
              onClick={() => void end()}
              disabled={busy}
            >
              Quitter le mode assistance
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-[var(--admin-ok)]">Session terminée et journalisée.</p>
            <Link
              href={`/organizations/${org.id}/`}
              className="ac-btn inline-flex w-full justify-center"
            >
              Retour à la fiche
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
