"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import {
  AdminActionsMenu,
  adminMenuItemClass,
} from "@/components/admin/AdminActionsMenu";
import {
  SensitiveConfirmDialog,
  type SensitiveActionKind,
} from "@/components/admin/SensitiveConfirmDialog";
import { adminHref } from "@/lib/admin/href";
import {
  fetchAdminUsers,
  invalidateAdminUserSessions,
  patchAdminUser,
  resetAdminUserPassword,
} from "@/modules/admin/client";
import {
  ORG_USER_ROLE_LABEL,
  type PlatformOrgUser,
  type PlatformUsersKpis,
} from "@/types/platform";

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Maintenant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "Il y a 1 h" : `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

function UserStatusPill({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {active ? "Actif" : "Désactivé"}
    </span>
  );
}

function TempPasswordModal({
  password,
  message,
  onClose,
}: {
  password: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-lg">
        <h2 className="font-display text-xl font-semibold">Mot de passe temporaire</h2>
        <p className="mt-4 rounded-lg bg-[#FBF4F6] px-4 py-3 text-center font-mono text-lg font-semibold tracking-wide">
          {password}
        </p>
        <p className="mt-3 text-sm text-amber-800">
          À communiquer à l’utilisateur — il devra le changer à la connexion.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="ac-btn"
            onClick={() => void navigator.clipboard?.writeText(password)}
          >
            Copier
          </button>
          <button
            type="button"
            className="ac-btn-ghost"
            onClick={() => void navigator.clipboard?.writeText(message)}
          >
            Préparer le message
          </button>
          <button type="button" className="ac-btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRowActions({
  user,
  onChanged,
  onTempPassword,
}: {
  user: PlatformOrgUser;
  onChanged: () => void;
  onTempPassword: (password: string, message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<SensitiveActionKind | null>(null);
  const isOrg = user.accountKind === "ORG";
  const detailHref = adminHref(`/users/${user.id}/`);
  const subject = `${user.firstName} ${user.lastName}`.trim();

  async function execute(kind: SensitiveActionKind) {
    setBusy(true);
    try {
      if (kind === "reset_password") {
        const res = await resetAdminUserPassword(user.id);
        onTempPassword(res.temporaryPassword, res.messageTemplate);
      } else if (kind === "invalidate_sessions") {
        await invalidateAdminUserSessions(user.id);
      } else if (kind === "disable") {
        await patchAdminUser(user.id, { status: "DISABLED" });
      } else if (kind === "delete") {
        await patchAdminUser(user.id, { status: "DISABLED", delete: true });
      }
      setPending(null);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminActionsMenu>
        {(close) => (
          <>
            <Link
              href={detailHref}
              className={adminMenuItemClass}
              role="menuitem"
              onClick={close}
            >
              Voir le compte
            </Link>
            {isOrg ? (
              <>
                <Link
                  href={adminHref(`/users/${user.id}/?edit=1`)}
                  className={adminMenuItemClass}
                  role="menuitem"
                  onClick={close}
                >
                  Modifier
                </Link>
                {user.organizationId ? (
                  <Link
                    href={adminHref(`/organizations/${user.organizationId}/`)}
                    className={adminMenuItemClass}
                    role="menuitem"
                    onClick={close}
                  >
                    Voir l’organisation
                  </Link>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className={adminMenuItemClass}
                  disabled={busy}
                  onClick={() => {
                    close();
                    setPending("reset_password");
                  }}
                >
                  Réinitialiser le mot de passe
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={adminMenuItemClass}
                  disabled={busy}
                  onClick={() => {
                    close();
                    setPending("invalidate_sessions");
                  }}
                >
                  Déconnecter les sessions
                </button>
                <Link
                  href={adminHref(`/users/${user.id}/?tab=role`)}
                  className={adminMenuItemClass}
                  role="menuitem"
                  onClick={close}
                >
                  Gérer le rôle
                </Link>
                <Link
                  href={adminHref(`/users/${user.id}/?tab=activity`)}
                  className={adminMenuItemClass}
                  role="menuitem"
                  onClick={close}
                >
                  Voir l’activité
                </Link>
                {user.status === "ACTIVE" ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${adminMenuItemClass} text-red-700`}
                    disabled={busy}
                    onClick={() => {
                      close();
                      setPending("disable");
                    }}
                  >
                    Désactiver le compte
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={adminMenuItemClass}
                    disabled={busy}
                    onClick={() =>
                      void (async () => {
                        setBusy(true);
                        try {
                          await patchAdminUser(user.id, { status: "ACTIVE" });
                          close();
                          onChanged();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Action impossible.");
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Réactiver le compte
                  </button>
                )}
                {user.status === "ACTIVE" ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${adminMenuItemClass} text-red-700`}
                    disabled={busy}
                    onClick={() => {
                      close();
                      setPending("delete");
                    }}
                  >
                    Supprimer le compte
                  </button>
                ) : null}
              </>
            ) : (
              <p className="px-3 py-2 text-xs text-[var(--admin-muted)]">
                Compte Super Admin plateforme — pas d’actions sensibles ici.
              </p>
            )}
          </>
        )}
      </AdminActionsMenu>

      <SensitiveConfirmDialog
        open={pending != null}
        kind={pending}
        subject={subject}
        detail={user.email}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void execute(pending);
        }}
      />
    </>
  );
}

export default function UsersPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [organizationId, setOrganizationId] = useState("ALL");
  const [items, setItems] = useState<PlatformOrgUser[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [kpis, setKpis] = useState<PlatformUsersKpis>({
    total: 0,
    active: 0,
    disabled: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [temp, setTemp] = useState<{ password: string; message: string } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminUsers({
      search: q || undefined,
      role: role !== "ALL" ? role : undefined,
      status: status !== "ALL" ? status : undefined,
      organizationId: organizationId !== "ALL" ? organizationId : undefined,
    })
      .then((res) => {
        setItems(res.items);
        setKpis(res.kpis);
        setOrgs(res.organizations);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [q, role, status, organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <AdminPageHeader
        title="Utilisateurs"
        description="Gérez tous les comptes utilisateurs de la plateforme."
        action={
          <Link href={adminHref("/organizations/new/")} className="ac-btn">
            + Créer via institut
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total" value={String(kpis.total)} />
        <StatTile label="Actifs" value={String(kpis.active)} />
        <StatTile label="Désactivés" value={String(kpis.disabled)} />
        <StatTile label="Ce mois" value={String(kpis.thisMonth)} hint="Nouveaux comptes institut" />
      </div>

      <div className="mb-4 flex flex-col gap-3 ac-card p-4 md:flex-row md:flex-wrap md:items-center">
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Rechercher un nom, e-mail…"
          className="ac-input md:min-w-[240px] md:max-w-sm"
        />
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className="ac-input md:w-auto"
        >
          <option value="ALL">Organisation</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="ac-input md:w-auto"
        >
          <option value="ALL">Rôle</option>
          <option value="SUPER_ADMIN">Super admin</option>
          <option value="OWNER">Propriétaire</option>
          <option value="MANAGER">Responsable</option>
          <option value="STAFF">Employée</option>
          <option value="CASHIER">Caisse</option>
          <option value="ACCOUNTANT">Comptable</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="ac-input md:w-auto"
        >
          <option value="ALL">Statut</option>
          <option value="ACTIVE">Actif</option>
          <option value="DISABLED">Désactivé</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && items.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">Aucun utilisateur.</p>
      ) : null}

      <ul className="space-y-3 md:hidden">
        {items.map((u) => (
          <li key={u.id} className="ac-card relative p-4">
            <Link
              href={adminHref(`/users/${u.id}/`)}
              className="absolute inset-0 z-0"
              aria-label={`Ouvrir ${u.firstName}`}
            />
            <div className="relative z-10 flex items-start justify-between gap-3 pointer-events-none">
              <div>
                <p className="font-medium">
                  {u.firstName} {u.lastName}
                </p>
                <p className="text-xs text-[var(--admin-muted)]">{u.email}</p>
                <p className="mt-1 text-xs">
                  {u.organizationName ?? "Plateforme"} ·{" "}
                  {ORG_USER_ROLE_LABEL[u.role] ?? u.role}
                </p>
              </div>
                <div className="pointer-events-auto relative z-20">
                  <UserRowActions
                    user={u}
                    onChanged={load}
                    onTempPassword={(password, message) => setTemp({ password, message })}
                  />
                </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto ac-card md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Utilisateur</th>
              <th className="px-4 py-3 font-medium">Organisation</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Dernière connexion</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-line)]">
            {items.map((u) => {
              const href = adminHref(`/users/${u.id}/`);
              return (
                <tr
                  key={u.id}
                  className="cursor-pointer hover:bg-[#FBF4F6]/50"
                  onClick={() => {
                    window.location.href = href;
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="font-mono text-xs text-[var(--admin-muted)]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.organizationId ? (
                      <Link
                        href={adminHref(`/organizations/${u.organizationId}/`)}
                        className="text-[var(--admin-accent)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {u.organizationName}
                      </Link>
                    ) : (
                      <span className="text-[var(--admin-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{ORG_USER_ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="px-4 py-3">
                    <UserStatusPill status={u.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                    {formatRelative(u.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <UserRowActions
                      user={u}
                      onChanged={load}
                      onTempPassword={(password, message) => setTemp({ password, message })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {temp ? (
        <TempPasswordModal
          password={temp.password}
          message={temp.message}
          onClose={() => setTemp(null)}
        />
      ) : null}
    </>
  );
}
