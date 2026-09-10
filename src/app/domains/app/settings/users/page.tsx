"use client";

import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, ListRow } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { canWriteFeature, ROLE_LABEL } from "@/lib/rbac";
import type { OrgUserListItem } from "@/lib/db/users";
import {
  listOrgUsers,
  resetUserTemporaryPassword,
  type ResetPasswordResult,
} from "@/modules/users/service";

export default function SettingsUsersPage() {
  const current = useCurrentUser();
  const canReset = canWriteFeature(current.role, "settings");
  const { toast } = useToast();

  const [users, setUsers] = useState<OrgUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [result, setResult] = useState<ResetPasswordResult | null>(null);
  const [copied, setCopied] = useState<"password" | "message" | null>(null);

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

  async function handleReset(user: OrgUserListItem) {
    if (!canReset || user.status !== "ACTIVE") return;
    const ok = window.confirm(
      `Réinitialiser le mot de passe de ${user.firstName} ${user.lastName} ?\n\nL'ancien mot de passe sera immédiatement invalidé.`,
    );
    if (!ok) return;

    setResettingId(user.id);
    try {
      const data = await resetUserTemporaryPassword(user.id);
      setResult(data);
      setCopied(null);
      toast("Mot de passe temporaire généré.", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Réinitialisation impossible.", "error");
    } finally {
      setResettingId(null);
    }
  }

  async function copyText(text: string, kind: "password" | "message") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast(kind === "password" ? "Mot de passe copié." : "Message copié.", "success");
    } catch {
      toast("Impossible de copier.", "error");
    }
  }

  return (
    <>
      <AppPageHeader
        title="Utilisateurs & permissions"
        description="Comptes de votre institut — réinitialisation admin avec mot de passe temporaire."
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
                  {u.mustChangePassword ? (
                    <span className="mt-0.5 block text-xs text-amber-700">
                      Changement de mot de passe requis
                    </span>
                  ) : null}
                </span>
              }
              right={
                <span className="flex flex-col items-end gap-2 text-right">
                  <span>
                    {ROLE_LABEL[u.role] ?? u.role}
                    {u.status === "DISABLED" ? (
                      <span className="mt-0.5 block text-xs text-red-600">Désactivé</span>
                    ) : null}
                  </span>
                  {canReset && u.status === "ACTIVE" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={resettingId === u.id}
                      onClick={() => void handleReset(u)}
                    >
                      {resettingId === u.id ? "…" : "Réinitialiser le mot de passe"}
                    </Button>
                  ) : null}
                </span>
              }
            />
          ))}
        </ul>
      )}

      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title="Mot de passe temporaire"
      >
        {result ? (
          <div className="space-y-4 text-sm">
            <p className="text-ink/60">
              Affiché une seule fois. Copiez-le maintenant puis envoyez-le à{" "}
              <strong>{result.firstName} {result.lastName}</strong>.
            </p>

            <div className="rounded-xl bg-ink/[0.03] p-4">
              <p className="text-xs text-ink/45">Email</p>
              <p className="font-medium">{result.email}</p>
              <p className="mt-3 text-xs text-ink/45">Mot de passe temporaire</p>
              <p className="font-mono text-base font-semibold tracking-wide">
                {result.temporaryPassword}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copyText(result.temporaryPassword, "password")}
              >
                {copied === "password" ? "Copié ✓" : "Copier le mot de passe"}
              </Button>
              <Button
                size="sm"
                onClick={() => void copyText(result.messageTemplate, "message")}
              >
                {copied === "message" ? "Message copié ✓" : "Copier le message complet"}
              </Button>
            </div>

            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-paper p-3 text-xs text-ink/70">
              {result.messageTemplate}
            </pre>

            <p className="text-xs text-amber-800">
              L&apos;ancien mot de passe est invalidé. À la connexion, l&apos;utilisateur devra
              obligatoirement en choisir un nouveau.
            </p>

            <Button className="w-full" variant="secondary" onClick={() => setResult(null)}>
              Fermer
            </Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
