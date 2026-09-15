"use client";

import { useEffect, useId, useState } from "react";

export type SensitiveActionKind =
  | "reset_password"
  | "disable"
  | "delete"
  | "role"
  | "invalidate_sessions";

const COPY: Record<
  SensitiveActionKind,
  { title: string; body: string; confirmLabel: string; requireTyped?: string }
> = {
  reset_password: {
    title: "Réinitialiser le mot de passe",
    body: "L’ancien mot de passe sera invalidé. Un mot de passe temporaire sera généré et toutes les sessions actives seront déconnectées.",
    confirmLabel: "Réinitialiser",
  },
  disable: {
    title: "Désactiver le compte",
    body: "L’utilisateur ne pourra plus se connecter. Ses sessions actives seront invalidées. Cette action est journalisée.",
    confirmLabel: "Désactiver",
  },
  delete: {
    title: "Supprimer le compte",
    body: "Le compte sera désactivé (pas d’effacement définitif). L’utilisateur ne pourra plus se connecter. Tapez SUPPRIMER pour confirmer.",
    confirmLabel: "Supprimer le compte",
    requireTyped: "SUPPRIMER",
  },
  role: {
    title: "Modifier le rôle",
    body: "Le changement de rôle modifie immédiatement les permissions de l’utilisateur. Cette action sensible est journalisée.",
    confirmLabel: "Confirmer le rôle",
  },
  invalidate_sessions: {
    title: "Déconnecter toutes les sessions",
    body: "Toutes les sessions actives de cet utilisateur seront invalidées immédiatement. Il devra se reconnecter.",
    confirmLabel: "Déconnecter",
  },
};

export function SensitiveConfirmDialog({
  open,
  kind,
  subject,
  detail,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  kind: SensitiveActionKind | null;
  subject: string;
  detail?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open, kind]);

  if (!open || !kind) return null;

  const conf = COPY[kind];
  const needsType = Boolean(conf.requireTyped);
  const canConfirm = !needsType || typed.trim().toUpperCase() === conf.requireTyped;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-lg"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-red-700">
          Action sensible
        </p>
        <h2 id={titleId} className="mt-2 font-display text-xl font-semibold text-ink">
          {conf.title}
        </h2>
        <p className="mt-1 text-sm font-medium text-ink">{subject}</p>
        {detail ? <p className="mt-1 text-xs text-[var(--admin-muted)]">{detail}</p> : null}
        <p className="mt-4 text-sm leading-relaxed text-ink/75">{conf.body}</p>
        {needsType && conf.requireTyped ? (
          <label className="mt-4 block text-sm">
            Tapez <span className="font-mono font-semibold">{conf.requireTyped}</span>
            <input
              className="ac-input mt-1"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="ac-btn-ghost" disabled={busy} onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            disabled={busy || !canConfirm}
            onClick={onConfirm}
          >
            {busy ? "…" : conf.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
