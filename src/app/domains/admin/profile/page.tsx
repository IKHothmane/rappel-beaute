"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { fetchAdminSession, platformLogout } from "@/modules/admin/client";
import { PLATFORM_ROLE_LABEL, type PlatformRole } from "@/types/platform";

export default function ProfilePage() {
  const [user, setUser] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    fetchAdminSession().then(setUser);
  }, []);

  const name = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—"
    : "…";

  return (
    <>
      <AdminPageHeader title="Mon profil" description="Compte super administrateur (session)." />

      <div className="mx-auto grid max-w-xl gap-6">
        <section className="ac-card space-y-3 p-6 text-sm">
          <p>
            <span className="text-[var(--admin-muted)]">Nom : </span>
            {name}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">E-mail : </span>
            {user?.email ?? "—"}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Rôle : </span>
            {user?.role
              ? PLATFORM_ROLE_LABEL[user.role as PlatformRole] ?? user.role
              : "—"}
          </p>
        </section>

        <section className="ac-card space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Session</h2>
          <p className="text-sm text-[var(--admin-muted)]">
            Le changement de mot de passe plateforme n&apos;est pas encore exposé via API.
          </p>
          <button
            type="button"
            className="ac-btn-ghost"
            onClick={() => void platformLogout().then(() => {
              window.location.href = "/login/";
            })}
          >
            Déconnexion
          </button>
        </section>
      </div>
    </>
  );
}
