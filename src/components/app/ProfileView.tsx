"use client";

import { AppPageHeader } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ROLE_LABEL } from "@/lib/rbac";

export function ProfileView() {
  const user = useCurrentUser();

  return (
    <>
      <AppPageHeader title="Mon profil" />
      <div className="surface max-w-md space-y-3 p-6 text-sm">
        <p>
          <span className="text-ink/45">Prénom · </span>
          {user.firstName}
        </p>
        <p>
          <span className="text-ink/45">Nom · </span>
          {user.lastName}
        </p>
        <p>
          <span className="text-ink/45">E-mail · </span>
          {user.email}
        </p>
        <p>
          <span className="text-ink/45">Institut · </span>
          {user.orgName}
        </p>
        <p>
          <span className="text-ink/45">Rôle · </span>
          {ROLE_LABEL[user.role]}
        </p>
        <p className="text-xs text-ink/40">
          Pas de photo cliente ; photo profil staff optionnelle plus tard.
        </p>
      </div>
    </>
  );
}
