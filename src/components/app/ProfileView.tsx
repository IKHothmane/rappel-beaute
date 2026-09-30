"use client";

import { LogOut } from "lucide-react";
import { AppPageHeader } from "@/components/app/AppUi";
import { useCurrentUser, useSession } from "@/components/auth/session-provider";
import { ROLE_LABEL } from "@/lib/rbac";

export function ProfileView() {
  const user = useCurrentUser();
  const { logout } = useSession();

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
        <button
          type="button"
          onClick={() => void logout()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FCE9F4] text-sm font-semibold"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>
    </>
  );
}
