"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  SensitiveConfirmDialog,
  type SensitiveActionKind,
} from "@/components/admin/SensitiveConfirmDialog";
import { adminHref } from "@/lib/admin/href";
import {
  fetchAdminUser,
  invalidateAdminUserSessions,
  patchAdminUser,
  resetAdminUserPassword,
} from "@/modules/admin/client";
import {
  ORG_USER_ROLE_LABEL,
  platformAuditActionLabel,
  type PlatformOrgUser,
} from "@/types/platform";

type Tab = "general" | "activity" | "role";

function parseTab(raw: string | null): Tab {
  if (raw === "activity" || raw === "role") return raw;
  return "general";
}

function UserDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const tab = parseTab(searchParams.get("tab"));
  const editing = searchParams.get("edit") === "1";

  const [user, setUser] = useState<PlatformOrgUser | null>(null);
  const [activity, setActivity] = useState<
    {
      id: string;
      platformUserName: string | null;
      action: string;
      createdAt: string;
      organizationName: string | null;
    }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<SensitiveActionKind | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [roleDraft, setRoleDraft] = useState("STAFF");

  const reload = useCallback(async () => {
    if (!id) return;
    const res = await fetchAdminUser(id);
    setUser(res.user);
    setActivity(res.activity);
    setForm({
      firstName: res.user.firstName,
      lastName: res.user.lastName,
      email: res.user.email,
    });
    setRoleDraft(res.user.role);
  }, [id]);

  useEffect(() => {
    reload().catch(console.error);
  }, [reload]);

  function setTab(next: Tab) {
    const u = new URL(adminHref(`/users/${id}/`), "https://local.invalid");
    if (next !== "general") u.searchParams.set("tab", next);
    u.searchParams.delete("edit");
    router.replace(`${u.pathname}${u.search}`);
  }

  async function executeSensitive(kind: SensitiveActionKind) {
    setBusy(true);
    try {
      if (kind === "reset_password") {
        const res = await resetAdminUserPassword(id);
        setTempPassword(res.temporaryPassword);
        setMessageTemplate(res.messageTemplate);
      } else if (kind === "invalidate_sessions") {
        await invalidateAdminUserSessions(id);
      } else if (kind === "disable") {
        await patchAdminUser(id, { status: "DISABLED" });
      } else if (kind === "delete") {
        await patchAdminUser(id, { status: "DISABLED", delete: true });
      } else if (kind === "role") {
        await patchAdminUser(id, { role: roleDraft });
        setTab("general");
      }
      setPending(null);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;
  }

  const isOrg = user.accountKind === "ORG";
  const subject = `${user.firstName} ${user.lastName}`.trim();

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await patchAdminUser(id, form);
      await reload();
      router.replace(adminHref(`/users/${id}/`));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link href={adminHref("/users/")} className="text-sm text-[var(--admin-accent)]">
        ← Utilisateurs
      </Link>

      <div className="mb-6 mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold md:text-3xl">
              {user.firstName} {user.lastName}
            </h1>
            <span
              className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                user.status === "ACTIVE"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {user.status === "ACTIVE" ? "Actif" : "Désactivé"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">{user.email}</p>
        </div>
        {isOrg ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40 lg:text-right">
              Actions sensibles
            </p>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link href={adminHref(`/users/${id}/?edit=1`)} className="ac-btn-ghost">
                Modifier
              </Link>
              <button
                type="button"
                className="ac-btn-ghost"
                disabled={busy}
                onClick={() => setPending("reset_password")}
              >
                Réinitialiser MDP
              </button>
              <button
                type="button"
                className="ac-btn-ghost"
                disabled={busy}
                onClick={() => setPending("invalidate_sessions")}
              >
                Déconnecter sessions
              </button>
              <Link href={adminHref(`/users/${id}/?tab=role`)} className="ac-btn-ghost">
                Gérer le rôle
              </Link>
              {user.status === "ACTIVE" ? (
                <>
                  <button
                    type="button"
                    className="ac-btn-ghost"
                    disabled={busy}
                    onClick={() => setPending("disable")}
                  >
                    Désactiver
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                    disabled={busy}
                    onClick={() => setPending("delete")}
                  >
                    Supprimer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ac-btn"
                  disabled={busy}
                  onClick={() =>
                    void (async () => {
                      setBusy(true);
                      try {
                        await patchAdminUser(id, { status: "ACTIVE" });
                        await reload();
                      } finally {
                        setBusy(false);
                      }
                    })()
                  }
                >
                  Réactiver
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">
            Compte Super Admin plateforme — actions limitées.
          </p>
        )}
      </div>

      {tempPassword ? (
        <div className="mb-6 ac-card max-w-lg space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Mot de passe temporaire</h2>
          <p className="rounded-lg bg-[#FBF4F6] px-4 py-3 text-center font-mono text-lg font-semibold">
            {tempPassword}
          </p>
          <p className="text-sm text-amber-800">À communiquer à l’utilisateur.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ac-btn"
              onClick={() => void navigator.clipboard?.writeText(tempPassword)}
            >
              Copier
            </button>
            <button
              type="button"
              className="ac-btn-ghost"
              onClick={() => void navigator.clipboard?.writeText(messageTemplate)}
            >
              Préparer le message
            </button>
            <button type="button" className="ac-btn-ghost" onClick={() => setTempPassword(null)}>
              Fermer
            </button>
          </div>
        </div>
      ) : null}

      {editing && isOrg ? (
        <form onSubmit={(e) => void onSaveProfile(e)} className="mb-8 ac-card max-w-xl space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Modifier le compte</h2>
          <label className="block text-sm">
            Prénom
            <input
              className="ac-input mt-1"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            Nom
            <input
              className="ac-input mt-1"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            E-mail
            <input
              type="email"
              className="ac-input mt-1"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="ac-btn" disabled={busy}>
              Enregistrer
            </button>
            <Link href={adminHref(`/users/${id}/`)} className="ac-btn-ghost">
              Annuler
            </Link>
          </div>
        </form>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--admin-line)]">
        {(
          [
            ["general", "Fiche"],
            ["role", "Rôle"],
            ["activity", "Activité"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 px-3 py-2 text-sm ${
              tab === key ? "text-[var(--admin-accent)]" : "text-[var(--admin-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <section className="ac-card max-w-xl space-y-3 p-5 text-sm">
          <p>
            <span className="text-[var(--admin-muted)]">E-mail</span>
            <br />
            {user.email}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Organisation</span>
            <br />
            {user.organizationId ? (
              <Link
                href={adminHref(`/organizations/${user.organizationId}/`)}
                className="font-medium text-[var(--admin-accent)]"
              >
                {user.organizationName} →
              </Link>
            ) : (
              "Plateforme (Super Admin)"
            )}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Rôle</span>
            <br />
            {ORG_USER_ROLE_LABEL[user.role] ?? user.role}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Statut</span>
            <br />
            {user.status === "ACTIVE" ? "Actif" : "Désactivé"}
          </p>
          {user.mustChangePassword ? (
            <p className="text-amber-800">Doit changer son mot de passe à la prochaine connexion.</p>
          ) : null}
          <p>
            <span className="text-[var(--admin-muted)]">Créé le</span>
            <br />
            {new Date(user.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </section>
      ) : null}

      {tab === "role" ? (
        isOrg ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPending("role");
            }}
            className="ac-card max-w-md space-y-4 p-5"
          >
            <h2 className="font-display text-lg font-semibold">Gérer le rôle</h2>
            <p className="text-sm text-[var(--admin-muted)]">
              Confirmation obligatoire — action journalisée dans l’audit.
            </p>
            <select
              className="ac-input"
              value={roleDraft}
              onChange={(e) => setRoleDraft(e.target.value)}
            >
              <option value="OWNER">Propriétaire</option>
              <option value="MANAGER">Responsable</option>
              <option value="STAFF">Employée</option>
              <option value="CASHIER">Caisse</option>
              <option value="ACCOUNTANT">Comptable</option>
            </select>
            <button type="submit" className="ac-btn" disabled={busy}>
              Enregistrer le rôle
            </button>
          </form>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">
            Rôle plateforme : Super administrateur (non modifiable depuis cette interface).
          </p>
        )
      ) : null}

      {tab === "activity" ? (
        <ul className="ac-card divide-y divide-[var(--admin-line)]">
          {activity.length === 0 ? (
            <li className="px-5 py-4 text-sm text-[var(--admin-muted)]">Aucune activité récente.</li>
          ) : null}
          {activity.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{platformAuditActionLabel(a.action)}</p>
                <p className="text-xs text-[var(--admin-muted)]">
                  {a.platformUserName ?? "Système"}
                  {a.organizationName ? ` · ${a.organizationName}` : ""}
                </p>
              </div>
              <time className="shrink-0 font-mono text-[10px] text-[var(--admin-muted)]">
                {new Date(a.createdAt).toLocaleString("fr-FR")}
              </time>
            </li>
          ))}
        </ul>
      ) : null}

      <SensitiveConfirmDialog
        open={pending != null}
        kind={pending}
        subject={subject}
        detail={
          pending === "role"
            ? `${user.email} → ${ORG_USER_ROLE_LABEL[roleDraft] ?? roleDraft}`
            : user.email
        }
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void executeSensitive(pending);
        }}
      />
    </>
  );
}

export default function AdminUserDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--admin-muted)]">Chargement…</p>}>
      <UserDetailInner />
    </Suspense>
  );
}
